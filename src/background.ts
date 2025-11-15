import browser from "webextension-polyfill";
import { TranslateAPI } from "./shared/translateapi";
import { resetSettings } from "./shared/settings";

import { SettingsInterface, SettingsLoader } from "./shared/settings";

browser.runtime.onMessage.addListener(async (data, sender, sendResponse) => {
  if (data.action === "translateText") {
    try {
      const sl = new SettingsLoader();
      const settings = await sl.loadSettings();
      let toLang;
      let fromLang;

      const tapi = new TranslateAPI();
      let txt = data.txt;

      let textLang = await tapi.detectLang(txt); // TODO

      if (textLang === settings.autoDetectLangTo) {
        toLang = settings.autoDetectLangToAlt;
      } else {
        toLang = settings.autoDetectLangTo;
      }

      const translatedContent = await tapi.translate(txt, fromLang, toLang, {
        stream: true,
        onUpdate: (chunk: string) => {
          browser.tabs.sendMessage(sender.tab!.id!, {
            action: "partialTranslation",
            elementId: data.elementId,
            chunk: chunk,
          });
        },
      });

      return true;
    } catch (error) {
      console.warn("Error translating text");
    }
  }
});

browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    resetSettings();
  }
});
