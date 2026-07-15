// api/item.js
const axios = require("axios");
const API_KEY = process.env.API_KEY;
const robloxHeaders = { "Accept": "application/json", "User-Agent": "Mozilla/5.0" };

module.exports = async function handler(req, res) {
    const key = req.headers["x-api-key"];
    if (!key || key !== API_KEY) return res.status(401).json({ error: "Unauthorized" });
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

    try {
        const assetId = req.query.assetId;
        if (!assetId) return res.status(400).json({ error: "assetId diperlukan" });

        const [detailRes, thumbRes] = await Promise.all([
            axios.get("https://catalog.roblox.com/v1/catalog/items/" + assetId + "/details?itemType=Asset", { headers: robloxHeaders, timeout: 8000 }),
            axios.get("https://thumbnails.roblox.com/v1/assets?assetIds=" + assetId + "&size=420x420&format=Png&isCircular=false", { headers: robloxHeaders, timeout: 8000 }),
        ]);

        const d = detailRes.data;
        const thumb = detailRes.data && thumbRes.data.data && thumbRes.data.data[0] ? thumbRes.data.data[0].imageUrl : "";

        return res.status(200).json({
            id: d.id, name: d.name,
            description: d.description || "",
            price: d.price !== undefined ? d.price : null,
            premiumPrice: d.premiumPricing ? d.premiumPricing.premiumPriceInRobux : null,
            creatorName: d.creatorName, creatorType: d.creatorType,
            assetType: d.assetType, itemStatus: d.itemStatus || [],
            favoriteCount: d.favoriteCount || 0,
            thumbnail: thumb, productId: d.productId,
        });
    } catch (err) {
        return res.status(500).json({ error: "Gagal fetch detail: " + err.message });
    }
};
