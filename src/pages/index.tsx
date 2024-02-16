import { UploadWidgetResult } from "@bytescale/upload-widget";
import { UploadDropzone } from "@bytescale/upload-widget-react";
import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";

const options = {
  apiKey: "free", // Get API key: https://www.bytescale.com/get-started
  maxFileCount: 1,
};

export default function Home() {
  const [upscaledFile, setUpscaledFile] = useState("");
  const [originalImage, setOriginalImage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const getUpscaleUrl = (file: string) => {
    if (file.length <= 1) {
      return;
    }
    // console.log("ali04: 1", file);
    setOriginalImage(file);
    // set to loading animation
    setIsLoading(true);
    // get from backend
    fetch("http://localhost:3000/api/file", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileUrl: file,
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        setUpscaledFile(res.upscaledUrl);
        setIsLoading(false);
      });
  };

  const getUpscale = (files: UploadWidgetResult[]) => {
    console.log("ali04: 2", files, files[0]);
    if (typeof files == "undefined" || files[0] == undefined) {
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
