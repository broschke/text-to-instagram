// Serves the generated JPEGs so Instagram can download them.
import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  const id = context.params.id;
  const jpeg = await getStore({ name: "images", consistency: "strong" }).get(id, { type: "arrayBuffer" });
  if (!jpeg) return new Response("Not found", { status: 404 });
  return new Response(jpeg, { headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=86400" } });
};

export const config = { path: "/api/image/:id" };
