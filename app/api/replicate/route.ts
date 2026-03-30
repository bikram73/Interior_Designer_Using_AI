import { NextResponse } from "next/server";

const REQUEST_TIMEOUT_MS = 30000;
const AI_HORDE_BASE_URL = "https://stablehorde.net/api/v2";
const AI_HORDE_POLL_INTERVAL_MS = 1500;
const AI_HORDE_MAX_POLLS = 20;
const HF_ROUTER_ENDPOINT = "https://router.huggingface.co/hf-inference/models";
const CLOUDFLARE_AI_MODEL = "@cf/stabilityai/stable-diffusion-xl-base-1.0";

type ProviderChoice = "auto" | "ai-horde" | "hugging-face" | "cloudflare-ai";

function normalizeProvider(value: unknown): ProviderChoice {
  if (
    value === "ai-horde" ||
    value === "hugging-face" ||
    value === "cloudflare-ai"
  ) {
    return value;
  }

  return "auto";
}

type AiHordeResult =
  | { status: "success"; image: string }
  | { status: "processing"; requestId: string }
  | { status: "failed" };

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseBase64FromDataUrl(imageDataUrl: string): string {
  const parts = imageDataUrl.split(",");
  return parts.length > 1 ? parts[1] : imageDataUrl;
}

async function generateWithAiHorde(
  prompt: string,
  imageDataUrl?: string
): Promise<AiHordeResult> {
  const aiHordeKey = process.env.AI_HORDE_API_KEY;
  if (!aiHordeKey) {
    console.log("AI_HORDE_API_KEY not found.");
    return { status: "failed" };
  }

  const body: Record<string, unknown> = {
    prompt,
    params: {
      width: 768,
      height: 768,
      steps: 30,
      cfg_scale: 7,
      sampler_name: "k_euler_a",
      n: 1,
    },
  };

  if (imageDataUrl) {
    body.source_image = parseBase64FromDataUrl(imageDataUrl);
    body.source_processing = "img2img";
  }

  try {
    const submitResponse = await fetchWithTimeout(
      `${AI_HORDE_BASE_URL}/generate/async`,
      {
        method: "POST",
        headers: {
          apikey: aiHordeKey,
          "Client-Agent": "interior-designer-ai:1.0.0",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!submitResponse.ok) {
      const errText = await submitResponse.text();
      console.log(
        "AI Horde submit failed:",
        submitResponse.status,
        errText.slice(0, 240)
      );
      return { status: "failed" };
    }

    const submitData = (await submitResponse.json()) as { id?: string };
    if (!submitData?.id) {
      console.log("AI Horde submit did not return request id.");
      return { status: "failed" };
    }

    const requestId = submitData.id;
    for (let poll = 0; poll < AI_HORDE_MAX_POLLS; poll++) {
      await sleep(AI_HORDE_POLL_INTERVAL_MS);

      const checkResponse = await fetchWithTimeout(
        `${AI_HORDE_BASE_URL}/generate/check/${requestId}`,
        {
          headers: {
            apikey: aiHordeKey,
            "Client-Agent": "interior-designer-ai:1.0.0",
            Accept: "application/json",
          },
        }
      );

      if (!checkResponse.ok) {
        continue;
      }

      const checkData = (await checkResponse.json()) as {
        done?: boolean;
        faulted?: boolean;
      };

      if (checkData.faulted) {
        console.log("AI Horde generation faulted.");
        return { status: "failed" };
      }

      if (!checkData.done) {
        continue;
      }

      const statusResponse = await fetchWithTimeout(
        `${AI_HORDE_BASE_URL}/generate/status/${requestId}`,
        {
          headers: {
            apikey: aiHordeKey,
            "Client-Agent": "interior-designer-ai:1.0.0",
            Accept: "application/json",
          },
        }
      );

      if (!statusResponse.ok) {
        const errText = await statusResponse.text();
        console.log(
          "AI Horde status failed:",
          statusResponse.status,
          errText.slice(0, 240)
        );
        return { status: "failed" };
      }

      const statusData = (await statusResponse.json()) as {
        generations?: Array<{ img?: string }>;
      };
      const image = statusData.generations?.find((item) => item.img)?.img;
      if (!image) {
        console.log("AI Horde returned no image in generations.");
        return { status: "failed" };
      }

      if (image.startsWith("data:image")) {
        return { status: "success", image };
      }

      // Handle HTTP URLs from AI Horde
      if (image.startsWith("http://") || image.startsWith("https://")) {
        try {
          const imgResponse = await fetchWithTimeout(image, {
            headers: { Accept: "image/*" },
          });
          if (imgResponse.ok) {
            const blob = await imgResponse.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString("base64");
            return {
              status: "success",
              image: `data:image/jpeg;base64,${base64}`,
            };
          }
        } catch (err) {
          console.log("Failed to fetch AI Horde URL:", err);
        }

        return { status: "failed" };
      }

      return { status: "success", image: `data:image/jpeg;base64,${image}` };
    }

    console.log(
      "AI Horde timed out before completion. Returning request for async polling."
    );
    return { status: "processing", requestId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.log("AI Horde error:", message);
    return { status: "failed" };
  }
}

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
  for (const model of hfModels) {
    try {
      const response = await fetchWithTimeout(
        `${HF_ROUTER_ENDPOINT}/${model}`,
        {
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
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.log(
          `Hugging Face ${model} failed:`,
          response.status,
          errText.slice(0, 240)
        );
        continue;
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      console.log(`Hugging Face (${model}) generated image successfully.`);
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      console.log(`Hugging Face ${model} error:`, error);
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
  const endpoints = ["https://router.huggingface.co/hf-inference/models"];

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

async function generateWithCloudflareAI(
  prompt: string
): Promise<string | null> {
  const cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN;
  const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!cloudflareApiToken || !cloudflareAccountId) {
    console.log("Cloudflare AI credentials not found.");
    return null;
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/run/${CLOUDFLARE_AI_MODEL}`;

  try {
    const response = await fetchWithTimeout(
      endpoint,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cloudflareApiToken}`,
          "Content-Type": "application/json",
          Accept: "image/*,application/json",
        },
        body: JSON.stringify({
          prompt,
          width: 512,
          height: 512,
        }),
      },
      45000
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("[Cloudflare AI] Request FAILED");
      console.error(`  Status: ${response.status} ${response.statusText}`);
      console.error(`  Endpoint: ${endpoint}`);
      console.error(`  Content-Type: ${response.headers.get("content-type")}`);
      console.error(`  Response: ${errText}`);

      // Check for specific error patterns
      if (response.status === 401) {
        console.error("  → Likely cause: Invalid or expired API token");
      } else if (response.status === 403) {
        console.error(
          "  → Likely cause: Token lacks required permissions or account mismatch"
        );
      } else if (response.status === 404) {
        console.error(
          "  → Likely cause: Invalid account ID or model not found"
        );
      } else if (response.status === 429) {
        console.error("  → Likely cause: Rate limit exceeded");
      }
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.startsWith("image/")) {
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const mimeType = contentType.split(";")[0] || "image/png";
      return `data:${mimeType};base64,${base64}`;
    }

    const payload = (await response.json()) as {
      result?: { image?: string } | string;
      image?: string;
    };

    const resultImage =
      typeof payload.result === "object"
        ? payload.result?.image
        : typeof payload.result === "string"
        ? payload.result
        : payload.image;

    if (!resultImage) {
      console.log("Cloudflare AI returned no image payload.");
      return null;
    }

    if (resultImage.startsWith("data:image")) {
      return resultImage;
    }

    return `data:image/png;base64,${resultImage}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.log("Cloudflare AI error:", message);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const req = await request.json();
    const image = req.image;
    const theme = req.theme;
    const room = req.room;
    const provider = normalizeProvider(req.provider);

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
    console.log("Transformation request:", {
      theme: selectedTheme,
      room: selectedRoom,
      provider,
      imageLength: image?.length,
    });

    if (provider === "hugging-face") {
      const hfOutput = await transformWithHuggingFace(image, prompt);
      if (!hfOutput) {
        return NextResponse.json(
          {
            error: "Hugging Face generation failed",
            message:
              "Hugging Face could not transform this image. Check credits/token and try again.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          output: [hfOutput],
          message: `SUCCESS: Transformed your uploaded ${selectedRoom} with ${selectedTheme} styling.`,
          service: "Hugging Face",
        },
        { status: 201 }
      );
    }

    if (provider === "cloudflare-ai") {
      const cloudflareOutput = await generateWithCloudflareAI(prompt);
      if (!cloudflareOutput) {
        return NextResponse.json(
          {
            error: "Cloudflare AI generation failed",
            message:
              "Cloudflare AI could not generate an image. Check CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID and try again.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          output: [cloudflareOutput],
          message:
            "Generated with Cloudflare AI. This path may not preserve exact uploaded room structure.",
          service: "Cloudflare AI",
        },
        { status: 201 }
      );
    }

    if (provider === "ai-horde") {
      const aiHordeOnlyResult = await generateWithAiHorde(prompt, image);
      if (aiHordeOnlyResult.status === "success") {
        return NextResponse.json(
          {
            output: [aiHordeOnlyResult.image],
            message: `SUCCESS: Generated your ${selectedTheme} ${selectedRoom} design with AI Horde.`,
            service: "AI Horde",
          },
          { status: 201 }
        );
      }

      if (aiHordeOnlyResult.status === "processing") {
        return NextResponse.json(
          {
            isProcessing: true,
            predictionId: aiHordeOnlyResult.requestId,
            output: [image],
            message:
              "AI Horde accepted your request and it is still in queue. Keeping your original image visible while processing continues.",
            service: "AI Horde",
          },
          { status: 202 }
        );
      }

      return NextResponse.json(
        {
          error: "AI Horde generation failed",
          message:
            "AI Horde was selected but failed to generate an image. Try again or switch provider.",
        },
        { status: 500 }
      );
    }

    const aiHordeResult = await generateWithAiHorde(prompt, image);
    if (aiHordeResult.status === "success") {
      return NextResponse.json(
        {
          output: [aiHordeResult.image],
          message: `SUCCESS: Generated your ${selectedTheme} ${selectedRoom} design with AI Horde.`,
          service: "AI Horde",
        },
        { status: 201 }
      );
    }

    if (aiHordeResult.status === "processing") {
      return NextResponse.json(
        {
          isProcessing: true,
          predictionId: aiHordeResult.requestId,
          output: [image],
          message:
            "AI Horde accepted your request and it is still in queue. Keeping your original image visible while processing continues.",
          service: "AI Horde",
        },
        { status: 202 }
      );
    }

    const cloudflareOutput = await generateWithCloudflareAI(prompt);
    if (cloudflareOutput) {
      return NextResponse.json(
        {
          output: [cloudflareOutput],
          message:
            "AI Horde was unavailable, so Cloudflare AI generated this design.",
          service: "Cloudflare AI",
        },
        { status: 201 }
      );
    }

    const output = await transformWithHuggingFace(image, prompt);
    if (!output) {
      return NextResponse.json(
        {
          error: "Image generation failed",
          message:
            "AI Horde, Cloudflare AI, and Hugging Face are unavailable for this request. Check API key/credits and try again.",
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
