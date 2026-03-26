const whatsappService = require('./whatsappService');
const openaiService = require('./openaiService');
const crmService = require('./crmService');
const whatomateService = require('./whatomateService');

class FlowService {
    async handleIncomingMessage(fromPhone, messageObj, user, whatomateContactId = null) {
        try {
            // Only handle text messages for now. Ignore statuses, images, etc.
            if (messageObj.type !== 'text' && messageObj.type !== 'interactive') {
                await whatsappService.sendTextMessage(fromPhone, "Sorry, I can only understand text messages right now. 📷❌");
                return;
            }

            let text = "";
            if (messageObj.type === 'text') {
                text = messageObj.text.body;
            } else if (messageObj.type === 'interactive') {
                text = messageObj.interactive.button_reply.title;
            }

            const lowerText = text.toLowerCase().trim();
            console.log(`📩 Received from ${fromPhone}: ${text}`);

            // 1. Save user message to CRM context
            await crmService.saveMessage(fromPhone, 'user', text);

            // 2. Check for Keyword Flows
            if (lowerText === 'menu' || lowerText === 'help') {
                await this.sendMenu(fromPhone, whatomateContactId);
                return;
            }

            if (lowerText === 'pricing') {
                const reply = "Our pricing starts at $9/month. Reply *Menu* to see other options.";
                await whatsappService.sendTextMessage(fromPhone, reply);
                await crmService.saveMessage(fromPhone, 'bot', reply);
                await whatomateService.sendOutgoingMessage(whatomateContactId, reply);
                return;
            }

            if (lowerText === 'contact') {
                const reply = "You can reach us at support@whatomate.com!";
                await whatsappService.sendTextMessage(fromPhone, reply);
                await crmService.saveMessage(fromPhone, 'bot', reply);
                await whatomateService.sendOutgoingMessage(whatomateContactId, reply);
                return;
            }

            // 3. Fallback to OpenAI
            // Fetch last 5 messages for context
            const history = await crmService.getRecentMessages(fromPhone, 5);
            const aiReply = await openaiService.generateReply(text, history);

            // Send AI reply and save to DB
            await whatsappService.sendTextMessage(fromPhone, aiReply);
            await crmService.saveMessage(fromPhone, 'bot', aiReply);
            await whatomateService.sendOutgoingMessage(whatomateContactId, aiReply);

        } catch (error) {
            console.error("❌ FlowService Error:", error);
        }
    }

    async sendMenu(to, whatomateContactId = null) {
        const header = "Welcome to WhatoMate!";
        const body = "Please choose an option below:";
        const footer = "Powered by AI";
        const buttons = [
            { id: "btn_pricing", title: "Pricing" },
            { id: "btn_contact", title: "Contact" }
        ];

        await whatsappService.sendInteractiveButtons(to, header, body, footer, buttons);
        await crmService.saveMessage(to, 'bot', 'Sent Interactive Menu');
        await whatomateService.sendOutgoingMessage(whatomateContactId, '[Interactive Menu Sent]');
    }
}

module.exports = new FlowService();
