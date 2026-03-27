import { NextResponse } from "next/server";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB

function getSafeFileName(url: URL, contentType: string) {
  const fromPath = url.pathname.split("/").pop() || "image";
  const ext = contentType.split("/")[1]?.split(";")[0] || "jpg";

  if (fromPath.includes(".")) {
    return fromPath;
  }

  return `${fromPath}.${ext}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const imageUrl = typeof body?.url === "string" ? body.url.trim() : "";

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required." },
        { status: 400 }
      );
    }

    let parsed: URL;
    try {
      parsed = new URL(imageUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format." },
        { status: 400 }
      );
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json(
        { error: "Only http/https image URLs are supported." },
        { status: 400 }
      );
    }

    const response = await fetch(parsed.toString(), {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Could not fetch image URL (${response.status}).` },
        { status: 400 }
      );
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "Provided URL does not point to an image." },
        { status: 400 }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image is too large. Maximum supported size is 8MB." },
        { status: 400 }
      );
    }

    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${contentType};base64,${base64}`;

    return NextResponse.json(
      {
        dataUrl,
        fileName: getSafeFileName(parsed, contentType),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("fetch-image route error:", error);
    return NextResponse.json(
      { error: "Failed to load image from URL." },
      { status: 500 }
    );
  }
}
