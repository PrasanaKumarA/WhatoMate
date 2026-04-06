const { OpenAI } = require('openai');
const config = require('../config');

class OpenAIService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: config.OPENAI_API_KEY,
            baseURL: 'https://integrate.api.nvidia.com/v1',
        });

        this.systemPrompt = `
You are a helpful WhatsApp assistant for a business called WhatoMate.
Keep your responses concise, friendly, and formatted nicely for WhatsApp (use emojis, *bold*, _italics_ where appropriate).
If you don't know the answer, politely say so.
        `;
    }

    async generateReply(userMessage, contextMessages = []) {
        if (!config.OPENAI_API_KEY) {
            return "I am unable to process AI requests at the moment because my OpenAI API Key is missing. Please contact the administrator.";
        }

        try {
            const messages = [
                { role: "system", content: this.systemPrompt },
            ];

            // Add history
            contextMessages.forEach(msg => {
                messages.push({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.content
                });
            });

            // Add current message
            messages.push({ role: "user", content: userMessage });

            const response = await this.openai.chat.completions.create({
                model: "meta/llama-3.1-8b-instruct",
                messages: messages,
                max_tokens: 150,
                temperature: 0.7
            });

            return response.choices[0].message.content.trim();
        } catch (error) {
            console.error("❌ OpenAI Error:", error.message);
            return "Sorry, I'm having trouble connecting to my AI brain right now. 🧠⚡";
        }
    }
}

module.exports = new OpenAIService();
