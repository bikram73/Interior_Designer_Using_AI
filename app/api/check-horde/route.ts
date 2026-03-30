import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const aiHordeKey = process.env.AI_HORDE_API_KEY;
    if (!aiHordeKey) {
      return NextResponse.json(
        {
          error: "AI Horde is not configured",
          message: "Missing AI_HORDE_API_KEY.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const predictionId =
      typeof body?.predictionId === "string" ? body.predictionId.trim() : "";

    if (!predictionId) {
      return NextResponse.json(
        { error: "predictionId is required" },
        { status: 400 }
      );
    }

    const checkResponse = await fetch(
      `https://stablehorde.net/api/v2/generate/check/${predictionId}`,
      {
        headers: {
          apikey: aiHordeKey,
          "Client-Agent": "interior-designer-ai:1.0.0",
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!checkResponse.ok) {
      const errText = await checkResponse.text();
      return NextResponse.json(
        {
          error: "Failed to check AI Horde request",
          message: `Status ${checkResponse.status}: ${errText.slice(0, 180)}`,
        },
        { status: 500 }
      );
    }

    const checkData = (await checkResponse.json()) as {
      done?: boolean;
      faulted?: boolean;
      queue_position?: number;
      wait_time?: number;
    };

    if (checkData.faulted) {
      return NextResponse.json(
        {
          error: "AI Horde generation failed",
          message: "The request faulted in the AI Horde queue.",
          completed: true,
        },
        { status: 200 }
      );
    }

    if (!checkData.done) {
      const queueMsg =
        typeof checkData.queue_position === "number"
          ? `Queue position: ${checkData.queue_position}.`
          : "Still queued.";
      const waitMsg =
        typeof checkData.wait_time === "number"
          ? ` Estimated wait: ${checkData.wait_time}s.`
          : "";

      return NextResponse.json(
        {
          completed: false,
          message: `AI Horde is still processing your request. ${queueMsg}${waitMsg}`,
          service: "AI Horde",
        },
        { status: 200 }
      );
    }

    const statusResponse = await fetch(
      `https://stablehorde.net/api/v2/generate/status/${predictionId}`,
      {
        headers: {
          apikey: aiHordeKey,
          "Client-Agent": "interior-designer-ai:1.0.0",
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!statusResponse.ok) {
      const errText = await statusResponse.text();
      return NextResponse.json(
        {
          error: "Failed to fetch AI Horde image",
          message: `Status ${statusResponse.status}: ${errText.slice(0, 180)}`,
          completed: true,
        },
        { status: 200 }
      );
    }

    const statusData = (await statusResponse.json()) as {
      generations?: Array<{ img?: string }>;
    };

    const image = statusData.generations?.find((item) => item.img)?.img;
    if (!image) {
      return NextResponse.json(
        {
          error: "AI Horde returned no image",
          message: "No generated image was found in response.",
          completed: true,
        },
        { status: 200 }
      );
    }

    if (image.startsWith("data:image")) {
      return NextResponse.json(
        {
          completed: true,
          output: [image],
          service: "AI Horde",
        },
        { status: 200 }
      );
    }

    if (image.startsWith("http://") || image.startsWith("https://")) {
      try {
        const imgResponse = await fetch(image, {
          headers: { Accept: "image/*" },
          cache: "no-store",
        });

        if (imgResponse.ok) {
          const blob = await imgResponse.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString("base64");
          return NextResponse.json(
            {
              completed: true,
              output: [`data:image/jpeg;base64,${base64}`],
              service: "AI Horde",
            },
            { status: 200 }
          );
        }
      } catch (error) {
        console.log("AI Horde image URL fetch failed:", error);
      }

      return NextResponse.json(
        {
          error: "Could not download AI Horde result image",
          completed: true,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        completed: true,
        output: [`data:image/jpeg;base64,${image}`],
        service: "AI Horde",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("check-horde route error:", error);
    return NextResponse.json(
      {
        error: "Failed to check generation status",
        message: "Unable to poll AI Horde right now.",
      },
      { status: 500 }
    );
  }
}
