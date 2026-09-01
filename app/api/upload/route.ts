import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireAdminApi } from "@/lib/auth/authorization";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "shoe-store/products",
          resource_type: "image",
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
  } catch (error: any) {
    console.error("[Upload API Handler Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to upload image. Please check Cloudinary configuration." },
      { status: 500 }
    );
  }
}
