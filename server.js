// server.js
// Proxy server untuk fetch data dari Roblox Catalog API
// Deploy ke Railway / Render / VPS

const express = require("express");
const axios = require("axios");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// KEAMANAN
// ============================================================

app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limit: max 60 request per menit per IP
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: { error: "Terlalu banyak request, coba lagi nanti." },
});
app.use(limiter);

// Validasi API Key sederhana (opsional tapi disarankan)
const API_KEY = process.env.API_KEY || "GANTI_API_KEY_KAMU";

function validateKey(req, res, next) {
    const key = req.headers["x-api-key"];
    if (!key || key !== API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
}

// ============================================================
// HEADERS untuk Roblox API
// ============================================================

const robloxHeaders = {
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0",
};

// ============================================================
// ENDPOINT 1: Search & Browse Catalog
// GET /catalog/search?keyword=hat&category=Hats&limit=30&cursor=
// ============================================================
// Kategori valid Roblox:
// Hats, HairAccessories, FaceAccessories, NeckAccessories,
// ShoulderAccessories, FrontAccessories, BackAccessories,
// WaistAccessories, TShirts, Shirts, Pants, Faces, Heads,
// Gear, All

app.get("/catalog/search", validateKey, async (req, res) => {
    try {
        const {
            keyword = "",
            category = "All",
            limit = 30,
            cursor = "",
            minPrice = "",
            maxPrice = "",
            sort = "Relevance", // Relevance | PriceAsc | PriceDesc | RecentlyUpdated
        } = req.query;

        const params = new URLSearchParams({
            keyword,
            category,
            limit: Math.min(Number(limit), 30),
            sortType: sort,
            salesTypeFilter: 1, // 1 = offsale + onsale, 2 = onsale only
        });

        if (cursor) params.append("cursor", cursor);
        if (minPrice) params.append("minPrice", minPrice);
        if (maxPrice) params.append("maxPrice", maxPrice);

        const url = `https://catalog.roblox.com/v1/search/items/details?${params}`;
        const response = await axios.get(url, { headers: robloxHeaders, timeout: 8000 });

        // Format data yang dikirim ke Roblox game
        const items = (response.data.data || []).map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price ?? null,           // null = tidak dijual
            premiumPrice: item.premiumPricing?.premiumPriceInRobux ?? null,
            creatorName: item.creatorName,
            creatorType: item.creatorType,
            itemType: item.itemType,             // "Asset" atau "Bundle"
            assetType: item.assetType,
            thumbnail: `https://www.roblox.com/asset-thumbnail/image?assetId=${item.id}&width=420&height=420&format=png`,
            itemStatus: item.itemStatus,         // [] atau ["New"], ["Sale"]
            unitsAvailableForConsumption: item.unitsAvailableForConsumption,
            favoriteCount: item.favoriteCount ?? 0,
        }));

        res.json({
            items,
            nextCursor: response.data.nextPageCursor ?? null,
            prevCursor: response.data.previousPageCursor ?? null,
        });

    } catch (err) {
        console.error("[search]", err.message);
        res.status(500).json({ error: "Gagal fetch catalog: " + err.message });
    }
});

// ============================================================
// ENDPOINT 2: Detail Item
// GET /catalog/item/:assetId
// ============================================================

app.get("/catalog/item/:assetId", validateKey, async (req, res) => {
    try {
        const { assetId } = req.params;

        const [detailRes, thumbRes] = await Promise.all([
            axios.get(`https://catalog.roblox.com/v1/catalog/items/${assetId}/details?itemType=Asset`, {
                headers: robloxHeaders,
                timeout: 8000,
            }),
            axios.get(`https://thumbnails.roblox.com/v1/assets?assetIds=${assetId}&size=420x420&format=Png&isCircular=false`, {
                headers: robloxHeaders,
                timeout: 8000,
            }),
        ]);

        const d = detailRes.data;
        const thumb = thumbRes.data?.data?.[0]?.imageUrl ?? "";

        res.json({
            id: d.id,
            name: d.name,
            description: d.description,
            price: d.price ?? null,
            premiumPrice: d.premiumPricing?.premiumPriceInRobux ?? null,
            creatorName: d.creatorName,
            creatorType: d.creatorType,
            assetType: d.assetType,
            itemStatus: d.itemStatus ?? [],
            favoriteCount: d.favoriteCount ?? 0,
            thumbnail: thumb,
            productId: d.productId,
        });

    } catch (err) {
        console.error("[item detail]", err.message);
        res.status(500).json({ error: "Gagal fetch detail item: " + err.message });
    }
});

// ============================================================
// ENDPOINT 3: Thumbnail Batch
// POST /catalog/thumbnails
// Body: { assetIds: [123, 456, ...] }
// ============================================================

app.post("/catalog/thumbnails", validateKey, async (req, res) => {
    try {
        const { assetIds } = req.body;
        if (!Array.isArray(assetIds) || assetIds.length === 0) {
            return res.status(400).json({ error: "assetIds harus array" });
        }

        const ids = assetIds.slice(0, 30).join(","); // max 30
        const response = await axios.get(
            `https://thumbnails.roblox.com/v1/assets?assetIds=${ids}&size=420x420&format=Png&isCircular=false`,
            { headers: robloxHeaders, timeout: 8000 }
        );

        const result = {};
        for (const item of response.data.data || []) {
            result[item.targetId] = item.imageUrl;
        }

        res.json(result);

    } catch (err) {
        console.error("[thumbnails]", err.message);
        res.status(500).json({ error: "Gagal fetch thumbnails: " + err.message });
    }
});

// ============================================================
// ENDPOINT 4: Featured / Trending Items
// GET /catalog/featured?category=Hats&limit=10
// ============================================================

app.get("/catalog/featured", validateKey, async (req, res) => {
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

        res.json({ items });

    } catch (err) {
        console.error("[featured]", err.message);
        res.status(500).json({ error: "Gagal fetch featured: " + err.message });
    }
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/", (req, res) => {
    res.json({ status: "ok", message: "Roblox Catalog Proxy aktif ✅" });
});

app.listen(PORT, () => {
    console.log(`✅ Proxy server berjalan di port ${PORT}`);
});
