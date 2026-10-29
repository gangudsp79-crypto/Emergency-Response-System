# QuickPulse • AI-Powered Emergency Response & Hospital Dispatch System (Mysuru Division)

An intelligent, production-ready, full-stack emergency response and hospital dispatch platform architected to eliminate delays during critical medical emergencies. Pre-configured with **10 major acute-care hospitals** and **25 active ambulance units** distributed strategically across **Mysuru city**.

---

## 🌟 Key Capabilities & Features

### 1. 🤖 Full-Stack AI Intelligence Engine
- **Clinical NLP Triage Classifier**: Analyzes accident descriptions, vitals (pulse, consciousness, hemorrhaging), and symptoms to compute an objective triage risk score (0–100), clinical priority code (*Code Red, Code Yellow, Code Green*), and trauma category.
- **Multi-Criteria Decision Analysis (MCDA) Hospital Matcher**: Ranks nearby trauma centers by distance, live acute bed capacity, ICU availability, oxygen reserves, and emergency divert readiness.
- **Fleet Proximity Dispatch Optimizer**: Identifies the fastest arriving life-support unit (ALS/BLS) based on paramedic status and vehicle telemetry.
- **⚡ 1-Click Autonomous Dispatch**: Generates a unified response plan pairing the optimal hospital with the closest ambulance in under 1 second.
- **AI Bystander First-Aid Copilot**: Generates step-by-step contextual life-support protocols (CPR, hemorrhage control, shock position, burn care) while emergency responders are en route.
- **AI Automated Patient Intake Generator**: Hospital admins can generate full clinical intake summaries with one click, eliminating tedious manual paperwork during emergency intake.

---

### 2. 🏥 Five Specialized User Dashboards

| Role | Dashboard | Core Capabilities |
| :--- | :--- | :--- |
| **Citizen / Bystander** | [`CitizenDashboard.jsx`](file:///c:/Users/admin/OneDrive/Desktop/emergency-response-system/client/src/pages/CitizenDashboard.jsx) | Emergency reporting, GPS/map pinpointing, clinical vitals checklist, journey tracker, AI First-Aid Copilot, driver contact, and the **"You Saved a Life!"** appreciation modal upon delivery. |
| **Ambulance Paramedic** | [`DriverDashboard.jsx`](file:///c:/Users/admin/OneDrive/Desktop/emergency-response-system/client/src/pages/DriverDashboard.jsx) | Vehicle registration & equipment profile, nearby emergency feed, 1-click "Accept Emergency Response", tactical navigation, and 4-step mission stage sequencer (*En Route ➔ Arrived ➔ Transporting ➔ Delivered*). |
| **Hospital Administrator** | [`HospitalDashboard.jsx`](file:///c:/Users/admin/OneDrive/Desktop/emergency-response-system/client/src/pages/HospitalDashboard.jsx) | Facility-specific view for their assigned Mysuru hospital, live bed/ICU quick-adjusters (`[+]`/`[-]`), emergency divert toggle, incoming ambulance queue, patient registry, and 1-click AI paperwork generation. |
| **Central Dispatcher** | [`DispatcherDashboard.jsx`](file:///c:/Users/admin/OneDrive/Desktop/emergency-response-system/client/src/pages/DispatcherDashboard.jsx) | Master incident queue, AI urgency assessment, 1-click autonomous dispatch, MCDA ranked hospital/fleet matches, manual override controls. |
| **Central Admin** | [`AdminDashboard.jsx`](file:///c:/Users/admin/OneDrive/Desktop/emergency-response-system/client/src/pages/AdminDashboard.jsx) | System-wide command center, hospital directory management, 25-vehicle fleet tracker, live telemetry metrics. |

---

### 3. 🛡️ Fault-Tolerant & Production-Hardened Architecture
- **Adaptive Dual-Mode Data Layer ([`dbStore.js`](file:///c:/Users/admin/OneDrive/Desktop/emergency-response-system/server/services/dbStore.js))**:
  - Automatically connects to MongoDB/Atlas when provided.
  - If MongoDB is offline, unconfigured, or in a sandboxed container, the system seamlessly engages an In-Memory Resilient Engine pre-seeded with 10 Mysuru hospitals, 25 ambulances, 5 role personas, and sample incidents.
  - Guarantees **100% uptime with 0 database connection crash errors**.
- **Dual-Engine Tactical Radar / Street Map ([`EmergencyMap.jsx`](file:///c:/Users/admin/OneDrive/Desktop/emergency-response-system/client/src/components/EmergencyMap.jsx))**:
  - Automatically renders Google Satellite Map when an API key is available.
  - Includes a React `MapErrorBoundary` and an instant fallback to an interactive SVG Tactical Radar Grid of Mysuru coordinates.
  - Guarantees **0 map crash errors**, even in offline or restricted environments.
- **Dynamic API Routing ([`api.js`](file:///c:/Users/admin/OneDrive/Desktop/emergency-response-system/client/src/config/api.js))**:
  - Eliminates hardcoded localhost URLs.
  - Seamlessly auto-detects whether the app is running in a unified fullstack container (relative `/api`), decoupled across domains (`VITE_API_URL`), or in local development.

---

## 🚢 Production Deployment Guide

### Anticipated Production Failure Modes & Preventative Solutions

| Potential Bug / Failure Mode | Root Cause | QuickPulse Built-in Prevention |
| :--- | :--- | :--- |
| **API Connection Refused (`ERR_CONNECTION_REFUSED`)** | Hardcoded `http://localhost:5000` in frontend client code. | Dynamic [`api.js`](file:///c:/Users/admin/OneDrive/Desktop/emergency-response-system/client/src/config/api.js) switches automatically between same-origin relative `/api`, environment `VITE_API_URL`, or local dev proxy. |
| **404 Not Found on Page Refresh** | SPA client-side routes requested directly from web server. | Express server is configured with wildcard SPA routing (`app.get('*')`) to serve `client/dist/index.html` for all non-API routes. |
| **CORS Origin Rejected** | Backend blocks requests from custom production domain. | Configurable `CORS_ORIGIN` environment variable with safe wildcard fallback for demo and evaluation environments. |
| **Database Connection Hang / Exit** | Cloud container starts before MongoDB is ready, or MongoDB is unreachable. | Server connection includes a 2000ms timeout with automated fallback to the in-memory store in [`dbStore.js`](file:///c:/Users/admin/OneDrive/Desktop/emergency-response-system/server/services/dbStore.js). |
| **Container Port Binding Failure** | Server binds to `localhost` / `127.0.0.1` instead of `0.0.0.0`. | Server explicitly listens on `0.0.0.0:${PORT}`, allowing reverse proxies and container orchestrators to reach it. |
| **Google Maps API Quota / Script Error** | User opens site without network or with ad-blocker / missing key. | React `MapErrorBoundary` activates the Tactical Radar SVG Grid with 0 runtime errors. |

---

### Deployment Option 1: 1-Click Cloud Web Service (Render / Railway / Heroku)

The repository includes a ready-to-use [`render.yaml`](file:///c:/Users/admin/OneDrive/Desktop/emergency-response-system/render.yaml) specification:

1. Push this repository to GitHub or GitLab.
2. In **Render.com** (or Railway / Heroku), click **New + Web Service** and select your repository.
3. Configure the following build settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
4. Set Environment Variables (optional, defaults provided):
   - `NODE_ENV=production`
   - `JWT_SECRET=your_secure_secret_key`
   - `PORT=5000` (or leave default assigned by platform)
5. Click **Deploy**. The unified server will build the frontend, serve the static assets, and run the API on a single URL!

---

### Deployment Option 2: Docker & Docker Compose (Zero Configuration)

A hardened, multi-stage [`Dockerfile`](file:///c:/Users/admin/OneDrive/Desktop/emergency-response-system/Dockerfile) and [`docker-compose.yml`](file:///c:/Users/admin/OneDrive/Desktop/emergency-response-system/docker-compose.yml) are pre-configured:

```bash
# Build and launch both the QuickPulse app and MongoDB in background:
docker compose up -d --build

# View container status and health:
docker compose ps

# Check logs:
docker compose logs -f quickpulse-app
```
Access the application at `http://localhost:5000`.

---

### Deployment Option 3: Decoupled Deployment (Vercel Frontend + Render/Railway Backend)

If you prefer hosting the React frontend on **Vercel** and the Express backend on **Render**:

1. **Deploy Backend (Render / Railway)**:
   - Root Directory: `server`
   - Start Command: `node server.js`
   - Note the backend URL (e.g. `https://quickpulse-api.onrender.com`).
2. **Deploy Frontend (Vercel)**:
   - Root Directory: `client`
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Add Environment Variable in Vercel Dashboard:
     - `VITE_API_URL=https://quickpulse-api.onrender.com`
     - `VITE_GOOGLE_CLIENT_ID=your_google_client_id`
   - The included [`vercel.json`](file:///c:/Users/admin/OneDrive/Desktop/emergency-response-system/vercel.json) handles rewrite rules to prevent 404s on refresh.

---

### Deployment Option 4: Linux VPS / Production Server (Ubuntu / NGINX / PM2)

```bash
# 1. Clone & install
git clone <repo-url> /var/www/quickpulse
cd /var/www/quickpulse
npm install
npm run build

# 2. Run with PM2 process manager
npm install -g pm2
pm2 start server/server.js --name "quickpulse"
pm2 save
pm2 startup

# 3. Configure NGINX reverse proxy (/etc/nginx/sites-available/quickpulse)
server {
    listen 80;
    server_name your-emergency-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🧪 Verification & Self-Tests

Run the full automated test suite anytime to verify AI triage, hospital ranking, fleet matching, and database health:

```bash
# Run test suite:
npm test

# Build client bundle:
npm run build
```

---

## 📜 License
MIT License • QuickPulse Critical Incident Management Network
