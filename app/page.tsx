"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { saveAs } from "file-saver";
import { FileRejection } from "react-dropzone";
import { PhotoIcon } from "@heroicons/react/24/outline";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { SelectMenu } from "@/app/selectmenu";
import { motion, AnimatePresence } from "framer-motion";
import { addHistoryItem } from "@/utils/history";
import {
  ErrorNotification,
  ActionPanel,
  ImageOutput,
  UploadedImage,
  ImageDropzone,
} from "@/app/components/page-components";

const themes = ["Modern", "Vintage", "Minimalist", "Professional"];
const rooms = ["Living Room", "Dining Room", "Bedroom", "Bathroom", "Office"];
const NOTIFICATION_TIMEOUT_MS = 4500;

function getNotificationType(message: string): "success" | "error" | "info" {
  const normalized = message.toLowerCase();

  if (message.includes("✅") || normalized.includes("success")) {
    return "success";
  }

  if (message.includes("🔄") || normalized.includes("processing")) {
    return "info";
  }

  return "error";
}

export default function HomePage() {
  const [outputImage, setOutputImage] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [urlLoading, setUrlLoading] = useState<boolean>(false);
  const [theme, setTheme] = useState<string>(themes[0]);
  const [room, setRoom] = useState<string>(rooms[0]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>("");
  const [file, setFile] = useState<File | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingService, setProcessingService] = useState<string | null>(
    null
  );
  const pollAttemptsRef = useRef(0);
  const maxPollAttempts = 8;

  const persistHistory = useCallback(
    (
      generatedImage: string,
      source: "transform" | "generate-new",
      inputImage?: string,
      service?: string
    ) => {
      addHistoryItem({
        inputImage,
        outputImage: generatedImage,
        theme,
        room,
        source,
        service,
      });
    },
    [theme, room]
  );

  // Handle intro animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  // Auto-hide notifications after a short duration.
  useEffect(() => {
    if (!error) {
      return;
    }

    const timer = setTimeout(() => {
      setError("");
    }, NOTIFICATION_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [error]);

  // Poll for processing results
  useEffect(() => {
    if (!processingId || !processingService) return;

    const pollInterval = setInterval(async () => {
      try {
        console.log(
          `🔄 Polling ${processingService} for result:`,
          processingId
        );

        const response = await fetch("/api/check-horde", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ predictionId: processingId }),
        });

        const result = await response.json();

        if (result.completed && result.output) {
          console.log("✅ Transformation completed!");
          setOutputImage(result.output[0]);
          persistHistory(
            result.output[0],
            "transform",
            base64Image || undefined,
            result.service || processingService || "Hugging Face"
          );
          setError(
            `🎯 SUCCESS: Your room has been transformed! The AI preserved your room structure while applying the ${theme} ${room} style.`
          );
          setProcessingId(null);
          setProcessingService(null);
          setLoading(false);
        } else if (result.error) {
          console.log("❌ Processing failed:", result.error);
          setError(
            `❌ Transformation failed: ${result.message || result.error}`
          );
          setProcessingId(null);
          setProcessingService(null);
          setLoading(false);
        } else {
          pollAttemptsRef.current += 1;

          if (pollAttemptsRef.current >= maxPollAttempts) {
            console.log(
              "⏰ Processing took too long, generating a new themed room as fallback..."
            );

            const fallbackResponse = await fetch("/api/generate-new", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ theme, room }),
            });

            const fallbackResult = await fallbackResponse.json();

            if (fallbackResult.output?.[0]) {
              setOutputImage(fallbackResult.output[0]);
              persistHistory(
                fallbackResult.output[0],
                "generate-new",
                undefined,
                fallbackResult.service || "Hugging Face"
              );
              setError(
                `⏰ AI transformation queue timed out. Generated a new ${theme} ${room} concept instead.`
              );
            } else {
              setError(
                "❌ Transformation is taking too long and fallback generation failed. Please try again."
              );
            }

            setProcessingId(null);
            setProcessingService(null);
            setLoading(false);
            return;
          }

          // Still processing
          console.log("🔄 Still processing...", result.message);
          setError(
            result.message ||
              `🔄 Still processing your ${theme} ${room} transformation... (${pollAttemptsRef.current}/${maxPollAttempts})`
          );
        }
      } catch (err) {
        console.error("Polling error:", err);
        setError(
          "❌ Error checking transformation status. The process may still be running."
        );
        setProcessingId(null);
        setProcessingService(null);
        setLoading(false);
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(pollInterval);
  }, [processingId, processingService, theme, room]);

  // Handle image drop
  const onImageDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]): void => {
      if (rejectedFiles.length > 0) {
        setError("Please upload a PNG or JPEG image less than 5MB.");
        return;
      }

      removeImage();
      setError("");
      setFile(acceptedFiles[0]);
      convertImageToBase64(acceptedFiles[0]);
    },
    []
  );

  // Convert image to base64
  const convertImageToBase64 = useCallback((file: File): void => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setBase64Image(reader.result as string);
    };
  }, []);

  // Load image from URL through server route (avoids browser CORS issues)
  const loadImageFromUrl = useCallback(async (): Promise<void> => {
    if (!imageUrl.trim()) {
      setError("Please enter an image URL first.");
      return;
    }

    setUrlLoading(true);
    setError("");

    try {
      const response = await fetch("/api/fetch-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: imageUrl.trim() }),
      });

      const result = await response.json();
      if (!response.ok || result.error || !result.dataUrl) {
        setError(result.error || "Could not load image from URL.");
        return;
      }

      const fetchedBlob = await fetch(result.dataUrl).then((r) => r.blob());
      const minRecommendedBytes = 120 * 1024;
      if (fetchedBlob.size < minRecommendedBytes) {
        setError(
          "The URL image is too small/thumbnail quality. Please use a direct high-resolution image link (at least ~120 KB) for better AI Horde results."
        );
        return;
      }

      const fetchedFile = new File(
        [fetchedBlob],
        result.fileName || "url-image.jpg",
        {
          type: fetchedBlob.type || "image/jpeg",
        }
      );

      setOutputImage(null);
      setFile(fetchedFile);
      setBase64Image(result.dataUrl);
      setError(
        "✅ Image loaded from URL successfully. Click Transform My Room."
      );
    } catch (err) {
      console.error(err);
      setError(
        "❌ Failed to load image from URL. Please check the link and try again."
      );
    } finally {
      setUrlLoading(false);
    }
  }, [imageUrl]);

  // Format file size
  const fileSize = useCallback((size: number): string => {
    if (size === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(size) / Math.log(k));
    return parseFloat((size / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }, []);

  // Remove uploaded image
  const removeImage = useCallback((): void => {
    setFile(null);
    setOutputImage(null);
    setProcessingId(null);
    setProcessingService(null);
    pollAttemptsRef.current = 0;
    setError("");
  }, []);

  // Download the output image
  const downloadOutputImage = useCallback((): void => {
    if (outputImage) {
      saveAs(
        outputImage,
        `interior-design-${theme.toLowerCase()}-${room
          .toLowerCase()
          .replace(" ", "-")}.png`
      );
    }
  }, [outputImage, theme, room]);

  // Submit the image to the server
  const submitImage = useCallback(async (): Promise<void> => {
    if (!file || !base64Image) {
      setError("Please upload a room image first.");
      return;
    }

    setLoading(true);
    setError("");
    setProcessingId(null);
    setProcessingService(null);
    pollAttemptsRef.current = 0;
    let keepLoadingForAsyncProcessing = false;

    try {
      // If file uploaded, attempt transformation
      const response = await fetch("/api/replicate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: base64Image, theme, room }),
      });

      const result = await response.json();
      console.log("API Response:", result);

      if (result.error && !result.isOriginalImage && !result.isProcessing) {
        setError(
          result.error + (result.message ? `\n\n${result.message}` : "")
        );
        return;
      }

      // Handle async processing state (reserved for future providers)
      if (result.isProcessing && result.predictionId) {
        console.log(
          `🔄 Starting to track ${result.service} processing:`,
          result.predictionId
        );
        pollAttemptsRef.current = 0;
        keepLoadingForAsyncProcessing = true;
        setProcessingId(result.predictionId);
        setProcessingService(result.service);
        setOutputImage(result.output[0]); // Show original while processing
        setError(result.message);
        // Keep loading state for visual feedback
        return;
      }

      // Handle immediate success
      if (result.output && !result.isOriginalImage && !result.error) {
        console.log("✅ Immediate transformation success!");
        setOutputImage(result.output[0]);
        persistHistory(
          result.output[0],
          "transform",
          base64Image,
          result.service || "Hugging Face"
        );
        setError(
          result.message ||
            `✅ Successfully transformed your room into ${theme} ${room} style!`
        );
        return;
      }

      // Handle original image with explanation
      if (result.isOriginalImage) {
        setOutputImage(result.output[0]);
        setError(result.message);
        return;
      }

      // Default case
      if (result.output?.[0]) {
        setOutputImage(result.output[0]);
        persistHistory(
          result.output[0],
          file ? "transform" : "generate-new",
          file ? base64Image || undefined : undefined,
          result.service || "Hugging Face"
        );
      }
      if (result.message) {
        setError(result.message);
      }
    } catch (err) {
      console.error(err);
      setError(
        "An unexpected error occurred. Please try again with a different image or generate a new room design."
      );
    } finally {
      if (!keepLoadingForAsyncProcessing) {
        setLoading(false);
      }
    }
  }, [file, base64Image, theme, room, persistHistory, processingService]);

  return (
    <>
      {/* Intro animation */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <motion.div
                className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-4xl font-bold text-transparent md:text-6xl"
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                Interior Designer AI
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-4 text-gray-400"
              >
                Transform your space with artificial intelligence
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1),transparent_50%)]"></div>
        <div className="bg-grid-pattern absolute inset-0 opacity-[0.03]"></div>
        <div className="absolute left-1/2 top-0 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/20 blur-[100px]"></div>
        <div className="absolute bottom-0 right-1/4 h-[600px] w-[600px] rounded-full bg-purple-500/20 blur-[100px]"></div>
      </div>

      {/* Main content */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex min-h-screen flex-col pb-8 pt-4 lg:pl-72 lg:pt-10"
      >
        <AnimatePresence>
          {error && (
            <ErrorNotification
              errorMessage={error}
              type={getNotificationType(error)}
            />
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <ActionPanel
            isLoading={loading || !!processingId}
            submitImage={submitImage}
            hasFile={!!base64Image}
            isProcessing={!!processingId}
            processingService={processingService}
          />
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-6 grid grid-cols-1 gap-4 px-4 sm:mt-8 sm:grid-cols-2 lg:px-6 xl:px-8"
        >
          <SelectMenu
            label="Design Style"
            options={themes}
            selected={theme}
            onChange={setTheme}
          />
          <SelectMenu
            label="Room Type"
            options={rooms}
            selected={room}
            onChange={setRoom}
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.55 }}
          className="mx-4 mt-4 rounded-xl border border-gray-800/40 bg-gray-900/30 p-4 backdrop-blur-lg lg:mx-6 xl:mx-8"
        >
          <p className="mb-2 text-sm font-medium text-gray-200">
            Or load image from URL link
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/room.jpg"
              className="w-full rounded-lg border border-gray-700 bg-gray-800/70 px-3 py-2 text-sm text-gray-100 placeholder-gray-400 focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={loadImageFromUrl}
              disabled={urlLoading}
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {urlLoading ? "Loading..." : "Load URL"}
            </button>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-8 grid flex-1 gap-5 px-4 sm:gap-6 lg:px-6 xl:mt-10 xl:grid-cols-2 xl:gap-10 xl:px-8"
        >
          <AnimatePresence mode="wait">
            {!file ? (
              <ImageDropzone
                title="Upload your room photo to transform"
                onImageDrop={onImageDrop}
                icon={PhotoIcon}
              />
            ) : (
              <UploadedImage
                image={file}
                removeImage={removeImage}
                file={{ name: file.name, size: fileSize(file.size) }}
              />
            )}
          </AnimatePresence>

          <ImageOutput
            title="Your transformed room design will appear here"
            downloadOutputImage={downloadOutputImage}
            outputImage={outputImage}
            icon={SparklesIcon}
            loading={loading}
            isProcessing={!!processingId}
          />
        </motion.section>

        {/* How It Works section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="glassmorphism mx-4 mt-12 rounded-2xl border border-gray-800/30 p-6 lg:mx-6 xl:mx-8"
        >
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="gradient-text mb-6 text-xl font-bold"
          >
            How It Works
          </motion.h2>

          <div className="grid gap-8 md:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="card-hover flex flex-col items-center p-4 text-center"
            >
              <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/20">
                <div className="absolute inset-0 animate-pulse rounded-full bg-blue-500/20"></div>
                <PhotoIcon className="relative z-10 h-7 w-7 text-blue-400" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-white">Upload</h3>
              <p className="text-sm text-gray-400">
                Upload a photo of any room you'd like to redesign
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 }}
              className="card-hover flex flex-col items-center p-4 text-center"
            >
              <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/20">
                <div className="absolute inset-0 animate-pulse rounded-full bg-indigo-500/20"></div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="relative z-10 h-7 w-7 text-indigo-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-medium text-white">Customize</h3>
              <p className="text-sm text-gray-400">
                Select your preferred style and room type
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6 }}
              className="card-hover flex flex-col items-center p-4 text-center"
            >
              <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-500/20">
                <div className="absolute inset-0 animate-pulse rounded-full bg-purple-500/20"></div>
                <SparklesIcon className="relative z-10 h-7 w-7 text-purple-400" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-white">Transform</h3>
              <p className="text-sm text-gray-400">
                Our AI generates a stunning new design in seconds
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8 }}
            className="mt-8 text-center"
          >
            <span className="text-sm text-gray-400">
              Powered by advanced machine learning models trained on interior
              design principles
            </span>
          </motion.div>
        </motion.section>
      </motion.main>
    </>
  );
}
