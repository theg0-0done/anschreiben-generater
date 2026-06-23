import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

/**
 * Receives a PDF resume as multipart/form-data and stores it in Vercel Blob.
 * Returns the blob URL so the client can persist it in the user's context.
 * Max file size is enforced at 10 MB.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const contextId = (formData.get("contextId") as string) || "unknown";

    console.log("[upload-resume] VERCEL_OIDC_TOKEN exists:", !!process.env.VERCEL_OIDC_TOKEN);
    console.log("[upload-resume] BLOB_STORE_ID exists:", !!process.env.BLOB_STORE_ID);
    console.log("[upload-resume] BLOB_READ_WRITE_TOKEN exists:", !!process.env.BLOB_READ_WRITE_TOKEN);

    if (!file || file.type !== "application/pdf") {
      return NextResponse.json({ error: "A valid PDF file is required." }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds the 10 MB limit." }, { status: 413 });
    }

    const blob = await put(`resumes/${contextId}/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true, // prevents URL collisions across re-uploads
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    console.log(`[upload-resume] ✅ Stored: ${blob.url} (${file.size} bytes)`);
    return NextResponse.json({ url: blob.url });

  } catch (error: any) {
    console.error("[upload-resume] ❌ Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
