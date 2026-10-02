// Publishes an image to Instagram (Instagram API with Instagram Login).
import { getStore } from "@netlify/blobs";

const VERSION = process.env.IG_API_VERSION || "v23.0";
const BASE = `https://graph.instagram.com/${VERSION}`;
const REFRESH_AFTER_MS = 7 * 24 * 3600 * 1000;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function call(pathname, params, method = "POST") {
  const url = new URL(pathname.startsWith("http") ? pathname : `${BASE}/${pathname}`);
  const init = { method };
  if (method === "GET") Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  else init.body = new URLSearchParams(params);
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(`Instagram ${pathname.split("?")[0]} failed: ${data.error?.message || res.status}`);
  }
  return data;
}

// Long-lived tokens last 60 days. This refreshes weekly and keeps the newest one,
// so the token never expires as long as you post at least once every ~2 months.
async function getToken() {
  const store = getStore({ name: "instagram", consistency: "strong" });
  const seed = process.env.IG_ACCESS_TOKEN;
  if (!seed) throw new Error("IG_ACCESS_TOKEN is not set");

  let saved = await store.get("token", { type: "json" });
  if (!saved || saved.seed !== seed) saved = { seed, token: seed, refreshedAt: Date.now() };

  if (Date.now() - saved.refreshedAt > REFRESH_AFTER_MS) {
    try {
      const r = await call("https://graph.instagram.com/refresh_access_token",
        { grant_type: "ig_refresh_token", access_token: saved.token }, "GET");
      saved = { ...saved, token: r.access_token, refreshedAt: Date.now() };
    } catch (e) {
      console.warn("Token refresh failed, using current token:", e.message);
    }
  }
  await store.setJSON("token", saved);
  return saved.token;
}

export async function publishImage({ imageUrl, caption = "", altText = "" }) {
  const access_token = await getToken();
  const userId = process.env.IG_USER_ID
    || (await call("me", { fields: "user_id", access_token }, "GET")).user_id;

  const container = await call(`${userId}/media`, {
    image_url: imageUrl, caption, alt_text: altText.slice(0, 1000), access_token,
  });

  // Wait for Instagram to fetch and process the image.
  for (let i = 0; i < 8; i++) {
    const { status_code } = await call(container.id, { fields: "status_code", access_token }, "GET");
    if (status_code === "FINISHED") break;
    if (status_code === "ERROR" || status_code === "EXPIRED") {
      throw new Error(`Instagram could not process the image (${status_code})`);
    }
    await sleep(700);
  }

  return call(`${userId}/media_publish`, { creation_id: container.id, access_token });
}
