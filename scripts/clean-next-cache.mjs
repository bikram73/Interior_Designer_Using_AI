import { rm } from "node:fs/promises";

async function cleanNextCache() {
  try {
    await rm(".next", { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    console.log("[clean-next-cache] .next cache cleaned");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    // Continue startup even if cleanup fails.
    console.warn("[clean-next-cache] Unable to clean .next:", message);
  }
}

await cleanNextCache();
