# VibeCheck 🕵️‍♂️✨

**The First AI User Researcher**

VibeCheck is an autonomous AI agent powered by **Gemini 3** that conducts live user interviews while users test your web application. It sees what they see, hears what they say, and speaks up when they struggle.

Instead of just recording sessions, VibeCheck:
*   **Actively Intervenes:** Detects user confusion and asks clarifying questions in real-time.
*   **Autonomously Reports:** Generates Jira/Trello tickets with session context.
*   **Writes Code:** Automatically generates a **Playwright** reproduction script for every bug found.

## 🏗 System Architecture

VibeCheck consists of three main components:

1.  **Extension (The Eyes & Ears):** A Firefox extension (React/Vite) that captures the screen (`rrweb`), audio, and user interactions.
2.  **Backend (The Brain):** A NestJS server that orchestrates the Gemini 3 Multimodal session, manages real-time streams via WebSockets, and handles job queues for artifact generation.
3.  **Frontend (The Dashboard):** A Next.js application for developers to manage missions, view live sessions, and analyze bug reports.

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18+)
*   Redis (for job queues)
*   Google Gemini API Key

### 1. Backend Setup

The backend handles the core logic and AI integration.

```bash
cd backend

# Install dependencies
npm install

# Configure Environment Variables
# Create a .env file based on your configuration requirements
# Required: GEMINI_API_KEY, REDIS_URL, etc.

# Start the development server
npm run start:dev
```

The server usually runs on `http://localhost:5000`.

### 2. Frontend (Dashboard) Setup

The dashboard is where you create missions and view results.

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend usually runs on `http://localhost:3000`.

### 3. Extension Setup

The browser extension is the client-facing tool.

```bash
cd extension

# Install dependencies
npm install

# Build the extension
npm run build
# OR for local development with watch mode
npm run build:local
```

**Loading into Firefox:**
1.  Open Firefox and navigate to `about:debugging`.
2.  Click **"This Firefox"**.
3.  Click **"Load Temporary Add-on..."**.
4.  Navigate to `extension/dist` and select the `manifest.json` file.

## 💡 Usage

1.  **Start a Mission:** Go to the Frontend Dashboard and create a new testing "Mission" (e.g., "Guest Checkout Flow").
2.  **Open the Extension:** specific the URL you want to test.
3.  **Connect:** Open the VibeCheck extension popup and connect to the mission.
4.  **Test & Talk:** Use the website normally. Explain your thoughts aloud. If you get stuck or find a bug, say so.
5.  **Let AI Do the Rest:** VibeCheck will interview you, capture the evidence, and generate a bug report + reproduction script automatically.

## 🛠 Tech Stack

*   **AI:** Gemini 3 Multimodal Live API
*   **Backend:** NestJS, Socket.IO, BullMQ, Redis, TypeORM
*   **Frontend:** Next.js, TailwindCSS, Shadcn/UI
*   **Extension:** Vite, React, CRXJS, rrweb
*   **Testing/Reproduction:** Playwright
