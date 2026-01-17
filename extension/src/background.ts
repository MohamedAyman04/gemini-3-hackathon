// background.ts

let companionWindowId: number | null = null;

// 1. Listen for the browser action (toolbar icon) click
chrome.action.onClicked.addListener(async () => {
    if (companionWindowId !== null) {
        try {
            // Check if the window still truly exists
            const win = await chrome.windows.get(companionWindowId);

            // If it does, bring it to the front instead of opening a new one
            if (win.id) {
                await chrome.windows.update(win.id, {
                    focused: true,
                    drawAttention: true
                });
                return;
            }
        } catch (error) {
            // If .get() throws, the window was closed manually by the user
            companionWindowId = null;
        }
    }

    // 2. Create the "App-like" Pop-out Window
    try {
        const win = await chrome.windows.create({
            url: "popup.html",     // Entry point of your React App
            type: "popup",         // "popup" removes the address bar/bookmarks
            width: 450,
            height: 700
            //   titlePreface: "VibeCheck Companion"
        });

        if (win?.id) {
            companionWindowId = win.id;
        }
    } catch (err) {
        console.error("Failed to create VibeCheck window:", err);
    }
});

// 3. Clean up the ID when the window is closed
chrome.windows.onRemoved.addListener((windowId: number) => {
    if (windowId === companionWindowId) {
        companionWindowId = null;
    }
});