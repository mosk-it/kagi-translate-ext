(async () => {
  const settings = await browser.storage.local.get('openMinimalPopup');
  console.log(settings);

  let isOpenMinimalPopup = null;

  if (settings.openMinimalPopup !== undefined) {
    isOpenMinimalPopup = settings.openMinimalPopup;
  }

  const script = {
    id: "content-script",
    js: ["content-script.js"],
    matches: ["<all_urls>"],
  };

  if (isOpenMinimalPopup) {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

    try { browser.scripting.registerContentScripts([script]); } catch (e) { }

  } else {

    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    try { browser.scripting.unregisterContentScripts({ 'ids': [script.id] }) } catch (e) { }
  }
})();


browser.storage.onChanged.addListener((changes, area) => {
  console.log(changes);
  console.log(area);
})


browser.runtime.onMessage.addListener((data, sender, sendResponse) => {
  if (data.action === "textSelected") {
    console.log("Received text:", data.message);
  }
});
