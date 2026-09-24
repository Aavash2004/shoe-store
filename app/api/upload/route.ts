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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const hasCloudinary =
      Boolean(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) &&
      Boolean(process.env.CLOUDINARY_API_KEY) &&
      Boolean(process.env.CLOUDINARY_API_SECRET);

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
        "[Cloudinary Upload Failed or Timed Out - Falling back to local storage]:",
        cloudinaryError?.message || cloudinaryError
      );
      // Gracefully fall back to local storage so upload never fails with timeout
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

