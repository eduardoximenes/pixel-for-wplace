"use client";

import { useState, useRef, useCallback } from "react";
import wplaceColors from "../../wplace-colors.json";
import Image from "next/image";
import React from "react";

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string | null>(
    null
  );
  const [pixelatedImage, setPixelatedImage] = useState<string | null>(null);
  const [pixelSize, setPixelSize] = useState(10);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [conversionInfo, setConversionInfo] = useState<{
    originalWidth: number;
    originalHeight: number;
    pixelatedWidth: number;
    pixelatedHeight: number;
    originalPixels: number;
    pixelatedPixels: number;
    usedColors: Array<{
      name: string;
      rgb: [number, number, number];
      count: number;
    }>;
  } | null>(null);
  const [hoveredColor, setHoveredColor] = useState<{
    name: string;
    rgb: [number, number, number];
    x: number;
    y: number;
  } | null>(null);
  const [isPiPOpen, setIsPiPOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixelatedImageRef = useRef<HTMLImageElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFile = (file: File) => {
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setSelectedImageName(file.name);
        setPixelatedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const colorDistance = (
    r1: number,
    g1: number,
    b1: number,
    r2: number,
    g2: number,
    b2: number
  ): number => {
    return Math.sqrt(
      Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2)
    );
  };

  const findNearestWplaceColor = (
    r: number,
    g: number,
    b: number
  ): [number, number, number] => {
    let nearestColor = wplaceColors[0].rgb as [number, number, number];
    let minDistance = colorDistance(
      r,
      g,
      b,
      nearestColor[0],
      nearestColor[1],
      nearestColor[2]
    );

    for (const color of wplaceColors) {
      const [wr, wg, wb] = color.rgb;
      const distance = colorDistance(r, g, b, wr, wg, wb);
      if (distance < minDistance) {
        minDistance = distance;
        nearestColor = [wr, wg, wb];
      }
    }

    return nearestColor;
  };

  const getColorAtPosition = (
    x: number,
    y: number,
    imageWidth: number,
    imageHeight: number
  ) => {
    if (!canvasRef.current) return null;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const scaleX = canvas.width / imageWidth;
    const scaleY = canvas.height / imageHeight;
    const canvasX = Math.floor(x * scaleX);
    const canvasY = Math.floor(y * scaleY);

    try {
      const imageData = ctx.getImageData(canvasX, canvasY, 1, 1);
      const [r, g, b] = imageData.data;

      const matchingColor = wplaceColors.find(
        (color) =>
          color.rgb[0] === r && color.rgb[1] === g && color.rgb[2] === b
      );

      return matchingColor || null;
    } catch (error) {
      console.error("Error getting color at position:", error);
      return null;
    }
  };

  const handleImageMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!pixelatedImageRef.current) return;

    const rect = pixelatedImageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const color = getColorAtPosition(x, y, rect.width, rect.height);
    if (color) {
      setHoveredColor({
        name: color.name,
        rgb: color.rgb as [number, number, number],
        x: e.clientX,
        y: e.clientY,
      });
    }
  };

  const handleImageMouseLeave = () => {
    setHoveredColor(null);
  };

  const openPiP = async () => {
    if (!pixelatedImage) return;

    if (
      "pictureInPictureEnabled" in document &&
      document.pictureInPictureEnabled
    ) {
      try {
        const img = new window.Image();
        img.crossOrigin = "anonymous";

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = pixelatedImage;
        });

        const pipCanvas = document.createElement("canvas");
        const pipCtx = pipCanvas.getContext("2d");

        if (!pipCtx) throw new Error("Canvas context not available");

        pipCanvas.width = img.width;
        pipCanvas.height = img.height + 80;

        pipCtx.drawImage(img, 0, 0);

        pipCtx.fillStyle = "rgba(0, 0, 0, 0.85)";
        pipCtx.fillRect(0, img.height, pipCanvas.width, 80);

        pipCtx.fillStyle = "white";
        pipCtx.font = "bold 18px Arial";
        pipCtx.fillText("Wplace Pixel Art Reference", 10, img.height + 25);

        if (conversionInfo) {
          pipCtx.font = "16px Arial";
          pipCtx.fillText(
            `📐 Grid: ${conversionInfo.pixelatedWidth} × ${conversionInfo.pixelatedHeight} blocks`,
            10,
            img.height + 45
          );
          pipCtx.fillText(
            `🎯 Pixels to paint: ${conversionInfo.pixelatedPixels.toLocaleString()}`,
            10,
            img.height + 65
          );
        }

        const video = document.createElement("video");
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        video.loop = true;

        video.width = pipCanvas.width;
        video.height = pipCanvas.height;

        const stream = pipCanvas.captureStream(0);
        video.srcObject = stream;

        await new Promise((resolve, reject) => {
          video.onloadedmetadata = () => {
            video.play().then(resolve).catch(reject);
          };
          video.onerror = reject;
          pipCtx.drawImage(img, 0, 0);
        });

        await new Promise((resolve) => setTimeout(resolve, 100));

        await video.requestPictureInPicture();
        setIsPiPOpen(true);

        video.addEventListener("leavepictureinpicture", () => {
          setIsPiPOpen(false);
          setHoveredColor(null);
        });

        return;
      } catch (error) {
        console.error("Failed to open Picture-in-Picture:", error);
        alert(
          "Picture-in-Picture failed to open. Please make sure your browser supports this feature."
        );
      }
    } else {
      alert("Picture-in-Picture is not supported in your browser");
    }
  };

  const pixelateImage = async () => {
    if (!selectedImage || !canvasRef.current) return;

    setIsProcessing(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new window.Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      const originalWidth = img.width;
      const originalHeight = img.height;
      const pixelatedWidth = Math.ceil(originalWidth / pixelSize);
      const pixelatedHeight = Math.ceil(originalHeight / pixelSize);
      const originalPixels = originalWidth * originalHeight;
      const pixelatedPixels = pixelatedWidth * pixelatedHeight;

      const colorUsage = new Map<
        string,
        { name: string; rgb: [number, number, number]; count: number }
      >();

      ctx?.drawImage(img, 0, 0);

      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      if (!imageData) return;

      const data = imageData.data;

      for (let y = 0; y < canvas.height; y += pixelSize) {
        for (let x = 0; x < canvas.width; x += pixelSize) {
          let r = 0,
            g = 0,
            b = 0,
            a = 0;
          let count = 0;

          for (let dy = 0; dy < pixelSize && y + dy < canvas.height; dy++) {
            for (let dx = 0; dx < pixelSize && x + dx < canvas.width; dx++) {
              const i = ((y + dy) * canvas.width + (x + dx)) * 4;
              r += data[i];
              g += data[i + 1];
              b += data[i + 2];
              a += data[i + 3];
              count++;
            }
          }

          r = Math.floor(r / count);
          g = Math.floor(g / count);
          b = Math.floor(b / count);
          a = Math.floor(a / count);

          const [wr, wg, wb] = findNearestWplaceColor(r, g, b);
          r = wr;
          g = wg;
          b = wb;

          const colorKey = `${r},${g},${b}`;
          const wplaceColor = wplaceColors.find(
            (color) =>
              color.rgb[0] === r && color.rgb[1] === g && color.rgb[2] === b
          );

          if (wplaceColor) {
            if (colorUsage.has(colorKey)) {
              colorUsage.get(colorKey)!.count++;
            } else {
              colorUsage.set(colorKey, {
                name: wplaceColor.name,
                rgb: [r, g, b] as [number, number, number],
                count: 1,
              });
            }
          }

          for (let dy = 0; dy < pixelSize && y + dy < canvas.height; dy++) {
            for (let dx = 0; dx < pixelSize && x + dx < canvas.width; dx++) {
              const i = ((y + dy) * canvas.width + (x + dx)) * 4;
              data[i] = r;
              data[i + 1] = g;
              data[i + 2] = b;
              data[i + 3] = a;
            }
          }
        }
      }

      ctx?.putImageData(imageData, 0, 0);

      const pixelatedDataUrl = canvas.toDataURL();
      setPixelatedImage(pixelatedDataUrl);

      const usedColors = Array.from(colorUsage.values()).sort(
        (a, b) => b.count - a.count
      );

      setConversionInfo({
        originalWidth,
        originalHeight,
        pixelatedWidth,
        pixelatedHeight,
        originalPixels,
        pixelatedPixels,
        usedColors,
      });

      setIsProcessing(false);
    };

    img.src = selectedImage;
  };

  const downloadImage = () => {
    if (!pixelatedImage) return;

    const link = document.createElement("a");
    link.download = "pixelated-image.png";
    link.href = pixelatedImage;
    link.click();
  };

  const resetImage = () => {
    setSelectedImage(null);
    setSelectedImageName(null);
    setPixelatedImage(null);
    setConversionInfo(null);
    setHoveredColor(null);
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    }
    setIsPiPOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen app-bg">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 mb-3">
            Pixel Art Generator for Wplace
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Transform your images into pixel art with adjustable pixel sizes
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white/70 dark:bg-white/5 backdrop-blur rounded-2xl p-6 shadow-xl ring-1 ring-black/5 dark:ring-white/10 mb-8">
            {selectedImageName && (
              <div className="mb-4 p-3 bg-blue-50/70 dark:bg-blue-900/20 rounded-lg border border-blue-200/60 dark:border-blue-800/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-blue-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Selected: {selectedImageName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={resetImage} className="cursor-pointer">
                      <svg
                        className="w-5 h-5 text-red-400 hover:text-red-600"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
            {selectedImage ? null : (
              <div
                className={` mb-8 border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                  dragActive
                    ? "border-emerald-400 bg-emerald-50/70 dark:bg-emerald-900/20"
                    : "border-gray-300/60 dark:border-gray-600/60 hover:border-sky-400 dark:hover:border-sky-500"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 text-gray-400">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xl text-gray-600 dark:text-gray-300 mb-2">
                      Drag and drop your image here
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      or click to browse files
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-gradient-to-r from-emerald-500 to-sky-600 hover:from-emerald-600 hover:to-sky-700 text-white px-6 py-2 rounded-lg shadow-lg shadow-emerald-500/20 transition-colors"
                    >
                      Choose Image
                    </button>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>
            )}
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                Controls
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pixel Size: {pixelSize}px
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="50"
                    value={pixelSize}
                    onChange={(e) => setPixelSize(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200/60 rounded-lg appearance-none cursor-pointer dark:bg-gray-700/60 accent-emerald-500"
                  />
                </div>

                <div className="space-y-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Color Palette:</span> Wplace
                    Colors ({wplaceColors.length} colors)
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={pixelateImage}
                    disabled={isProcessing}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-sky-600 hover:from-emerald-600 hover:to-sky-700 disabled:from-emerald-300 disabled:to-sky-300 text-white py-2 px-4 rounded-lg shadow-lg shadow-emerald-500/20 transition-colors"
                  >
                    {isProcessing ? "Processing..." : "Generate Pixel Art"}
                  </button>

                  <button
                    onClick={resetImage}
                    className="bg-gray-600/90 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Reset
                  </button>
                </div>

                {pixelatedImage && (
                  <div className="space-y-3">
                    <button
                      onClick={downloadImage}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 px-4 rounded-lg shadow-lg shadow-emerald-500/20 transition-colors"
                    >
                      Download Pixel Art
                    </button>

                    <div className="space-y-2">
                      <button
                        onClick={openPiP}
                        className="w-full bg-sky-500 hover:bg-sky-600 text-white py-2 px-4 rounded-lg shadow-lg shadow-sky-500/20 transition-colors flex items-center justify-center gap-2"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z" />
                          <path d="M14 10h5v3h-5z" />
                        </svg>
                        {isPiPOpen && document.pictureInPictureElement
                          ? "Close Picture-in-Picture"
                          : "Open Picture-in-Picture"}
                      </button>

                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        PiP window stays visible across tabs and applications
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {selectedImage && (
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-white/70 dark:bg-white/5 backdrop-blur rounded-2xl p-6 shadow-xl ring-1 ring-black/5 dark:ring-white/10">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                    Original Image
                  </h3>
                  <div className="relative">
                    <Image
                      width={100}
                      height={100}
                      src={selectedImage}
                      alt="Original"
                      className="w-full h-auto shadow-md"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white/70 dark:bg-white/5 backdrop-blur rounded-2xl p-6 shadow-xl ring-1 ring-black/5 dark:ring-white/10">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                  Pixelated Result
                </h3>
                <div className="relative min-h-[300px] bg-gray-50 dark:bg-gray-700  flex items-center justify-center">
                  {pixelatedImage ? (
                    <div className="relative">
                      <Image
                        ref={pixelatedImageRef}
                        width={100}
                        height={100}
                        src={pixelatedImage}
                        alt="Pixelated"
                        className="w-full h-auto shadow-md cursor-crosshair"
                        onMouseMove={handleImageMouseMove}
                        onMouseLeave={handleImageMouseLeave}
                      />
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400">
                      <div className="w-16 h-16 mx-auto mb-4 opacity-50">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <p>Your pixelated image will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {conversionInfo && (
            <div className="mt-8 bg-white/70 dark:bg-white/5 backdrop-blur rounded-2xl p-6 shadow-xl ring-1 ring-black/5 dark:ring-white/10">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-blue-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                Conversion Information
              </h3>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-700 dark:text-gray-300">
                    Original Image
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Dimensions:
                      </span>
                      <span className="font-mono">
                        {conversionInfo.originalWidth} ×{" "}
                        {conversionInfo.originalHeight}px
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Total Pixels:
                      </span>
                      <span className="font-mono">
                        {conversionInfo.originalPixels.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-gray-700 dark:text-gray-300">
                    Pixelated Result
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Grid Size:
                      </span>
                      <span className="font-mono">
                        {conversionInfo.pixelatedWidth} ×{" "}
                        {conversionInfo.pixelatedHeight} blocks
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Pixels to Paint:
                      </span>
                      <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
                        {conversionInfo.pixelatedPixels.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Pixel Size:
                      </span>
                      <span className="font-mono">{pixelSize}px blocks</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200/60 dark:border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Compression Ratio:
                  </span>
                  <div className="text-right">
                    <span className="font-mono text-lg font-semibold text-green-600 dark:text-green-400">
                      {(
                        (1 -
                          conversionInfo.pixelatedPixels /
                            conversionInfo.originalPixels) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      (
                      {(
                        conversionInfo.originalPixels /
                        conversionInfo.pixelatedPixels
                      ).toFixed(1)}
                      :1 reduction)
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200/60 dark:border-white/10">
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <span>
                    Colors Used ({conversionInfo.usedColors.length} different
                    colors)
                  </span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                  {conversionInfo.usedColors.map((color, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-2 bg-gray-50/70 dark:bg-gray-700/60 rounded-lg"
                    >
                      <div
                        className="w-8 h-8 rounded border-2 border-gray-300 dark:border-gray-600 flex-shrink-0"
                        style={{
                          backgroundColor: `rgb(${color.rgb[0]}, ${color.rgb[1]}, ${color.rgb[2]})`,
                        }}
                        title={`RGB(${color.rgb[0]}, ${color.rgb[1]}, ${color.rgb[2]})`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm text-gray-800 dark:text-white truncate">
                          {color.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {color.count.toLocaleString()} pixels (
                          {(
                            (color.count / conversionInfo.pixelatedPixels) *
                            100
                          ).toFixed(1)}
                          %)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50/70 dark:bg-blue-900/20 rounded-lg border border-blue-200/60 dark:border-blue-800/60">
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <div className="font-medium mb-1">
                    Area Selection Tips:
                  </div>
                  <ul className="text-xs space-y-1 text-blue-700 dark:text-blue-300">
                    <li>
                      • Each pixel block will be painted as one color in r/place
                    </li>
                    <li>
                      • Consider the{" "}
                      {conversionInfo.pixelatedPixels.toLocaleString()} pixels
                      needed for your area
                    </li>
                    <li>
                      • You&apos;ll need {conversionInfo.usedColors.length}{" "}
                      different colors from the palette above
                    </li>
                    <li>
                      • Smaller pixel sizes create more detail but require more
                      pixels to paint
                    </li>
                    {conversionInfo.pixelatedPixels > 10000 && (
                      <li className="text-orange-600 dark:text-orange-400">
                        ⚠️ Large areas (
                        {conversionInfo.pixelatedPixels.toLocaleString()}{" "}
                        pixels) may take significant time to complete
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {hoveredColor && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: hoveredColor.x + 10,
            top: hoveredColor.y - 60,
          }}
        >
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3 max-w-xs">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 flex-shrink-0"
                style={{
                  backgroundColor: `rgb(${hoveredColor.rgb[0]}, ${hoveredColor.rgb[1]}, ${hoveredColor.rgb[2]})`,
                }}
              />
              <div className="min-w-0">
                <div className="font-medium text-sm text-gray-800 dark:text-white truncate">
                  {hoveredColor.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  RGB({hoveredColor.rgb[0]}, {hoveredColor.rgb[1]},{" "}
                  {hoveredColor.rgb[2]})
                </div>
              </div>
            </div>
          </div>
          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white dark:border-t-gray-800"></div>
        </div>
      )}
    </div>
  );
}
