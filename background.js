const KAGI_TRANSLATE_URL = 'https://translate.kagi.com/';
const TRANSLATE_ENDPOINT = KAGI_TRANSLATE_URL + '?/translate';

// === translation ===

async function getSelectedText(tab) {
    return new Promise((resolve) => {
        browser.tabs.executeScript(tab.id, {
            code: 'window.getSelection().toString().trim()'
        }, (selection) => {
            resolve(selection && selection[0] ? selection[0] : null);
        });
    });
}

browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {

    if (message.action === 'selectedText') {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        const selectedText = await getSelectedText(tab);

        return selectedText;

        //sendResponse({ translatedText });
    }

});
