// content.ts
// This runs in the ISOLATED WORLD
// It manages UI, bridges communication, and handles recording using rrweb.

console.log("VibeCheck (Isolated): Content script loaded.");

let statusIndicator: HTMLDivElement | undefined;
let events: any[] = [];
let eventCount = 0;
let lastType = '';
let lastUIUpdateTime = 0;
let updatePending = false;
let stopFn: (() => void) | undefined;

/**
 * Throttled UI update for the on-screen counter
 */
const requestUIUpdate = (typeName: string) => {
    eventCount++;
    lastType = typeName;

    const now = Date.now();
    if (updatePending || (now - lastUIUpdateTime < 500)) return;

    updatePending = true;
    requestAnimationFrame(() => {
        const countEl = document.getElementById('vibecheck-event-count');
        const lastEl = document.getElementById('vibecheck-last-event');
        if (countEl) countEl.textContent = eventCount.toLocaleString();
        if (lastEl) lastEl.textContent = `Last: ${lastType}`;
        lastUIUpdateTime = Date.now();
        updatePending = false;
    });
};

const showStatusIndicator = () => {
    if (statusIndicator) return;
    statusIndicator = document.createElement('div');
    statusIndicator.id = 'vibecheck-status';
    statusIndicator.className = 'rr-ignore rr-block';
    statusIndicator.setAttribute('data-rr-ignore', 'true');
    statusIndicator.style.cssText = `
        position: fixed; top: 10px; right: 10px; z-index: 2147483647;
        background: rgba(15, 15, 20, 0.9); color: #a855f7; padding: 10px 14px;
        border-radius: 10px; font-family: sans-serif; font-size: 11px;
        border: 1px solid rgba(124, 58, 237, 0.4); pointer-events: none;
        display: flex; flex-direction: column; gap: 4px; backdrop-filter: blur(8px);
        box-shadow: 0 8px 32px rgba(0,0,0,0.5); min-width: 150px;
    `;
    statusIndicator.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; font-weight: 700;">
            <div style="width: 10px; height: 10px; background: #ef4444; border-radius: 50%;"></div>
            <span>VIBECHECK LIVE</span>
        </div>
        <div style="color: #9ca3af; font-size: 10px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 6px; margin-top: 2px;">
            Captured: <span id="vibecheck-event-count" style="color: #a855f7; font-weight: bold;">0</span>
            <div id="vibecheck-last-event" style="font-size: 9px; opacity: 0.5; margin-top: 1px;">Ready...</div>
        </div>
    `;
    document.body.appendChild(statusIndicator);
};

const hideStatusIndicator = () => {
    if (statusIndicator) {
        statusIndicator.remove();
        statusIndicator = undefined;
    }
    eventCount = 0;
};

let rrwebModule: any;

const startRecording = async () => {
    console.log("VibeCheck (Isolated): Initiating rrweb record");
    events = [];
    eventCount = 0;
    let eventQueue: any[] = [];

    if (stopFn) {
        stopFn();
        stopFn = undefined;
    }

    try {
        rrwebModule = await import('rrweb');

        // Identify session start for syncing

        // Batch sender
        const batchInterval = setInterval(() => {
            if (eventQueue.length > 0) {
                const batch = [...eventQueue];
                eventQueue = [];
                extensionAPI.runtime.sendMessage({
                    type: 'RRWEB_EVENTS',
                    events: batch
                }).catch(() => {
                    // Ignore errors if popup is closed, events are still saved in main 'events' array
                });
            }
        }, 500);

        const instanceStopFn = rrwebModule.record({
            emit(event: any) {
                events.push(event);
                eventQueue.push(event);

                // Directly update UI
                const typeMap: any = { 0: 'DOM', 1: 'LOAD', 2: 'SNAP', 3: 'INCR', 4: 'META', 5: 'CUST' };
                requestUIUpdate(typeMap[event.type] || 'EVT');
            },
            recordCanvas: false,
            collectFonts: false,
            blockClass: 'rr-block',
            ignoreClass: 'rr-ignore',
            sampling: {
                mousemove: true, // Enabled for "Vibe" detection
                scroll: 150, // More frequent scroll updates
                input: 'last'
            },
            slimDOMOptions: {
                script: true,
                comment: true,
                headFavicon: true,
                headWhitespace: true
            }
        });

        stopFn = () => {
            if (instanceStopFn) instanceStopFn();
            clearInterval(batchInterval);
        };

    } catch (err) {
        console.error("VibeCheck (Isolated): Error starting rrweb", err);
    }
};

const getExtensionAPI = () => {
    // @ts-ignore
    return globalThis.chrome || globalThis.browser;
};

const extensionAPI = getExtensionAPI();

if (extensionAPI) {
    // Listen for messages from the Extension (Popup/Background)
    extensionAPI.runtime.onMessage.addListener((message: any, _sender: any, sendResponse: any) => {
        if (message.type === 'START_RECORDING') {
            console.log("VibeCheck (Isolated): Received START command");
            showStatusIndicator();
            startRecording();
            sendResponse({ status: 'started' });
        } else if (message.type === 'FORCE_SNAPSHOT') {
            console.log("VibeCheck (Isolated): Forcing Snapshot");
            if (rrwebModule) {
                rrwebModule.record.takeFullSnapshot();
                sendResponse({ status: 'snapshot_taken' });
            } else {
                sendResponse({ status: 'error', message: 'Recorder not ready' });
            }
        } else if (message.type === 'STOP_RECORDING') {
            console.log("VibeCheck (Isolated): Received STOP command");

            if (stopFn) {
                stopFn();
                stopFn = undefined;
            }

            console.log(`VibeCheck (Isolated): Captured ${events.length} events`);
            hideStatusIndicator();

            // Push data to Background script asynchronously
            // We use sendMessage because the payload might be large and we want to ensure it reaches background
            extensionAPI.runtime.sendMessage({
                type: 'RECORDING_COMPLETE',
                events: events
            });

            // Respond to the specific caller (e.g. popup)
            sendResponse({ status: 'stopped', events: events });
        }
        return true; // Keep channel open for async response
    });

} else {
    console.error("VibeCheck (Isolated): CRITICAL - No Extension API found (chrome/browser undefined). Check execution context.");
}