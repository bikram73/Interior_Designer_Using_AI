"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { saveAs } from "file-saver";
import { motion } from "framer-motion";
import {
  ArrowDownTrayIcon,
  TrashIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { clearHistory, readHistory, removeHistoryItem } from "@/utils/history";
import { HistoryItem } from "@/types";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    setItems(readHistory());
  }, []);

  const hasItems = items.length > 0;

  const grouped = useMemo(() => {
    return items.map((item) => ({
      ...item,
      createdLabel: formatDate(item.createdAt),
      sourceLabel:
        item.source === "transform" ? "From Upload" : "Generated New",
    }));
  }, [items]);

  const handleDownloadGenerated = (item: HistoryItem) => {
    const fileName = `history-${item.theme.toLowerCase()}-${item.room
      .toLowerCase()
      .replace(/\s+/g, "-")}-${item.id}.png`;
    saveAs(item.outputImage, fileName);
  };

  const handleDownloadUploaded = (item: HistoryItem) => {
    if (!item.inputImage) {
      return;
    }

    const fileName = `uploaded-${item.theme.toLowerCase()}-${item.room
      .toLowerCase()
      .replace(/\s+/g, "-")}-${item.id}.png`;
    saveAs(item.inputImage, fileName);
  };

  const handleRemove = (id: string) => {
    setItems(removeHistoryItem(id));
  };

  const handleClear = () => {
    clearHistory();
    setItems([]);
  };

  return (
    <main className="min-h-screen pb-8 pt-4 lg:pl-72 lg:pt-10">
      <section className="mx-4 rounded-2xl border border-gray-800/40 bg-gray-900/40 p-4 shadow-xl backdrop-blur-lg sm:p-6 lg:mx-6 xl:mx-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
              Your History
            </h1>
            <p className="mt-1 text-sm text-gray-300">
              Past room designs for this user/browser with download options.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center rounded-lg border border-gray-700 bg-gray-800/70 px-3 py-2 text-sm font-medium text-gray-100 transition hover:bg-gray-700"
            >
              Back to Home
            </Link>
            <button
              type="button"
              onClick={handleClear}
              disabled={!hasItems}
              className="inline-flex items-center rounded-lg bg-red-600/90 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-800/50"
            >
              Clear All
            </button>
          </div>
        </div>
      </section>

      {!hasItems ? (
        <section className="mx-4 mt-6 rounded-2xl border border-gray-800/40 bg-gray-900/30 p-10 text-center backdrop-blur sm:mt-8 lg:mx-6 xl:mx-8">
          <ClockIcon className="mx-auto h-12 w-12 text-indigo-300" />
          <h2 className="mt-4 text-lg font-semibold text-gray-100">
            No History Yet
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Start by generating or transforming a room. It will appear here
            automatically.
          </p>
        </section>
      ) : (
        <section className="mx-4 mt-6 grid gap-5 sm:grid-cols-2 lg:mx-6 xl:mx-8 xl:grid-cols-3">
          {grouped.map((item) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-2xl border border-gray-800/50 bg-gray-900/40 shadow-xl"
            >
              <div className="grid grid-cols-1 gap-2 p-2 sm:grid-cols-2">
                {item.inputImage ? (
                  <div className="overflow-hidden rounded-xl border border-gray-800/50">
                    <div className="bg-gray-800/80 px-2 py-1 text-xs font-medium text-gray-200">
                      Uploaded Image
                    </div>
                    <div className="relative h-40 w-full sm:h-44">
                      <img
                        src={item.inputImage}
                        alt={`Uploaded ${item.room}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                ) : null}

                <div className="overflow-hidden rounded-xl border border-gray-800/50">
                  <div className="bg-indigo-900/50 px-2 py-1 text-xs font-medium text-indigo-200">
                    Generated Image
                  </div>
                  <div className="relative h-40 w-full sm:h-44">
                    <img
                      src={item.outputImage}
                      alt={`${item.theme} ${item.room}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-blue-600/80 px-2 py-1 text-xs font-semibold text-white">
                    {item.theme}
                  </span>
                  <span className="rounded-full bg-indigo-600/80 px-2 py-1 text-xs font-semibold text-white">
                    {item.room}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-gray-300">
                  <p>Service: {item.service || "Hugging Face"}</p>
                  <p>Source: {item.sourceLabel}</p>
                  <p>Created: {item.createdLabel}</p>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {item.inputImage ? (
                    <button
                      type="button"
                      onClick={() => handleDownloadUploaded(item)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-2 text-sm font-semibold text-gray-100 transition hover:bg-gray-700"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      Download Uploaded
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => handleDownloadGenerated(item)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:from-blue-500 hover:to-indigo-500"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    Download Generated
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600/90 px-3 py-2 text-white transition hover:bg-red-500"
                    aria-label="Remove history item"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Remove from History
                  </button>
                </div>
              </div>
            </motion.article>
          ))}
        </section>
      )}
    </main>
  );
}
