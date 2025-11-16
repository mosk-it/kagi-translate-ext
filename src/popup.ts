import { TranslateAPI } from "./shared/translateapi";
import { LanguageInterface, SettingsInterface, SettingsLoader } from './shared/settings';
var browser = require("webextension-polyfill");

interface PopupSettings {
  fromLang: string;
  toLang: string;
}


class TranslatePopup extends TranslateAPI {
  private translateText: HTMLTextAreaElement;
  private fromLangEl: HTMLSelectElement;
  private toLangEl: HTMLSelectElement;
  private translateButton: HTMLButtonElement;
  private reverseLangsButton: HTMLButtonElement;
  private resultDiv: HTMLDivElement;
  private popupSettings: PopupSettings;
  private translating: boolean;
  private browser = browser;
  private messages: string[];
  private autoTranslateEnabled: boolean = false; // track setting
  protected settings: SettingsInterface;
  protected model: string = "standard"; // might put it into options later

  constructor() {
    super();
    this.translateText = document.getElementById('translateText') as HTMLTextAreaElement;
    this.fromLangEl = document.getElementById('fromLang') as HTMLSelectElement;
    this.toLangEl = document.getElementById('toLang') as HTMLSelectElement;
    this.translateButton = document.getElementById('translateButton') as HTMLButtonElement;
    this.reverseLangsButton = document.getElementById('reverseLangsButton') as HTMLButtonElement;
    this.resultDiv = document.getElementById('result') as HTMLDivElement;
    this.popupSettings = { fromLang: '', toLang: '' };
    this.messages = [];
    this.translating = false;
  }

  async initialize(): Promise<void> {
    await this.loadSettings()
    await this.loadStoredLanguages();
    await this.loadPopupSettings(); // load all settings
    this.loadText();
    this.attachEventListeners();
    this.showMessages();
  }


  private async showMessages(): Promise<void> {
    const messageBox = document.getElementById('message-box');
    if (!messageBox || this.messages.length === 0) {
      return;
    }
    while (this.messages.length > 0) {
      let msg = this.messages.shift();
      let messageElement = document.createElement('div');
      messageElement.className = 'msg';

      messageElement.append(msg!);
      if (messageBox) {
        messageBox.append(messageElement);
      }

    }

  }

  private async storeSelectedText(msg: string): Promise<void> {

    await browser.storage.local.set({
      translatedSelectedText2: msg
    });

  }

  /*
   * Loads either currently selected text or previously selected (if no selection)
   */
  private async loadText(): Promise<void> {

    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

    let selText = await browser.scripting.executeScript({
      target: { tabId: tab.id! },
      func: (() => { return window.getSelection()!.toString(); }) as any
    }).then((results) => {
      if (results && results[0]) {
        let selText = results[0].result;
        return selText

      }
    });

    if (selText) {
      this.storeSelectedText(selText as string); // TODO as string?
      this.translateText.value = selText as string; // TODO as string?
      this.translateText.focus();
    } else {
      const storedData = await browser.storage.local.get('translatedSelectedText2');
      if (storedData.translatedSelectedText2) {
        this.translateText.value = storedData.translatedSelectedText2;
        this.translateText.focus();
      }
    }
    if (this.autoTranslateEnabled && !this.translating) {
      this.translateTextToOtherLanguage();
    }

  }


  private async loadPopupSettings(): Promise<void> {
    const popupSettings = await browser.storage.local.get([
      'fromLang', 'toLang'
    ]);
    this.popupSettings.fromLang = popupSettings.fromLang || '';
    this.popupSettings.toLang = popupSettings.toLang || '';
    this.autoTranslateEnabled = this.settings.autoTranslateOnPopup || false; // load auto translate setting

  }

  private async loadSettings(): Promise<void> {
    const sl = new SettingsLoader()
    this.settings = await sl.loadSettings();
  }


  private async loadStoredLanguages(): Promise<void> {
    const result = await browser.storage.local.get([ 'fromLang', 'toLang']);
    const selectedLanguages = this.settings.selectedLanguages;
    this.populateLanguageDropdown(this.fromLangEl, selectedLanguages);
    this.populateLanguageDropdown(this.toLangEl, selectedLanguages.filter(language => language.iso !== "auto"));


    if (result.fromLang) this.fromLangEl.value = result.fromLang;
    if (result.toLang) this.toLangEl.value = result.toLang;
  }

  private populateLanguageDropdown(selectElement: HTMLSelectElement, languages: LanguageInterface[]): void {
    selectElement.innerHTML = '';
    languages.forEach((lang) => {
      const option = document.createElement('option');
      option.setAttribute('value', lang.iso);
      option.textContent = lang.lang;
      selectElement.appendChild(option);
    });

    if (languages.length == 0) {
      let msgNoLangsSelectedWarn = 'Go to options and select preffered languages!'
      if (!this.messages.includes(msgNoLangsSelectedWarn)) {
        this.messages.push(msgNoLangsSelectedWarn);
      }
    }
  }

  private attachEventListeners(): void {

    this.fromLangEl.addEventListener('change', () => {
      browser.storage.local.set({ fromLang: this.fromLangEl.value });
    });


    this.toLangEl.addEventListener('change', () => {
      browser.storage.local.set({ toLang: this.toLangEl.value });
    });


    this.reverseLangsButton.addEventListener('click', () => {
      this.reverseLanguages();
    });

    this.translateButton.addEventListener('click', async () => {
      await this.translateTextToOtherLanguage();
    });



  }


  public refreshTheme(theme: string | null = null) {
    let pickTheme = theme;
    if (!pickTheme) {
      pickTheme = this.settings.theme
    }
    document.documentElement.classList.remove('auto', 'dark', 'light');
    document.documentElement.classList.add(pickTheme);
  }


  private reverseLanguages(): void {
    const tmp = this.fromLangEl.value;
    this.fromLangEl.value = this.toLangEl.value;
    this.toLangEl.value = tmp;

    browser.storage.local.set({
      fromLang: this.fromLangEl.value,
      toLang: this.toLangEl.value,
    });
  }



  public async translateTextToOtherLanguage(stream: boolean = true): Promise<void> {
    const text = this.translateText.value.trim();
    if (!text) return;
    this.resultDiv.textContent = '';

    try {
      const translatedContent = await this.translate(text, this.fromLangEl.value, this.toLangEl.value, {
        stream,
        onUpdate: stream ? (chunk: string) => {
          this.resultDiv.textContent += chunk;
        } : undefined
      });

      if (!stream) {
        this.resultDiv.textContent = translatedContent;
      }
    } catch (error) {
      this.resultDiv.textContent = 'Error translating text';
    }
  }



}

document.addEventListener('DOMContentLoaded', async () => {
  const app = new TranslatePopup();
  await app.initialize();
  await app.refreshTheme();
});
