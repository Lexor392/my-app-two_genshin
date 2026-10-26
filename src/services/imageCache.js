const DB_NAME = "teyvat-random-lab-assets";
const DB_VERSION = 1;
const STORE_NAME = "images";
const MEMORY_URLS = new Map();
const MEMORY_SOURCES = new Map();
const IMAGE_TIMEOUT_MS = 6500;
const CATALOG_STORAGE_KEY = "teyvat-random-lab:catalog:v2";

let databasePromise;

export const readCatalogSnapshot = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(CATALOG_STORAGE_KEY) || "null");
    const catalog = parsed?.catalog;
    return Array.isArray(catalog?.characters) && Array.isArray(catalog?.bosses?.all) ? catalog : null;
  } catch {
    return null;
  }
};

export const saveCatalogSnapshot = (catalog) => {
  try {
    localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), catalog }));
    return true;
  } catch {
    return false;
  }
};

const openDatabase = () => {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (!databasePromise) {
    databasePromise = new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME, { keyPath: "url" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    });
  }
  return databasePromise;
};

const readBlob = async (url) => {
  const db = await openDatabase();
  if (!db) return null;
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(url);
    request.onsuccess = () => resolve(request.result?.blob || null);
    request.onerror = () => resolve(null);
  });
};

const saveBlob = async (url, blob) => {
  const db = await openDatabase();
  if (!db) return false;
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put({ url, blob, savedAt: Date.now() });
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => resolve(false);
    transaction.onabort = () => resolve(false);
  });
};

const isImageBlob = (blob) => blob instanceof Blob && blob.size > 0 && blob.type.startsWith("image/");

const fetchBlob = async (url, signal) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", abort, { once: true });
  try {
    const response = await fetch(url, { mode: "cors", signal: controller.signal, cache: "force-cache" });
    if (!response.ok) throw new Error(`Image request failed: ${response.status}`);
    const blob = await response.blob();
    if (!isImageBlob(blob)) throw new Error("Image response was not an image");
    return blob;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abort);
  }
};

const makeObjectUrl = (url, blob) => {
  if (!MEMORY_URLS.has(url)) MEMORY_URLS.set(url, URL.createObjectURL(blob));
  return MEMORY_URLS.get(url);
};

export const getCachedImageSource = async (url) => {
  if (!url) return "";
  if (MEMORY_SOURCES.has(url)) return MEMORY_SOURCES.get(url);
  const blob = await readBlob(url);
  const source = isImageBlob(blob) ? makeObjectUrl(url, blob) : url;
  MEMORY_SOURCES.set(url, source);
  return source;
};

export const cacheImageAsset = async (url, signal) => {
  if (!url || signal?.aborted) throw new Error("Image loading cancelled");
  const cached = await readBlob(url);
  if (isImageBlob(cached)) {
    MEMORY_SOURCES.set(url, makeObjectUrl(url, cached));
    return url;
  }
  const blob = await fetchBlob(url, signal);
  await saveBlob(url, blob);
  MEMORY_SOURCES.set(url, makeObjectUrl(url, blob));
  return url;
};

export const clearMemoryImageUrls = () => {
  MEMORY_URLS.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
  MEMORY_URLS.clear();
  MEMORY_SOURCES.clear();
};
