// api/index.js
// Health check endpoint

export default function handler(req, res) {
    res.status(200).json({
        status: "ok",
        message: "Roblox Catalog Proxy aktif ✅"
    });
}
