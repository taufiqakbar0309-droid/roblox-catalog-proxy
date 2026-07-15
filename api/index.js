// api/index.js
module.exports = function handler(req, res) {
    res.status(200).json({
        status: "ok",
        message: "Roblox Catalog Proxy aktif ✅"
    });
};
