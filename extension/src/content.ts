let events: any[] = [];
let stopFn: (() => void) | undefined;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'START_RECORDING') {
        console.log("VibeCheck: Starting rrweb recording");
        events = [];

        // Dynamic import to avoid top-level export bundling issues
        (async () => {
            try {
                const rrweb = await import('rrweb');
                stopFn = rrweb.record({
                    emit(event: any) {
                        events.push(event);
                    },
                    recordCanvas: true,
                    collectFonts: true
                });
                console.log("VibeCheck: rrweb started");
            } catch (e) {
                console.error("VibeCheck: Failed to load rrweb", e);
            }
        })();

        sendResponse({ status: 'started' });
    } else if (message.type === 'STOP_RECORDING') {
        console.log("VibeCheck: Stopping rrweb recording");
        if (stopFn) {
            stopFn();
            stopFn = undefined;
        }
        sendResponse({ status: 'stopped', events: events });
    }
    return true; // Keep channel open
});