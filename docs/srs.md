# Software Requirements Specification (SRS)
**Project Name:** VibeCheck  
**Subtitle:** The Autonomous User Testing Agent  
**Date:** Jan 13, 2026 (Updated)  

## 1. Introduction

### 1.1 Purpose
This document defines the software requirements for **VibeCheck**, an autonomous AI-powered user testing agent. The system actively participates in live user testing sessions on *any* web application via a browser extension, detects user confusion in real-time, and automatically generates reproducible bug reports (Playwright scripts) and GitHub issues.

### 1.2 Scope
VibeCheck operates as a **Firefox Extension** companion. Unlike traditional session replay tools (Passive), VibeCheck is **Active**:
*   It **sees** what the user sees (Screen + DOM).
*   It **hears** the user and detects frustration ("Ugh", "Why isn't this working?").
*   It **speaks** to the user ("I noticed you clicked that 5 times, is it stuck?").
*   It **reproduces** the bug by generating and running a test script in the background.

## 2. Internal Architecture & Definitions

### 2.1 Operating Environment
*   **Frontend**: Firefox Extension (React + Vite). Uses `action` (popup) for UI and `content_scripts` for DOM access.
*   **Backend**: NestJS (Node.js). Handles real-time streams and job orchestration.
*   **AI Engine**: 
    *   **Gemini Multimodal Live**: For real-time "Vibe" check and voice interaction.
    *   **Gemini 2.0 Flash/Pro**: For reasoning over logs and generating code.
*   **Infrastructure**: Redis (Queues), Docker (Sandboxed Execution), Postgres (Persistence).

## 3. System Features & Functional Requirements


### 3.1 Mission Initialization (The Companion)
*   **FR-1: Shared Authentication**: The extension shall automatically detect the user's session from the web dashboard cookies, eliminating the need for a separate login.
*   **FR-2: Companion Window UI**: The system shall present a separate Popup Window for checking status, selecting the active Project/App ID, and toggling mute/privacy.
*   **FR-3: Context Awareness**: The system shall analyze the page title and initial DOM to understand the "context" of the test (e.g., "This is an E-commerce Checkout flow").

### 3.2 Live Multimodal Observation (The Eyes & Ears)
*   **FR-4: DOM Recording**: The system shall use `rrweb` to maintain a continuous, lightweight circular buffer (last 2-5 minutes) of DOM mutations.
*   **FR-5: High-Fidelity Capture**: The system shall use `tabCapture` to record high-quality video for *human* review and archival.
*   **FR-6: AI-Optimized Streaming**:
    *   **Audio**: Continuous low-latency stream to Gemini for intent/emotion detection.
    *   **Visual**: Random-access screenshots or low-FPS (1 FPS) feed to Gemini to provide visual context without excessive token usage.
    *   **FR-6.5: User Camera Capture**: The system shall capture the user's camera (face) to analyze facial expressions and sentiment, providing a more complete picture of user frustration in addition to screen activity.

### 3.3 Real-Time Autonomous Intervention (The Brain)
*   **FR-7: Emotion & Intent Detection**: The system shall utilize Gemini Live to detect tonal changes (frustration) AND explicit voice commands ("This button is broken", "Flag this bug").
*   **FR-8: Heuristic Detection**: The system shall locally detect rage-clicking or rapid scrolling via the DOM event stream.
*   **FR-9: Empathetic Interruption**: The system shall verbally intervene ("Hey, I see you're struggling there...") when thresholds are met, using TTS (Text-to-Speech).

### 3.4 Artifact Generation (The Engineer)
*   **FR-10: The "Hurdle" Packet**: Upon trigger (Manual, Voice, or Heuristic), the system shall bundle:
    *   The last `N` minutes of `rrweb` events (The "Black Box").
    *   The High-Fidelity Video/Audio buffer.
    *   The Gemini Transcript of the session.
*   **FR-11: Script Generation**: The system shall prompt an LLM to specifically convert the `rrweb` JSON sequence into a **Playwright (TypeScript)** test script.
*   **FR-12: Auto-Verification**: The system shall spin up a headless browser container and execute the generated script.
    *   If the script relies on a specific state, it should attempt to reach that state or flag as "Needs Setup".

### 3.5 Reporting (The Secretary)
*   **FR-13: GitHub Integration**: The system shall authenticate with GitHub and create Issues with:
    *   **Title**: Generated summary of the bug.
    *   **Body**: Steps to reproduce + Link to Dashboard entry.
    *   **Attachments**: The `.spec.ts` reproduction file.

---

## 4. Non-Functional Requirements
*   **NFR-1: Latency**: Voice-to-voice response time should be under <2 seconds to feel natural.
*   **NFR-2: Privacy**: The extension must show a clear "Recording" indicator.
*   **NFR-3: Performance**: DOM recording `rrweb` must not degrade the performance of the target website (use throttling/sampling if needed).
