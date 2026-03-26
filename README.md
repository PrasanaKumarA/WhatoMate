# WhatoMate WhatsApp Bot Integration

A complete, production-ready Node.js integration that connects the **Meta WhatsApp Cloud API** with the **WhatoMate CRM Dashboard**.

This application acts as a middle-layer webhook that handles incoming WhatsApp messages, synchronizes the contacts and conversations to WhatoMate's Go backend in real-time, provides interactive menu flows, and uses OpenAI for intelligent conversational fallbacks.

## 🚀 Key Features & Development History

Over the course of development, this monolithic script was refactored into a scalable MVC API backend. Here are the core accomplishments of this integration:

### 1. MVC Architecture Refactoring
*   **From Monolith to Modular**: Refactored the original single-file `webhook.js` script into dedicated directories for Config, Controllers, Routes, and Services.
*   **Decoupled Services**: Split business logic into `crmService.js` (SQLite), `openaiService.js` (AI replies), `flowService.js` (menu routing), and `whatsappService.js` (Meta API communication).

### 2. WhatoMate CRM Synchronization
*   **Contact Sync Layer (`POST /api/contacts`)**: Dynamically creates Contacts in the CRM payload upon an inbound message. If the contact already exists (returns 409 Conflict), the system automatically performs a fallback `GET /api/contacts` lookup to resolve their internal UUID.
*   **Message Sync Layer (`POST /api/contacts/{id}/messages`)**: Developed a strict synchronization layer mapping Meta's incoming conversations and our bot's outgoing replies directly to the Go backend.
*   **Payload Troubleshooting**: Resolved extensive "Invalid request body" errors by correctly mapping the payload to the strict structure (`content` minimal body object) mandated by the WhatoMate backend, enabling successful ingestion of chat history.
*   **X-API-Key Authentication**: Implemented secure Header authorization against local UI requirements.

### 3. Local State & AI Fallbacks
*   **Local SQLite State**: Implemented `crm.db` to trace the history and context of interactions independently of WhatoMate.
*   **OpenAI Dynamic Replies**: Automatically intercepts free text that doesn't trigger standard Menus or Pricing, appending to local history to retain continuous contextual AI memory.

---

## 🏗️ Architecture & Structure

```text
whatomate/
├── src/
│   ├── config/              # Environment variables and configuration logic
│   ├── controllers/         # Webhook entry points (receives Meta payloads)
│   ├── routes/              # Express routing definitions
│   ├── services/
│   │   ├── crmService.js        # Local SQLite interaction state
│   │   ├── flowService.js       # Core chatbot logic and keyword routing
│   │   ├── openaiService.js     # AI wrapper and prompt management
│   │   ├── whatsappService.js   # Sending messages back via Meta API
│   │   └── whatomateService.js  # The vital CRM sync layer (POSTs to WhatoMate)
│   └── server.js            # Express server initialization
├── .env                     # Secrets (Meta, OpenAI, WhatoMate API)
├── package.json
└── README.md
```

---

## 🛠️ Prerequisites

1.  **Node.js** (v18+ recommended)
2.  **WhatoMate Backend**: Must be strictly running up and functioning locally (usually on port `8080`).
3.  **Meta Developer Account**: You need an active WhatsApp Business App with your `Phone Number ID` and a valid API Token.
4.  **Process Manager**: `pm2` installed globally (`npm install -g pm2`) for production runtime.

---

## ⚙️ Local Development Setup

### 1. Clone & Install
```bash
git clone https://github.com/PrasanaKumarA/WhatoMate.git
cd WhatoMate
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory and populate it with your credentials:
```env
PORT=3000

# Meta WhatsApp Configuration
WHATSAPP_TOKEN="your_meta_temporary_or_permanent_token"
WHATSAPP_PHONE_ID="11040... (your phone number ID)"
WHATSAPP_VERIFY_TOKEN="your_custom_verify_token"

# WhatoMate CRM Configuration
WHATOMATE_API_URL="http://127.0.0.1:8080/api"
WHATOMATE_API_KEY="whm_e14f8... (generate in WhatoMate UI -> Settings -> API Keys)"

# OpenAI (Optional - for AI fallbacks)
OPENAI_API_KEY="sk-..."
```

### 3. Required CRM Settings Configuration
For messages to successfully synchronize with the WhatoMate UI, **you must register your WhatsApp API credentials within WhatoMate**:
1. Open WhatoMate Dashboard (`localhost:8080`).
2. Navigate to **Settings → Accounts**.
3. Add your Meta App `Phone Number ID`, `WABA ID`, and your Meta API Token. *(If this is skipped, WhatoMate will reject message syncs with "Failed to resolve WhatsApp account".)*

### 4. Run the Application locally
Start the Node.js server to verify there are no crashes:
```bash
npm start
```
*The server will start on port `3000` and initialize the local SQLite database.*

---

## 🚀 Production Deployment Plan (Step-by-Step)

To deploy this application continuously, we will utilize `PM2` (Process Manager) to ensure the Node application stays alive 24/7, regenerates on crashing, and runs in the background.

### Step 1: Install Global PM2
Log into your hosted VPS environment (or keep your terminal open locally) and run:
```bash
npm install -g pm2
```

### Step 2: Source Code & Dependencies
Verify all dependencies are fetched inside the project folder:
```bash
cd /path/to/whatomate
npm install --production
```

### Step 3: Configure SQLite Database Permissions
SQLite requires read/write permissions at the directory level where `crm.db` sits. Make sure the executing pm2 user owns the root directory to avoid `CANTOPEN` errors:
```bash
chmod 775 .
chmod 664 crm.db
```

### Step 4: Start the API with PM2
Launch the server naming the process `whatomate-bot`:
```bash
pm2 start src/server.js --name "whatomate-bot"
```

### Step 5: Start PM2 on Reboot (Optional but Recommended)
To preserve the webhooks surviving server reboots:
```bash
pm2 startup
pm2 save
```

### Step 6: Reverse Proxy Configuration (Nginx)
Webhooks from Meta **require HTTPS** in production. 
Install Nginx and configure a proxy pass directing traffic strictly from your public SSL-protected domain to internal Port `3000`.

Sample `/etc/nginx/sites-available/whatomate` block:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Use `certbot` to generate a free SSL certificate for this block:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### Step 7: Update Meta Verification
Return to the Meta App Dashboard and update the Webhook URL to: 
`https://yourdomain.com/webhook`

---
### Command Reference for Maintainers
*   `pm2 restart whatomate-bot` - Restarts the system
*   `pm2 logs whatomate-bot` - Monitor live debugging and HTTP interactions
*   `pm2 stop whatomate-bot` - Graceful shutdown

*Maintained exclusively by PrasanaKumarA.*
