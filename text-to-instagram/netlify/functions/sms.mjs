// Twilio calls this when a text arrives. Allowed senders get their text posted to Instagram.
import { getStore } from "@netlify/blobs";
import { isFromTwilio, isAllowedSender } from "../../lib/twilio.mjs";
import { renderPost } from "../../lib/render.mjs";
import { publishImage } from "../../lib/instagram.mjs";

const MAX_LEN = 500;
const twiml = () => new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
  { headers: { "content-type": "text/xml" } });

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const params = new URLSearchParams(await req.text());
  if (!isFromTwilio(req, params)) return new Response("Invalid signature", { status: 403 });

  const from = params.get("From") || "";
  const sid = params.get("MessageSid") || crypto.randomUUID();
  const text = (params.get("Body") || "").trim().slice(0, MAX_LEN);

  if (!isAllowedSender(from)) { console.log(`Ignored text from ${from}`); return twiml(); }
  if (!text) return twiml();

  const images = getStore({ name: "images", consistency: "strong" });
  if (await images.getMetadata(sid)) return twiml();   // already handled this message

  try {
    const jpeg = await renderPost(text);
    await images.set(sid, jpeg, { metadata: { createdAt: Date.now() } });

    const site = (process.env.PUBLIC_URL || process.env.URL || new URL(req.url).origin).replace(/\/$/, "");
    const result = await publishImage({
      imageUrl: `${site}/api/image/${sid}`,
      caption: process.env.CAPTION || "",
      altText: text,
    });
    console.log(`Posted ${sid} to Instagram as media ${result.id}`);
  } catch (err) {
    console.error(`Failed to post ${sid}:`, err.message);
  }
  return twiml();
};

export const config = { path: "/api/sms" };
