import { UploadWidgetResult } from "@bytescale/upload-widget";
import { UploadDropzone } from "@bytescale/upload-widget-react";
import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";

const options = {
  apiKey: "free", // Get API key: https://www.bytescale.com/get-started
  maxFileCount: 1,
};

type UpscaleResponse = { upscaledUrl?: string; error?: string };

async function requestUpscale(fileUrl: string): Promise<string> {
  const res = await fetch("/api/file", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fileUrl }),
  });
  const body = (await res.json()) as UpscaleResponse;
  if (!res.ok || !body.upscaledUrl) {
    throw new Error(body.error ?? "Upscaling failed");
  }
  return body.upscaledUrl;
}

export default function Home() {
  const [upscaledFile, setUpscaledFile] = useState("");
  const [originalImage, setOriginalImage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const getUpscaleUrl = (file: string) => {
    if (file.length <= 1) {
      return;
    }
    // console.log("ali04: 1", file);
    setOriginalImage(file);
    // set to loading animation
    setIsLoading(true);
    setError("");
    // get from backend
    void requestUpscale(file)
      .then(setUpscaledFile)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Upscaling failed"),
      )
      .finally(() => setIsLoading(false));
  };

  const getUpscale = (files: UploadWidgetResult[]) => {
    console.log("ali04: 2", files, files[0]);
    if (files?.[0] == undefined) {
      return;
    }
    // const fileUrl = files[0].fileUrl;

    // fetch from ai upscaler
  };

  return (
    <>
      <Head>
        <title>Clarify</title>
        <meta name="description" content="Clarify your images" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c]">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
            Clarify Images Using AI
          </h1>
          <div className="m-auto w-full">
            <UploadDropzone
              options={options}
              onUpdate={({ uploadedFiles }) =>
                uploadedFiles.map((x) => getUpscaleUrl(x.fileUrl))
              }
              onComplete={(files) => getUpscale(files)}
              width="100%"
              height="375px"
            />
            {isLoading ? (
              <h2 className="m-4 text-center text-2xl text-white">
                Loading Images...
              </h2>
            ) : (
              ""
            )}
            {error ? (
              <p className="m-4 text-center text-xl text-red-300">{error}</p>
            ) : (
              ""
            )}
            {upscaledFile ? (
              <div className="m-auto inline">
                <img
                  src={originalImage}
                  className="m-auto inline"
                  alt="Original Image"
                  title="Original Image"
                />
                <img
                  src={upscaledFile}
                  className="m-auto inline"
                  alt="New image"
                  title="New Image"
                />
              </div>
            ) : (
              ""
            )}
          </div>
        </div>
      </main>
    </>
  );
}
