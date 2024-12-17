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
// === on shortcut listeners ===
browser.commands.onCommand.addListener(async (command) => {
    return; //TODO
    if (command === 'translate-selected-text') {
        
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        browser.tabs.executeScript(tab.id, {
            code: 'window.getSelection().toString().trim()'
        }, async (selection) => {
            if (selection && selection[0]) {
                const settings = await browser.storage.sync.get(['token', 'fromLang', 'toLang']);
                const translatedText = await translateText(
                    selection[0], 
                    settings.fromLang || 'Automatic', 
                    settings.toLang || 'English', 
                    settings.token
                );
                console.log(translatedText);

            }
        });
    } else if (command === 'open-translate-popup') {
        browser.tabs.create({ 
            url: KAGI_TRANSLATE_URL 
        });
    }
});
