// background.ts

let companionWindowId: number | null = null;

// Handle Popup Creation
chrome.action.onClicked.addListener(async () => {
    if (companionWindowId !== null) {
        try {
            const win = await chrome.windows.get(companionWindowId);
            if (win.id) {
                await chrome.windows.update(win.id, { focused: true, drawAttention: true });
                return;
            }
        } catch (error) {
            companionWindowId = null;
        }
    }

    try {
        const win = await chrome.windows.create({
            url: "popup.html",
            type: "popup",
            width: 450,
            height: 700
        });
        if (win?.id) companionWindowId = win.id;
    } catch (err) {
        console.error("Failed to create VibeCheck window:", err);
    }
});

chrome.windows.onRemoved.addListener((windowId: number) => {
    if (windowId === companionWindowId) companionWindowId = null;
});

// Listener for Content Script completion
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
    if (message.type === 'RECORDING_COMPLETE') {
        console.log(`VibeCheck (BG): Successfully received session data.`);
        console.log(`VibeCheck (BG): Events Captured: ${message.events?.length || 0}`);

        // This is where we will eventually save to local storage or background-sync to the server
        // if the popup was closed before completion.
    }
});