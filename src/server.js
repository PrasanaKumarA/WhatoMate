const express = require("express");
const config = require("./config");
const webhookRoutes = require("./routes/webhook");

// Initialize Database
require("./config/db");

const app = express();

// Middleware to parse JSON payloads
app.use(express.json());

// Main Webhook Route
app.use("/webhook", webhookRoutes);

// Health check endpoint
app.get("/", (req, res) => {
    res.send("WhatoMate Bot is running! 🚀");
});

app.listen(config.PORT, () => {
    console.log(`Server is running on port ${config.PORT} 🚀`);
});
