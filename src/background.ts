import browser from 'webextension-polyfill'
import { TranslateAPI } from './shared/translateapi';

browser.runtime.onMessage.addListener(async (data, sender, sendResponse) => {
    if (data.action === "translateText") {
        try {
            const tapi = new TranslateAPI();
            let txt = data.txt;
            let fromLang = await tapi.detectLang(txt); // TODO
            let toLang = 'PL'; // TODO

            const translatedContent = await tapi.translate(txt, fromLang, toLang, {
                stream: true,
                onUpdate: (chunk: string) => {
                    browser.tabs.sendMessage(sender.tab!.id!, {
                        action: 'partialTranslation',
                        elementId: data.elementId,
                        chunk: chunk
                    });
                }
            });

        } catch (error) {
            console.log('Error translating text');
        }
    }
});
