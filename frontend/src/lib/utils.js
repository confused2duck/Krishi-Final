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

export const FREE_SHIPPING_THRESHOLD = 2000;
export const FREE_SHIPPING_MESSAGE = "Free shipping on orders above \u20B92000 within 10 km";
export const STANDARD_SHIPPING_FEE = 50;
export const OIL_COLLECTION_SLUG = "cold-pressed-oils";

export function isOilProduct(product) {
  if (!product) return false;

  if (typeof product === "string") {
    return product === OIL_COLLECTION_SLUG;
  }

  return product.collection === OIL_COLLECTION_SLUG;
}

export function isFiveLitreSize(sizeName) {
  if (!sizeName) return false;

  const normalized = String(sizeName).toLowerCase().replace(/\s+/g, "");
  return ["5l", "5lt", "5ltr", "5liter", "5litre"].some((token) =>
    normalized.includes(token)
  );
}

export function calculateOilOfferDiscount(items = []) {
  return items.reduce((discount, item) => {
    if (!isOilProduct(item) || !isFiveLitreSize(item.size)) {
      return discount;
    }

    return discount + item.quantity * 100;
  }, 0);
}
