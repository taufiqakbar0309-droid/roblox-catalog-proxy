// api/search.js
// Endpoint: GET /api/search?keyword=hat&category=Hats&limit=30&cursor=&sort=Relevance

import axios from "axios";

const API_KEY = process.env.API_KEY;

const robloxHeaders = {
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0",
};

export default async function handler(req, res) {
    // Validasi API Key
    const key = req.headers["x-api-key"];
    if (!key || key !== API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    // Hanya izinkan GET
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const {
            keyword = "",
            category = "All",
            subcategory = "",
            limit = 30,
            cursor = "",
            sort = "Relevance",
            minPrice = "",
            maxPrice = "",
        } = req.query;

        // Roblox API pakai huruf kapital dan angka untuk Category
        const params = new URLSearchParams({
            Limit: Math.min(Number(limit), 30),
            SortType: sort,
            salesTypeFilter: 1,
        });

        if (keyword) params.append("keyword", keyword);
        if (category) params.append("Category", category);       // angka: 1=All, 3=Clothing, 5=Gear, 11=Accessories
        if (subcategory) params.append("Subcategory", subcategory); // angka: 20=Hair, 22=Neck, dll
        if (cursor) params.append("Cursor", cursor);
        if (minPrice) params.append("minPrice", minPrice);
        if (maxPrice) params.append("maxPrice", maxPrice);

        const url = `https://catalog.roblox.com/v1/search/items/details?${params}`;
        const response = await axios.get(url, {
            headers: robloxHeaders,
            timeout: 8000,
        });

        const items = (response.data.data || []).map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price ?? null,
            premiumPrice: item.premiumPricing?.premiumPriceInRobux ?? null,
            creatorName: item.creatorName,
            creatorType: item.creatorType,
            itemType: item.itemType,
            assetType: item.assetType,
            thumbnail: `https://www.roblox.com/asset-thumbnail/image?assetId=${item.id}&width=420&height=420&format=png`,
            itemStatus: item.itemStatus ?? [],
            favoriteCount: item.favoriteCount ?? 0,
        }));

        return res.status(200).json({
            items,
            nextCursor: response.data.nextPageCursor ?? null,
            prevCursor: response.data.previousPageCursor ?? null,
        });

    } catch (err) {
        console.error("[search]", err.message);
        return res.status(500).json({ error: "Gagal fetch catalog: " + err.message });
    }
}
