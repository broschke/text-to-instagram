// Twilio request checks.
import crypto from "node:crypto";

// True if the request is signed by Twilio (skipped if TWILIO_AUTH_TOKEN isn't set).
export function isFromTwilio(req, params) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return true;
  const signature = req.headers.get("x-twilio-signature") || "";
  const url = process.env.WEBHOOK_URL || req.url;
  const data = [...params.keys()].sort().reduce((acc, k) => acc + k + params.get(k), url);
  const expected = crypto.createHmac("sha1", token).update(data, "utf8").digest("base64");
  const a = Buffer.from(signature), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// True if the sender is in ALLOWED_NUMBERS. An empty list blocks everyone.
export function isAllowedSender(from) {
  const allowed = (process.env.ALLOWED_NUMBERS || "")
    .split(",").map(s => s.replace(/[^\d+]/g, "")).filter(Boolean);
  return allowed.includes(from);
}
