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

    /**
     * Extract contact ID robustly from any recognized response shape.
     * Confirmed real shape from /api/contacts GET:
     *   { status: 'success', data: { contacts: [ { id: '...uuid...' } ] } }
     */
    _extractContactId(data) {
        console.log('[DEBUG] Extracting contactId from:', JSON.stringify(data, null, 2));

        // POST create response: { data: { id: '...' } }
        if (data?.data?.id) return data.data.id;

        // GET list response: { data: { contacts: [ { id: '...' } ] } }
        if (data?.data?.contacts?.[0]?.id) return data.data.contacts[0].id;

        // Fallback: flat array { data: [ { id: '...' } ] }
        if (Array.isArray(data?.data) && data.data[0]?.id) return data.data[0].id;

        // Fallback: direct id at root
        if (data?.id) return data.id;

        return null;
    }

    /**
     * GET /api/contacts?phone_number=... and extract the contact ID
     */
    async _fetchContactByPhone(phone) {
        const url = `${this.apiUrl}/contacts?phone_number=${phone}`;
        console.log(`[DEBUG] Fetching contact: GET ${url}`);

        const fetchRes = await axios.get(url, { headers: this.headers });
        console.log('[DEBUG] Contact fetch response:', JSON.stringify(fetchRes.data, null, 2));

        const contactId = this._extractContactId(fetchRes.data);
        if (!contactId) {
            throw new Error(`Contact ID not found in response: ${JSON.stringify(fetchRes.data)}`);
        }
        return contactId;
    }

    /**
     * POST /api/contacts — create or fallback to fetch if already exists
     */
    async createOrFetchContact(phone, name) {
        if (!this.apiUrl || !config.WHATOMATE_API_KEY) {
            console.warn('⚠️ WhatoMate API config missing. Skipping sync.');
            return null;
        }

        const url = `${this.apiUrl}/contacts`;
        const payload = { phone_number: phone, name: name };
        console.log(`[DEBUG] POST ${url} payload:`, payload);

        try {
            const response = await axios.post(url, payload, { headers: this.headers });
            console.log('[DEBUG] Contact create response:', JSON.stringify(response.data, null, 2));
            const contactId = this._extractContactId(response.data);
            if (!contactId) throw new Error('Contact ID not found after creation');
            return contactId;
        } catch (error) {
            const errData = error.response?.data || error.message;
            console.log('[DEBUG] Contact create error response:', JSON.stringify(errData, null, 2));

            const errMsg = (typeof errData === 'object' ? errData?.message : errData) || '';
            const isConflict = error.response?.status === 409 ||
                errMsg.toLowerCase().includes('already exists') ||
                errMsg.toLowerCase().includes('duplicate');

            if (isConflict) {
                console.log('[DEBUG] Contact exists. Fetching by phone...');
                return await this._fetchContactByPhone(phone);
            }

            throw new Error(`Failed to create contact: ${JSON.stringify(errData)}`);
        }
    }

    /**
     * POST /api/contacts/{id}/messages
     */
    async _postMessage(contactId, content, direction) {
        const url = `${this.apiUrl}/contacts/${contactId}/messages`;
        
        const safeText = content || "[No text]";
        
        // 1. Try FIRST requested payload (minimal content)
        // 1. Try FIRST requested payload (Nested content object with type)
        const payload1 = { 
            type: 'text',
            content: {
                body: safeText
            },
            direction: direction
        };
        
        console.log(`[DEBUG] POST ${url} payload:`, JSON.stringify(payload1));
        console.log(`[DEBUG] typeof content body:`, typeof safeText);

        try {
            const response = await axios.post(url, payload1, { headers: this.headers });
            console.log('[DEBUG] Message API response:', JSON.stringify(response.data, null, 2));
            console.log(`✅ Synced ${direction} message to WhatoMate`);
            return response.data;
        } catch (error) {
            const errData1 = error.response?.data || error.message;
            console.error(`⚠️ Payload 1 failed:`, JSON.stringify(errData1));
            
            // 2. Try SECOND payload (Flat structure with type)
            const payload2 = {
                type: 'text',
                body: safeText,
                direction: direction
            };
            console.log(`[DEBUG] Retrying with payload 2:`, JSON.stringify(payload2));
            
            try {
                const response2 = await axios.post(url, payload2, { headers: this.headers });
                console.log('[DEBUG] Message API response:', JSON.stringify(response2.data, null, 2));
                console.log(`✅ Synced ${direction} message to WhatoMate (payload2)`);
                return response2.data;
            } catch (error2) {
                const errData2 = error2.response?.data || error2.message;
                console.error(`❌ WhatoMate Message Sync Error (Both payloads failed) [${direction}]:\n`, JSON.stringify(errData2, null, 2));
                throw new Error(`Message sync failed: ${JSON.stringify(errData2)}`);
            }
        }
    }

    /**
     * Sync an incoming (user → bot) message to WhatoMate
     * Returns contactId for use in outgoing message sync
     */
    async syncIncoming(phone, name, textContent) {
        try {
            console.log('\n--- WhatoMate: Syncing Incoming ---');
            const contactId = await this.createOrFetchContact(phone, name);
            if (!contactId) throw new Error('Could not resolve contact ID');

            if (textContent) {
                await this._postMessage(contactId, textContent, 'inbound');
            }
            return contactId;
        } catch (error) {
            console.error(`❌ WhatoMate Incoming Sync Failed: ${error.message}`);
            return null;
        }
    }

    /**
     * Sync an outgoing (bot → user) reply to WhatoMate
     */
    async sendOutgoingMessage(contactId, message) {
        try {
            console.log('\n--- WhatoMate: Syncing Outgoing ---');
            if (!contactId) { console.warn('⚠️ Skipping outgoing sync: no contactId'); return; }
            if (!message) return;
            await this._postMessage(contactId, message, 'outbound');
        } catch (error) {
            console.error(`❌ WhatoMate Outgoing Sync Failed: ${error.message}`);
        }
    }
}

module.exports = new WhatomateService();
