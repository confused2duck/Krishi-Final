import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function resolveMediaUrl(src, apiBase = process.env.REACT_APP_BACKEND_URL || "") {
  if (!src) return "";
  if (/^(https?:)?\/\//i.test(src) || src.startsWith("data:") || src.startsWith("blob:")) {
    return src;
  }

  const cleanApiBase = apiBase.replace(/\/$/, "");
  const cleanSrc = src.startsWith("/") ? src : `/${src}`;

  if (cleanSrc.startsWith("/api/")) {
    return cleanApiBase ? `${cleanApiBase}${cleanSrc}` : cleanSrc;
  }

  return cleanSrc;
}
