# VibeCheck: The First AI User Researcher

## Inspiration
The inspiration for VibeCheck came from the grueling, repetitive nature of full-stack development testing. We realized that traditional user testing is slow, disconnected, and often results in vague bug reports that developers struggle to reproduce. We wanted to bridge the gap between user frustration and developer action, inspired by how Gemini 3’s multimodal capabilities could transform a passive logging tool into an active, empathetic listener and researcher.

## What it does
VibeCheck is an AI User Researcher that conducts live, autonomous interviews with users while they test your web application.
*   **Live Observation**: It watches the user's screen in real-time while actively listening to their verbal feedback.
*   **Active Listening & Intervention**: Instead of relying on visual cues like facial expressions, VibeCheck listens for verbalized struggles or confusion. When a user creates a mission and starts talking through their process, the AI listens and speaks up to ask clarifying questions or offer guidance, gathering context that logs alone can't provide.
*   **Seamless Integration**: It connects directly with your existing project management tools, automatically creating tickets in Jira and Trello based on the session.
*   **Autonomous Engineering**: After the session, it bundles the session replay, logs, and transcript into a formatted GitHub issue and—crucially—writes a **Playwright test script** that mechanically reproduces the bug described by the user.

## How we built it
VibeCheck is a three-part system built on **NestJS (Backend)**, **Next.js (Dashboard)**, and a **Vite/React Browser Extension**.
*   **Gemini 3 Integration**: We utilized Gemini 3’s reduced latency and multimodal API to process audio streams (user voice) and screen telemetry (DOM mutations via **rrweb**). The model acts as the central "brain," reasoning across the user's spoken words and screen actions to trigger voice interventions.
*   **Real-Time Sync**: We used **Socket.IO** and **Redis** to synchronize the browser extension (capturing the session) with the live dashboard (broadcasting to the team).
*   **Agentic Workflow**: The backend uses **Playwright** programmatically. Once Gemini identifies a bug from the conversation, it feeds the DOM state and user actions into a secondary agent that generates and validates a reproduction script.

## Challenges we ran into
The biggest challenge was the **seamless integration** between the disparate parts of the application. Coordinating a browser extension, a real-time WebSocket server, and the Gemini API to act in unison was difficult. Specifically, reducing the latency between a user's verbal input and the AI's voice response required optimizing our event loop and audio chunking strategies. Ensuring `rrweb` replays were perfectly synchronized with the AI's analysis was also a significant technical hurdle.

## Accomplishments that we're proud of
We are most proud of the **seamless integration** between every part of the application and external APIs. From the browser extension capturing the session to the backend orchestrating Gemini 3, pulling in data from Jira and Trello, and pushing artifacts to GitHub—it all feels like one cohesive unit. The "Agentic Loop" is a particular highlight: the moment the AI hears a user struggle, it understands the context, validates the issue, and transforms a subjective complaint into an objective code artifact (a reproduction script). We are also proud of how robust the real-time architecture became, handling live audio and DOM streaming simultaneously.

## What we learned
We learned that **multimodal AI is not just a chatbot feature; it's a structural component.** By giving the AI "eyes" (screen) and "ears" (audio), we shifted from a text-based tool to a presence-based experience. We also learned the importance of **context window management**—feeding the model just enough DOM structure to understand the app without overwhelming it.

## What's next for VibeCheck
The immediate next step is **Autonomous Remediation**. Since VibeCheck already writes the reproduction test, the natural evolution is for it to attempt to fix the code, run the test against the fix, and automatically open a Pull Request if it passes. We also plan to deepen our integrations with Jira and Trello to further streamline the triage process.
