// api/search.js

import axios from "axios";

const API_KEY = process.env.API_KEY;

const robloxHeaders = {
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0",
};

// SortType: 0=Relevance, 1=Favorited, 2=Sales, 3=Updated, 4=PriceAsc, 5=PriceDesc
const SORT_MAP = {
    "Relevance": "0",
    "RecentlyUpdated": "3",
    "PriceAsc": "4",
    "PriceDesc": "5",
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
        const {
            keyword = "",
            category = "1",
            subcategory = "",
            limit = 30,
            cursor = "",
            sort = "Relevance",
            minPrice = "",
            maxPrice = "",
        } = req.query;

        const sortNum = SORT_MAP[sort] ?? "0";

        const params = new URLSearchParams({
            Limit: Math.min(Number(limit), 30),
            SortType: sortNum,
            SortAggregation: "5",
            salesTypeFilter: "1",
        });

        if (keyword) params.append("keyword", keyword);
        if (category) params.append("Category", category);
        if (subcategory) params.append("Subcategory", subcategory);
        if (cursor) params.append("Cursor", cursor);
        if (minPrice) params.append("minPrice", minPrice);
        if (maxPrice) params.append("maxPrice", maxPrice);

        const url = `https://catalog.roblox.com/v1/search/items/details?${params}`;
        console.log("[search] URL:", url);

        const response = await axios.get(url, {
            headers: robloxHeaders,
            timeout: 10000,
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
        const errDetail = err.response?.data ?? err.message;
        console.error("[search] Error:", JSON.stringify(errDetail));
        return res.status(500).json({ error: "Gagal fetch catalog", detail: errDetail });
    }
}
