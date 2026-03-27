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
    "a furnished living room with sofa set, coffee table, TV/media unit, rug, wall art, layered lighting",
  "Dining Room":
    "a furnished dining room with dining table set, pendant lighting, sideboard, decor accents",
  Bedroom:
    "a furnished bedroom with bed, side tables, wardrobe, soft textiles, ambient lighting",
  Bathroom:
    "a designed bathroom with vanity, mirror lighting, shower or tub zone, coordinated tile materials",
  Office:
    "a functional office with desk setup, ergonomic chair, storage, focused lighting, professional styling",
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

export async function POST(request: Request) {
  try {
    const req = await request.json();
    const theme = req.theme;
    const room = req.room;

    const selectedTheme =
      typeof theme === "string" && theme.trim() ? theme.trim() : "Modern";
    const selectedRoom =
      typeof room === "string" && room.trim() ? room.trim() : "Living Room";
    const styleDetail = STYLE_DETAILS[selectedTheme] || STYLE_DETAILS.Modern;
    const roomDetail =
      ROOM_DETAILS[selectedRoom] || ROOM_DETAILS["Living Room"];

    const prompt = `Photorealistic interior design photo of ${roomDetail}, in ${selectedTheme.toLowerCase()} style, ${styleDetail}, cohesive color story, premium materials, well-staged decor, realistic shadows, high detail, architectural photography, no empty room, no text, no watermark.`;

    console.log("Generating new room design with Hugging Face:", {
      theme: selectedTheme,
      room: selectedRoom,
    });

    const output = await generateWithHuggingFace(prompt);
    if (!output) {
      return NextResponse.json(
        {
          error: "Failed to generate new room design",
          message:
            "Hugging Face could not generate an image. Check HUGGINGFACE_API_KEY and try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        output: [output],
        message: `Generated a beautiful ${selectedTheme} ${selectedRoom} design!`,
        service: "Hugging Face",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error generating room design with Hugging Face:", error);
    return NextResponse.json(
      {
        error: "Failed to generate new room design",
        message: "Unable to create new room design. Please try again.",
      },
      { status: 500 }
    );
  }
}
