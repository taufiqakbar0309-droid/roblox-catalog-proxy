// api/featured.js
// Endpoint: GET /api/featured?category=Hats&limit=10

import axios from "axios";

const API_KEY = process.env.API_KEY;

const robloxHeaders = {
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0",
};

export default async function handler(req, res) {
    const key = req.headers["x-api-key"];
    if (!key || key !== API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { category = "Hats", limit = 10 } = req.query;

        const response = await axios.get(
            `https://catalog.roblox.com/v1/search/items/details?category=${category}&limit=${Math.min(Number(limit), 30)}&sortType=RecentlyUpdated&salesTypeFilter=2`,
            { headers: robloxHeaders, timeout: 8000 }
        );

        const items = (response.data.data || []).map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price ?? null,
            creatorName: item.creatorName,
            thumbnail: `https://www.roblox.com/asset-thumbnail/image?assetId=${item.id}&width=420&height=420&format=png`,
            itemStatus: item.itemStatus ?? [],
        }));

        return res.status(200).json({ items });

    } catch (err) {
        console.error("[featured]", err.message);
        return res.status(500).json({ error: "Gagal fetch featured: " + err.message });
    }
}
