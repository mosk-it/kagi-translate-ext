const script = {
    id: "content-script",
    js: ["content-script.js"],
    matches: ["<all_urls>"],
};

async function toggleContentScript(action = "register") {
    try {
        if (action === "register") {
            await browser.scripting.registerContentScripts([script]);
        } else {
            await browser.scripting.unregisterContentScripts({ ids: [script.id] });
        }
    } catch (e) { console.log('register failed'); }
}

(async () => {
    const { openMinimalPopup } = await browser.storage.local.get("openMinimalPopup");
    await toggleContentScript(openMinimalPopup ? "register" : "unregister");
})();


browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.openMinimalPopup) {
        toggleContentScript(changes.openMinimalPopup.newValue ? "register" : "unregister");
    }
});


browser.runtime.onMessage.addListener((data, sender, sendResponse) => {
    if (data.action === "textSelected") {
        console.log("Received text:", data.message);
    }
});
