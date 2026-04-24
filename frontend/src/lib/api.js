const trimTrailingSlash = (value = "") => value.replace(/\/+$/, "");

const isLocalHostUrl = (value = "") =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(trimTrailingSlash(value));

export const getApiBaseUrl = () => {
  const configured = trimTrailingSlash(process.env.REACT_APP_BACKEND_URL || "");

  if (typeof window !== "undefined") {
    const isBrowserLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);

    if (!configured) {
      return isBrowserLocalhost ? "" : window.location.origin;
    }

    if (isLocalHostUrl(configured) && !isBrowserLocalhost) {
      return window.location.origin;
    }
  }

  return configured;
};

export const API_BASE_URL = getApiBaseUrl();
