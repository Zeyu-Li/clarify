import { type NextApiRequest, type NextApiResponse } from "next";
import { z } from "zod";

import { env } from "~/env.js";
import { FixedWindowRateLimiter } from "~/server/rateLimiter";

const REPLICATE_PREDICTIONS_URL = "https://api.replicate.com/v1/predictions";
const GFPGAN_MODEL_VERSION =
  "4f7eb3da655b5182e559d50a0437440f242992d47e5e20bd82829a79dee61ff3";
const POLL_INTERVAL_MS = 1000;
const MAX_POLLS = 120;

// Images come from the Bytescale upload widget, which serves files from https://upcdn.io/<account>/...
// Accepting any other URL would let anyone use this route to upscale arbitrary images on our credits.
const requestSchema = z.object({
  fileUrl: z.url({ protocol: /^https$/, hostname: /^upcdn\.io$/ }).max(2048),
});

const predictionSchema = z.object({
  status: z.string(),
  output: z.string().nullish(),
});
const startedPredictionSchema = z.object({
  urls: z.object({
    // The API key is sent to this URL when polling, so only ever follow it back to Replicate.
    get: z.url({ protocol: /^https$/, hostname: /^api\.replicate\.com$/ }),
  }),
});

// The app is anonymous, so these limits are what bounds Replicate spend. They are per server instance;
// the global limit still holds when a caller rotates or spoofs its IP address.
const perClientLimiter = new FixedWindowRateLimiter({
  limit: 5,
  windowMs: 10 * 60 * 1000,
});
const globalLimiter = new FixedWindowRateLimiter({
  limit: 50,
  windowMs: 60 * 60 * 1000,
});

type ResponseBody = { upscaledUrl: string } | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseBody>,
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "fileUrl must be an https://upcdn.io URL" });
    return;
  }

  if (
    !perClientLimiter.tryConsume(clientKey(req)) ||
    !globalLimiter.tryConsume("global")
  ) {
    res.status(429).json({ error: "Too many requests, try again later" });
    return;
  }

  try {
    const upscaledUrl = await upscale(parsed.data.fileUrl);
    if (!upscaledUrl) {
      res.status(502).json({ error: "Upscaling failed" });
      return;
    }
    res.status(200).json({ upscaledUrl });
  } catch (error) {
    console.error("Replicate request failed", error);
    res.status(502).json({ error: "Upscaling failed" });
  }
}

function clientKey(req: NextApiRequest): string {
  const forwardedFor = req.headers["x-forwarded-for"];
  const firstHop = (
    Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor
  )
    ?.split(",")[0]
    ?.trim();
  return firstHop ?? req.socket.remoteAddress ?? "unknown";
}

async function upscale(imageUrl: string): Promise<string | null> {
  const started = startedPredictionSchema.parse(
    await replicateRequest(REPLICATE_PREDICTIONS_URL, {
      method: "POST",
      body: JSON.stringify({
        version: GFPGAN_MODEL_VERSION,
        input: { image: imageUrl, version: "v1.4", scale: 2 },
      }),
    }),
  );

  for (let poll = 0; poll < MAX_POLLS; poll++) {
    const prediction = predictionSchema.parse(
      await replicateRequest(started.urls.get, { method: "GET" }),
    );
    if (prediction.status === "succeeded") {
      return prediction.output ?? null;
    }
    if (prediction.status === "failed" || prediction.status === "canceled") {
      return null;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  return null;
}

async function replicateRequest(
  url: string,
  init: RequestInit,
): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Token " + env.REPLICATE_API_KEY,
    },
  });
  if (!response.ok) {
    throw new Error(`Replicate responded with HTTP ${response.status}`);
  }
  return response.json();
}
