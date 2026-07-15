// api/featured.js
const axios = require("axios");
const API_KEY = process.env.API_KEY;
const robloxHeaders = { "Accept": "application/json", "User-Agent": "Mozilla/5.0" };

module.exports = async function handler(req, res) {
    const key = req.headers["x-api-key"];
    if (!key || key !== API_KEY) return res.status(401).json({ error: "Unauthorized" });

    try {
        const category = req.query.category || "11";
        const limit = req.query.limit || 10;
        const url = "https://catalog.roblox.com/v1/search/items/details?Category=" + category + "&Limit=" + Math.min(Number(limit), 30) + "&SortType=3&SortAggregation=5&salesTypeFilter=1";
        const response = await axios.get(url, { headers: robloxHeaders, timeout: 8000 });
        const items = (response.data.data || []).map((item) => ({
            id: item.id, name: item.name,
            price: item.price !== undefined ? item.price : null,
            creatorName: item.creatorName,
            thumbnail: "https://www.roblox.com/asset-thumbnail/image?assetId=" + item.id + "&width=420&height=420&format=png",
            itemStatus: item.itemStatus || [],
        }));
        return res.status(200).json({ items });
    } catch (err) {
        return res.status(500).json({ error: "Gagal fetch featured: " + err.message });
    }
};
