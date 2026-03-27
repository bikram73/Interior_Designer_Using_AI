import { HistoryItem, HistorySource } from "@/types";

const STORAGE_KEY = "interior_designer_history_v1";
const MAX_ITEMS = 50;

function canUseStorage() {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

export function readHistory(): HistoryItem[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.outputImage === "string" &&
        typeof item.theme === "string" &&
        typeof item.room === "string" &&
        typeof item.source === "string" &&
        typeof item.createdAt === "string"
    ) as HistoryItem[];
  } catch {
    return [];
  }
}

export function writeHistory(items: HistoryItem[]) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(items.slice(0, MAX_ITEMS))
  );
}

export function addHistoryItem(input: {
  outputImage: string;
  theme: string;
  room: string;
  source: HistorySource;
  service?: string;
}) {
  const current = readHistory();

  const next: HistoryItem[] = [
    {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      outputImage: input.outputImage,
      theme: input.theme,
      room: input.room,
      source: input.source,
      service: input.service,
      createdAt: new Date().toISOString(),
    },
    ...current,
  ];

  writeHistory(next);
  return next;
}

export function removeHistoryItem(id: string) {
  const next = readHistory().filter((item) => item.id !== id);
  writeHistory(next);
  return next;
}

export function clearHistory() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}
