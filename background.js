const KAGI_TRANSLATE_URL = 'https://translate.kagi.com/';
const TRANSLATE_ENDPOINT = KAGI_TRANSLATE_URL + '?/translate';

// === translation ===
async function translateText(text, fromLang = 'Automatic', toLang = 'English', token = '') {
    try {
        const response = await fetch(TRANSLATE_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Kagi-Authorization': token,
                'Accept': 'application/json'
            },
            body: new URLSearchParams({
                from: fromLang,
                to: toLang,
                text: text
            })
        });

        if (!response.ok) {
            throw new Error('Translation request failed');
        }

        const data = await response.json();
        return data.data[2]; // Extracted translated text
    } catch (error) {
        console.error('Translation error:', error);
        return null;
    }
}

async function getSelectedText(tab) {
    console.log('getSelectedText')
    return new Promise((resolve) => {
        browser.tabs.executeScript(tab.id, {
            code: 'window.getSelection().toString().trim()'
        }, (selection) => {
            resolve(selection && selection[0] ? selection[0] : null);
        });
    });
}

browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {

    if (message.action === 'translateSelectedText') {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        const selectedText = await getSelectedText(tab);

        if (selectedText) {
            const settings = await browser.storage.sync.get(['token', 'fromLang', 'toLang']);
            const translatedText = await translateText(
                selectedText,
                settings.fromLang || 'Automatic',
                settings.toLang || 'English',
                settings.token
            );

            //sendResponse({ translatedText });
            return { 'selectedText': selectedText };
        }
    }
});
