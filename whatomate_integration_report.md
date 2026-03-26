# WhatoMate WhatsApp Bot Integration Report

## 1. Project Overview
This project integrates the **Meta WhatsApp Cloud API** with a custom **Node.js (Express)** backend and synchronizes all conversational data (Contacts & Messages) to the **WhatoMate CRM Dashboard**.

**Core Technologies:**
*   **Backend:** Node.js, Express, Axios
*   **Database:** SQLite (Local CRM / Session handling)
*   **AI:** OpenAI API (Context-aware conversational auto-replies)
*   **CRM Dashboard:** WhatoMate (Go platform, running locally on port `8080`)
*   **Tunneling:** Ngrok (Exposing port `3000` to Meta Webhooks)

---

## 2. System Architecture

*   **Meta Webhook:** Receives incoming messages from users (`POST /webhook`).
*   **Webhook Controller:** Parses the Meta payload and hands off to the Local CRM and Flow Router.
*   **Flow Service:** Handles keyword routing (`Menu`, `Pricing`, `Contact`) and falls back to OpenAI for dynamic AI replies.
*   **WhatoMate Service:** A critical sync layer. Every interaction is synchronized to the WhatoMate dashboard via the `POST /api/contacts` and `POST /api/contacts/{id}/messages` endpoints.

---

## 3. Directory Structure (MVC Refactor)
The project was refactored from a monolithic `webhook.js` into an MVC structure for scalability:

```text
whatomate/
├── src/
│   ├── config/
│   │   └── index.js                 # Environment & Config loading
│   ├── controllers/
│   │   └── webhookController.js     # Express routes for Meta Webhooks
│   ├── routes/
│   │   └── webhookRoutes.js         # Router bindings
│   ├── services/
│   │   ├── crmService.js            # SQLite local state management
│   │   ├── flowService.js           # Chatbot logic and dynamic menus
│   │   ├── openaiService.js         # AI auto-replies with session context
│   │   ├── whatsappService.js       # Outbound calls to Meta API
│   │   └── whatomateService.js      # Two-way sync with WhatoMate Dashboard
│   └── server.js                    # Entry point & DB initialization
├── .env                             # Secrets (Meta, OpenAI, WhatoMate API)
└── package.json
```

---

## 4. Key Integration Workflows

### WhatoMate Dashboard Syncing
When a user sends a message, we must ensure it appears in the **WhatoMate UI** alongside the chatbot's automated replies.

#### A. Contact Synchronization
We first ensure the user exists in WhatoMate. We capture their WhatsApp name and Phone Number.
```javascript
// POST /api/contacts
const payload = { 
    phone_number: phone, 
    name: name 
};
```
If the contact already exists (returns `409` or "already exists"), we gracefully fall back to a `GET` request query (`GET /api/contacts?phone_number=...`) to safely extract their internal WhatoMate UUID.

#### B. Message Synchronization
Once the UUID is resolved, the message payload is synced to WhatoMate. 
```javascript
// POST /api/contacts/{contactId}/messages
const payload = { 
    content: textContent, 
    direction: "inbound"  // or "outbound" for bot replies
};
```

---

## 5. Core Source Code

### `webhookController.js` (Snippet)
The controller parses Meta's incoming JSON payload, saves the user to local SQLite, and pushes the interaction to WhatoMate before calling the chatbot flow.
```javascript
// 🔥 Sync Contact + Message to WhatoMate Dashboard
const whatomateContactId = await whatomateService.syncIncoming(
    fromPhone, contactName, textContent
);

// Call the flow router (pass whatomateContactId so bot replies can also be synced)
await flowService.handleIncomingMessage(fromPhone, message, user, whatomateContactId);
```

### `whatomateService.js` (Snippet)
The service layer handling robust fallback payloads and strict authentication.
```javascript
async _postMessage(contactId, content, direction) {
    const url = `${this.apiUrl}/contacts/${contactId}/messages`;
    const safeText = content || "[No text]";
    
    // Minimal Payload requested by CRM
    const payload = { 
        content: safeText, 
        direction: direction
    };

    try {
        const response = await axios.post(url, payload, { 
            headers: {
                'X-API-Key': config.WHATOMATE_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        // Fallback catch implementations...
        throw new Error(`Message sync failed.`);
    }
}
```

---

## 6. WhatoMate Settings & Requirements

For the message sync to succeed gracefully, **WhatoMate demands that the host WhatsApp account is registered within its own application**. Otherwise, it throws `Failed to resolve WhatsApp account` or `Invalid request body` on message insertion.

**Configuration Requirement for UI:** 
1. Navigate to WhatoMate Dashboard (`localhost:8080`)
2. Settings → Accounts / Channels
3. Add the WhatsApp API credentials (`Phone Number ID`, `WABA ID`, and `Token`).

### Visual Proof of Operation
Below are screenshots capturing the contact creation flow inside the WhatoMate Dashboard during our testing:

#### Dashboard Overview
![Dashboard Overview](/home/prasana/.gemini/antigravity/brain/f62914fa-88af-4b2c-9535-66c445cc83fe/media__1774532732646.png)

#### Contacts Synced to CRM
![Contacts Synced to CRM](/home/prasana/.gemini/antigravity/brain/f62914fa-88af-4b2c-9535-66c445cc83fe/media__1774533067639.png)

#### API Authorization Layer
![API Key Interface](/home/prasana/.gemini/antigravity/brain/f62914fa-88af-4b2c-9535-66c445cc83fe/media__1774528134548.png)

---
*Generated by the Backend Engineering Team to summarize the WhatoMate webhooks and middleware integration layer.*
