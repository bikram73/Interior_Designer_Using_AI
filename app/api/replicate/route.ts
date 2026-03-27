import { NextResponse } from "next/server";

const STYLE_DETAILS: Record<string, string> = {
  Modern:
    "clean geometric lines, neutral palette, natural textures, balanced composition, contemporary decor",
  Vintage:
    "classic furniture silhouettes, warm tones, antique details, ornate accents, nostalgic character",
  Minimalist:
    "very clean layout, limited decor, soft neutral colors, uncluttered surfaces, functional simplicity",
  Professional:
    "premium and practical setup, polished finishes, ergonomic furniture, organized layout, executive feel",
};

const ROOM_DETAILS: Record<string, string> = {
  "Living Room":
    "living room with sofa set, coffee table, media unit, rug, and layered ambient lighting",
  "Dining Room":
    "dining room with dining table set, pendant lighting, sideboard, and curated decor accents",
  Bedroom:
    "bedroom with styled bed, side tables, textiles, wardrobe details, and warm ambient lighting",
  Bathroom:
    "bathroom with vanity, mirror lighting, coordinated tiles, shower or tub zone, and clean styling",
  Office:
    "office with work desk, ergonomic seating, storage, practical lighting, and professional composition",
};

async function generateWithHuggingFace(prompt: string): Promise<string | null> {
  const hfApiKey = process.env.HUGGINGFACE_API_KEY;
  if (!hfApiKey) {
    console.log("HUGGINGFACE_API_KEY not found.");
    return null;
  }

  const hfModels = [
    "black-forest-labs/FLUX.1-schnell",
    "stabilityai/stable-diffusion-xl-base-1.0",
  ];
  const endpoints = [
    "https://router.huggingface.co/hf-inference/models",
    "https://api-inference.huggingface.co/models",
  ];

  for (const model of hfModels) {
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${endpoint}/${model}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${hfApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              width: 768,
              height: 768,
              num_inference_steps: 28,
            },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.log(
            `Hugging Face ${model} via ${endpoint} failed:`,
            response.status,
            errText.slice(0, 240)
          );
          continue;
        }

        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        console.log(
          `Hugging Face (${model}) generated image successfully via ${endpoint}`
        );
        return `data:image/jpeg;base64,${base64}`;
      } catch (error) {
        console.log(`Hugging Face ${model} via ${endpoint} error:`, error);
      }
    }
  }

  return null;
}

async function transformWithHuggingFace(
  imageDataUrl: string,
  prompt: string
): Promise<string | null> {
  const hfApiKey = process.env.HUGGINGFACE_API_KEY;
  if (!hfApiKey) {
    console.log("HUGGINGFACE_API_KEY not found.");
    return null;
  }

  // Prefer image-to-image models so composition/window placement follows the uploaded room.
  const hfImg2ImgModels = [
    "timbrooks/instruct-pix2pix",
    "stabilityai/stable-diffusion-xl-refiner-1.0",
  ];
  const endpoints = [
    "https://router.huggingface.co/hf-inference/models",
    "https://api-inference.huggingface.co/models",
  ];

  for (const model of hfImg2ImgModels) {
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${endpoint}/${model}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${hfApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: {
              image: imageDataUrl,
              prompt,
            },
            parameters: {
              num_inference_steps: 30,
              guidance_scale: 7.5,
              strength: 0.55,
              image_guidance_scale: 1.6,
            },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.log(
            `Hugging Face img2img ${model} via ${endpoint} failed:`,
            response.status,
            errText.slice(0, 300)
          );
          continue;
        }

        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        console.log(
          `Hugging Face img2img (${model}) succeeded via ${endpoint}`
        );
        return `data:image/jpeg;base64,${base64}`;
      } catch (error) {
        console.log(
          `Hugging Face img2img ${model} via ${endpoint} error:`,
          error
        );
      }
    }
  }

  // Last fallback: text-to-image generation (less structural fidelity).
  console.log("img2img models unavailable, falling back to text-to-image.");
  return generateWithHuggingFace(prompt);
}

export async function POST(request: Request) {
  try {
    const req = await request.json();
    const image = req.image;
    const theme = req.theme;
    const room = req.room;

    if (!image) {
      return NextResponse.json(
        { error: "No image provided for transformation" },
        { status: 400 }
      );
    }

    const selectedTheme =
      typeof theme === "string" && theme.trim() ? theme.trim() : "Modern";
    const selectedRoom =
      typeof room === "string" && room.trim() ? room.trim() : "Living Room";
    const styleDetail = STYLE_DETAILS[selectedTheme] || STYLE_DETAILS.Modern;
    const roomDetail =
      ROOM_DETAILS[selectedRoom] || ROOM_DETAILS["Living Room"];

    const prompt = `Redesign this exact ${selectedRoom.toLowerCase()} in ${selectedTheme.toLowerCase()} style. ${styleDetail}. Include ${roomDetail}. Keep architecture and window placements realistic. Photorealistic interior photography, high detail, no text, no watermark.`;

    console.log("Hugging Face transformation request:", {
      theme: selectedTheme,
      room: selectedRoom,
      imageLength: image?.length,
    });

    const output = await transformWithHuggingFace(image, prompt);
    if (!output) {
      return NextResponse.json(
        {
          error: "Image generation failed",
          message:
            "Hugging Face could not transform this image. Try another photo angle or adjust style/room selection.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        output: [output],
        message: `SUCCESS: Transformed your uploaded ${selectedRoom} with ${selectedTheme} styling while preserving room structure where possible.`,
        service: "Hugging Face",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Hugging Face route error:", error);
    return NextResponse.json(
      {
        error: "Service Error",
        message: `Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }.`,
      },
      { status: 500 }
    );
  }
}
