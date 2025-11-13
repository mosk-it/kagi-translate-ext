import browser from "webextension-polyfill";

export interface LanguageInterface {
  lang: string;
  iso: string;
  m?: boolean; // is lang "common"?
}

export interface SettingsInterface {
  selectedLanguages: string[];

  selectionAction: "bubbleIcon" | "selectPopup" | ""
  autoTranslateOnPopup: boolean;
  bubbleIcon: boolean;

  autoDetectLanguage: boolean;
  autoDetectLangTo: string;
  autoDetectLangToAlt: string;

  customCSS: string;
}

export const DEFAULT_SETTINGS: SettingsInterface = {
  selectedLanguages: ["AUT", "EN"],
  selectionAction: "",
  autoTranslateOnPopup: false,
  bubbleIcon: true,
  autoDetectLanguage: true,
  autoDetectLangTo: "EN",
  autoDetectLangToAlt: "",
  customCSS: `.select-popup-container { background: #fff; border: 1px solid #ccc; border-radius: 4px; }
.select-popup-content {padding: 6px; font-family: sans-serif; font-size: 12px; max-width: 240px;}
.select-popup-content p {margin-top: 4px; margin-bottom: 4px;}`,
};

export class SettingsLoader {
  protected browser = browser;
  protected settings: SettingsInterface;
  protected static readonly SETTINGS_KEY = "kagiTranslateSettings";

  public async loadSettings(): Promise<SettingsInterface> {
    try {
      const result = await browser.storage.local.get(
        SettingsLoader.SETTINGS_KEY,
      );

      if (result && result[SettingsLoader.SETTINGS_KEY]) {
        this.settings = {
          ...DEFAULT_SETTINGS,
          ...(result[SettingsLoader.SETTINGS_KEY] as SettingsInterface),
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
