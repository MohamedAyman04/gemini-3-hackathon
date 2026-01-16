// content.ts
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
    if (message.type === 'START_RECORDING') {
        console.log("Sir, yes sir! Starting recording...");
        // startRrweb(); // Your recording logic
    }
});