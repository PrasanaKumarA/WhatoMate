const config = require('../config');
const flowService = require('../services/flowService');
const crmService = require('../services/crmService');
const whatomateService = require('../services/whatomateService');

exports.verifyWebhook = (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === config.WHATSAPP_VERIFY_TOKEN) {
            console.log('✅ Webhook verified by Meta!');
            return res.status(200).send(challenge);
        } else {
            return res.sendStatus(403);
        }
    }
    return res.status(400).send("Bad Request");
};

exports.processMessage = async (req, res) => {
    try {
        const body = req.body;

        if (body.object === 'whatsapp_business_account') {
            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;
            const message = value?.messages?.[0];
            const contact = value?.contacts?.[0];

            if (message) {
                const fromPhone = message.from;
                const contactName = contact?.profile?.name || 'User';

                // Save or Fetch User in CRM
                let user = await crmService.getUser(fromPhone);
                if (!user) {
                    await crmService.createUser(fromPhone, contactName);
                    user = await crmService.getUser(fromPhone);
                }

                // 🔥 Sync Contact + Message to WhatoMate Dashboard
                let textContent = '';
                if (message.type === 'text') textContent = message.text.body;
                else if (message.type === 'interactive') textContent = message.interactive?.button_reply?.title || '';

                // 🔥 Fix: We MUST give flowService the contact ID so it can sync outbound replies.
                // However, we CANNOT use `syncIncoming` because that creates a forced "outgoing" message on the CRM,
                // causing the echo bug. Instead, we manually just fetch the contact ID without creating a message.
                const whatomateContactId = await whatomateService.createOrFetchContact(fromPhone, contactName);  

                // Call the flow router (pass whatomateContactId so replies can be synced too)
                await flowService.handleIncomingMessage(fromPhone, message, user, whatomateContactId);
            }
        }

        // Always return 200 OK so Meta doesn't retry
        return res.sendStatus(200);
    } catch (error) {
        console.error('❌ Error processing webhook:', error);
        return res.sendStatus(500);
    }
};
