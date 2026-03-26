require("dotenv").config();

module.exports = {
    PORT: process.env.PORT || 8080,
    APP_ENV: process.env.APP_ENV || "development",
    WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN,
    WHATSAPP_PHONE_ID: process.env.WHATSAPP_PHONE_ID,
    WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN || "whatomate123",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    WHATOMATE_API_URL: process.env.WHATOMATE_API_URL || "http://127.0.0.1:8080/api",
    WHATOMATE_API_KEY: process.env.WHATOMATE_API_KEY,
};
