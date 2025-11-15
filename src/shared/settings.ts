import browser from "webextension-polyfill";
import { commonLanguages, LanguageInterface } from "./languages";

export interface SettingsInterface {
  selectedLanguages: LanguageInterface[];

  selectionAction: "bubbleIcon" | "selectPopup" | "";
  autoTranslateOnPopup: boolean;
  bubbleIcon: boolean;

  autoDetectLanguageInPopup: boolean;
  autoDetectLangTo: string;
  autoDetectLangToAlt: string;

  customCSS: string;
}


export const SETTINGS_KEY = "kagiTranslateSettings";

export const DEFAULT_SETTINGS: SettingsInterface = {
  selectedLanguages: [{lang: "Automatic", iso:"auto"}, ... commonLanguages ],
  selectionAction: "",
  autoTranslateOnPopup: false,
  bubbleIcon: true,
  autoDetectLanguageInPopup: true,
  autoDetectLangTo: navigator.language,
  autoDetectLangToAlt: 'en',
  customCSS: `.select-popup-container { background: #fff; border: 1px solid #ccc; border-radius: 4px; }
.select-popup-content {padding: 6px; font-family: sans-serif; font-size: 12px; max-width: 240px;}
.select-popup-content p {margin-top: 4px; margin-bottom: 4px;}`,
};

export function resetSettings() {
  let settings = { ...DEFAULT_SETTINGS };
  browser.storage.local.set({ [SETTINGS_KEY]: settings });
}

export class SettingsLoader {
  protected browser = browser;
  protected settings: SettingsInterface;

  public async loadSettings(): Promise<SettingsInterface> {
    try {
      const result = await browser.storage.local.get(
        SETTINGS_KEY,
      );

      if (result && result[SETTINGS_KEY]) {
        this.settings = {
          ...DEFAULT_SETTINGS,
          ...(result[SETTINGS_KEY] as SettingsInterface),
        };
      } else {
        this.settings = { ...DEFAULT_SETTINGS };
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      this.settings = { ...DEFAULT_SETTINGS };
    }

    return this.settings;
  }
}
