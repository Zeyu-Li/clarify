import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // fetch from ai upscaler
  const fileUrl = req.body.fileUrl;

  // request Replicate to start image restoration
  let startResponse = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Token " + process.env.REPLICATE_API_KEY,
    },
    body: JSON.stringify({
      version:
        "4f7eb3da655b5182e559d50a0437440f242992d47e5e20bd82829a79dee61ff3",
      input: { image: fileUrl, version: "v1.4", scale: 2 },
    }),
  });

  // poll for result
  let jsonStartRes = await startResponse.json();
  // console.log(jsonStartRes);
  let endpointUrl = jsonStartRes.urls.get;

  let newFileUrl: string | null = null;
  let counter = 0;
  const maxPoll = 120; // set default to 95 seconds
  while (!newFileUrl) {
    if (counter > maxPoll) {
      // server error
      res.status(400).json({});
      return;
    }

    console.log(`Polling results at count = ${counter + 1}`);

    let finalResponse = await fetch(endpointUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Token " + process.env.REPLICATE_API_KEY,
      },
    });
    let jsonFinalResponse = await finalResponse.json();
    // console.log(jsonFinalResponse)

    if (jsonFinalResponse.status === "succeeded") {
      newFileUrl = jsonFinalResponse.output;
    } else if (jsonFinalResponse.status === "failed") {
      break;
    } else {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    counter++;
  }
  res.status(200).json({ upscaledUrl: newFileUrl });
}
