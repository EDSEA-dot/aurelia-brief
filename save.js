import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body;
    if (!body || !body.date) return res.status(400).json({ error: "Missing brief data" });

    // Use date as the key (YYYY-MM-DD), also store in a sorted list
    const dateKey = body.date; // e.g. "2026-04-22"
    const fullKey = `brief:${dateKey}`;

    await redis.set(fullKey, JSON.stringify(body), { ex: 60 * 60 * 24 * 90 }); // 90 day expiry
    // Track all brief dates
    await redis.zadd("brief:index", { score: Date.now(), member: dateKey });

    return res.status(200).json({ success: true, id: dateKey, url: `/brief/${dateKey}` });
  } catch (err) {
    console.error("Save error:", err);
    return res.status(500).json({ error: "Failed to save brief: " + err.message });
  }
}
