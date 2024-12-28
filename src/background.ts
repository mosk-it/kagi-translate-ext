import { getBrowser } from './webext-polyfill.js';

//interface Message {
//  action: string;
//}

const browser = getBrowser();

async function getSelectedText(tab: browser.tabs.Tab | chrome.tabs.Tab) {

    return new Promise((resolve,reject) => {
    browser.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => { return window.getSelection().toString(); }
        }, (results) => {
            if (results && results[0]) {
                console.log('result: ', results)
                resolve(results[0].result);
            }
        });
    });
}



browser.runtime.onMessage.addListener(async ( message: any, sender, sendResponse) => {

    console.log('message', message)
    if (message.action === 'selectedText') {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

        // no active tab
        if (!tab) {
            //sendResponse(null);
            return;
        }

        console.log(sendResponse);
            let res = await getSelectedText(tab);
            console.log(res)
            let e = sendResponse(res);
            return true;
            console.log(e)
            return res
        try {
        } catch (error) {
            console.error('Error getting selected text:', error);
        }
    }
    return true;
});
