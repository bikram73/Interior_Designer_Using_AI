import { NextResponse } from "next/server";

export async function POST(request: Request) {
  void request;
  return NextResponse.json(
    {
      error: "Endpoint disabled",
      message:
        "This endpoint has been removed. This project now uses Hugging Face only.",
    },
    { status: 410 }
  );
}
