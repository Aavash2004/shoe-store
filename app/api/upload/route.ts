import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireAdminApi } from "@/lib/auth/authorization";
import fs from "fs/promises";
import path from "path";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  timeout: 120000,
});

const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB limit
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Validates file signature (magic bytes) to guarantee the uploaded file
 * is genuinely JPEG, PNG, or WebP binary data.
 */
export function isValidImageSignature(buffer: Buffer): {
  isValid: boolean;
  format?: "jpeg" | "png" | "webp";
} {
  if (buffer.length < 12) {
    return { isValid: false };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { isValid: true, format: "jpeg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { isValid: true, format: "png" };
  }

  // WebP: 'RIFF' at bytes 0..3 and 'WEBP' at bytes 8..11
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { isValid: true, format: "webp" };
  }

  return { isValid: false };
}

/**
 * Detects SVG files either by declared MIME, file extension, or XML/SVG markup.
 */
export function isSvgFile(file: File, buffer: Buffer): boolean {
  if (
    file.type.toLowerCase().includes("svg") ||
    file.name.toLowerCase().endsWith(".svg")
  ) {
    return true;
  }
  const preview = buffer
    .subarray(0, Math.min(buffer.length, 1024))
    .toString("utf8")
    .toLowerCase();
  return preview.includes("<svg") || preview.includes("<?xml");
}

async function saveFileLocally(file: File, buffer: Buffer): Promise<string> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  const ext = path.extname(file.name) || ".webp";
  const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `${Date.now()}-${baseName}${ext}`;
  const filePath = path.join(uploadsDir, fileName);

  await fs.writeFile(filePath, buffer);
  return `/uploads/${fileName}`;
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdminApi();
  if (!authResult.authorized) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 1. File Size Validation (< 4 MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File size exceeds the 4 MB limit." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File size exceeds the 4 MB limit." },
        { status: 400 }
      );
    }

    // 2. Reject SVG explicitly
    if (isSvgFile(file, buffer)) {
      return NextResponse.json(
        { error: "SVG images are not allowed. Please upload JPEG, PNG, or WebP images." },
        { status: 400 }
      );
    }

    // 3. MIME type check
    if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
      return NextResponse.json(
        { error: "Invalid file type. Only image/jpeg, image/png, and image/webp are allowed." },
        { status: 400 }
      );
    }

    // 4. File signature (magic bytes) verification
    const signature = isValidImageSignature(buffer);
    if (!signature.isValid) {
      return NextResponse.json(
        { error: "File content does not match a valid JPEG, PNG, or WebP image signature." },
        { status: 400 }
      );
    }

    const isVercel = Boolean(process.env.VERCEL);
    const hasCloudinary =
      Boolean(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) &&
      Boolean(process.env.CLOUDINARY_API_KEY) &&
      Boolean(process.env.CLOUDINARY_API_SECRET);

    // On Vercel: Never fall back to local public/uploads
    if (isVercel) {
      if (!hasCloudinary) {
        console.error("[Upload Error on Vercel]: Cloudinary environment variables are missing.");
        return NextResponse.json(
          { error: "Cloud storage configuration is missing on server." },
          { status: 500 }
        );
      }

      try {
        const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "shoe-store/products",
              resource_type: "image",
              timeout: 120000,
            },
            (error, result) => {
              if (error) {
                console.error("[Cloudinary Upload Error on Vercel]:", error);
                reject(error);
              } else if (result?.secure_url) {
                resolve(result as { secure_url: string });
              } else {
                reject(new Error("Cloudinary did not return a valid secure_url"));
              }
            }
          );
          uploadStream.end(buffer);
        });

        return NextResponse.json({ url: result.secure_url });
      } catch (cloudinaryError: any) {
        console.error("[Cloudinary Upload Failed on Vercel]:", cloudinaryError);
        return NextResponse.json(
          { error: `Cloud storage upload failed: ${cloudinaryError?.message || "Unknown error"}` },
          { status: 500 }
        );
      }
    }

    // Local Development: Cloudinary with fallback to local storage
    if (!hasCloudinary) {
      const localUrl = await saveFileLocally(file, buffer);
      return NextResponse.json({ url: localUrl });
    }

    try {
      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "shoe-store/products",
            resource_type: "image",
            timeout: 120000,
          },
          (error, result) => {
            if (error) {
              console.error("[Cloudinary Upload Error]:", error);
              reject(error);
            } else if (result?.secure_url) {
              resolve(result as { secure_url: string });
            } else {
              reject(new Error("Cloudinary did not return a valid secure_url"));
            }
          }
        );
        uploadStream.end(buffer);
      });

      return NextResponse.json({ url: result.secure_url });
    } catch (cloudinaryError: any) {
      console.warn(
        "[Cloudinary Upload Failed - Falling back to local storage in development]:",
        cloudinaryError?.message || cloudinaryError
      );
      const localUrl = await saveFileLocally(file, buffer);
      return NextResponse.json({ url: localUrl, fallback: true });
    }
  } catch (error: any) {
    console.error("[Upload API Handler Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process image upload." },
      { status: 500 }
    );
  }
}
