const axios = require('axios');
const config = require('../config');

class WhatomateService {
    constructor() {
        this.apiUrl = config.WHATOMATE_API_URL;
        this.headers = {
            'Content-Type': 'application/json',
            'Authorization': config.WHATOMATE_API_KEY,
            'X-API-Key': config.WHATOMATE_API_KEY
        };
    }

    _extractContactId(data) {
        if (data?.data?.id) return data.data.id;
        if (data?.data?.contacts?.[0]?.id) return data.data.contacts[0].id;
        if (Array.isArray(data?.data) && data.data[0]?.id) return data.data[0].id;
        if (data?.id) return data.id;
        return null;
    }

    async _fetchContactByPhone(phone) {
        try {
            const url = `${this.apiUrl}/contacts?phone_number=${phone}`;
            const fetchRes = await axios.get(url, { headers: this.headers });
            const contactId = this._extractContactId(fetchRes.data);
            if (!contactId) {
                console.error(`[WhatoMate] Contact ID not found in GET response for ${phone}`);
                return null;
            }
            return contactId;
        } catch (error) {
            console.error(`[WhatoMate] Failed to fetch contact for ${phone}:`, error.message);
            return null;
        }
    }

    async createOrFetchContact(phone, name) {
        if (!this.apiUrl || !config.WHATOMATE_API_KEY) {
            console.warn('[WhatoMate] API config missing. Skipping contact sync.');
            return null;
        }

        const url = `${this.apiUrl}/contacts`;
        const payload = { phone_number: phone, name: name || 'User' };

        try {
            const response = await axios.post(url, payload, { headers: this.headers });
            const contactId = this._extractContactId(response.data);
            if (contactId) return contactId;
            throw new Error('Contact ID missing in create response');
        } catch (error) {
            const errData = error.response?.data || error.message;
            const errMsg = (typeof errData === 'object' ? errData?.message : errData) || '';
            const isConflict = error.response?.status === 409 ||
                errMsg.toLowerCase().includes('already exists') ||
                errMsg.toLowerCase().includes('duplicate');

            if (isConflict) {
                return await this._fetchContactByPhone(phone);
            }
            console.error(`[WhatoMate] Error creating contact:`, JSON.stringify(errData));
            return null;
        }
    }

    async sendMessage(contactId, content, direction) {
        if (!contactId) {
            console.error(`[WhatoMate] Cannot send message: Missing contactId`);
            return null;
        }

        const url = `${this.apiUrl}/contacts/${contactId}/messages`;
        
        // Exact payload format expected by WhatoMate CRM
        const payload = {
            content: content || "[No text]",
            direction: direction
        };

        try {
            const response = await axios.post(url, payload, { headers: this.headers });
            console.log(`[WhatoMate] ✅ Synced ${direction} message successfully.`);
            return response.data;
        } catch (error) {
            console.error(`[WhatoMate] ❌ Sync Error [${direction}]:`, JSON.stringify(error.response?.data || error.message));
            return null;
        }
    }

    async syncIncoming(phone, name, textContent) {
        try {
            const contactId = await this.createOrFetchContact(phone, name);
            if (!contactId) {
                console.error(`[WhatoMate] Could not resolve contact ID for incoming sync`);
                return null;
            }

            if (textContent) {
                await this.sendMessage(contactId, textContent, 'inbound');
            }
            return contactId;
        } catch (error) {
            console.error(`[WhatoMate] ❌ Incoming Sync Failed:`, error.message);
            return null;
        }
    }

    async sendOutgoingMessage(contactId, message) {
        try {
            if (!message) return;
            await this.sendMessage(contactId, message, 'outbound');
        } catch (error) {
            console.error(`[WhatoMate] ❌ Outgoing Sync Failed:`, error.message);
        }
    }
}

module.exports = new WhatomateService();
