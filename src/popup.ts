import { getBrowser } from './webext-polyfill.js';

interface Settings {
  token: string;
  fromLang: string;
  toLang: string;
  selectedLanguages: string[];
}

interface TranslationResponse {
  data: string;
}

class TranslateApp {
  private translateText: HTMLTextAreaElement;
  private fromLang: HTMLSelectElement;
  private toLang: HTMLSelectElement;
  private translateButton: HTMLButtonElement;
  private reverseLangsButton: HTMLButtonElement;
  private resultDiv: HTMLDivElement;
  private settings: Settings;
  private browser?;

  constructor() {
    this.translateText = document.getElementById('translateText') as HTMLTextAreaElement;
    this.fromLang = document.getElementById('fromLang') as HTMLSelectElement;
    this.toLang = document.getElementById('toLang') as HTMLSelectElement;
    this.translateButton = document.getElementById('translateButton') as HTMLButtonElement;
    this.reverseLangsButton = document.getElementById('reverseLangsButton') as HTMLButtonElement;
    this.resultDiv = document.getElementById('result') as HTMLDivElement;
    this.settings = { token: '', fromLang: '', toLang: '', selectedLanguages: [] };
    this.browser = getBrowser();
  }

  async initialize(): Promise<void> {
    await this.loadStoredText();
    await this.loadStoredLanguages();
    this.attachEventListeners();
  }

  private async loadStoredText(): Promise<void> {
    const storedData = await this.browser.storage.local.get('translatedSelectedText');
    if (storedData.translatedSelectedText) {
      this.translateText.value = storedData.translatedSelectedText;
      this.translateText.focus();
      await this.browser.storage.local.remove('translatedSelectedText');
    } else {
        //const response = await this.browser.runtime.sendMessage({ action: 'selectedText' },);
        let yy = () => { console.log('333'); }
        let tt = await this.browser.runtime.sendMessage({ action: 'selectedText', param2: this.translateText })
        console.log(tt)
        this.translateText.value = tt;
        this.translateText.focus();

        //let tt = this.browser.runtime.sendMessage({ action: 'selectedText', param2: yy }).then((rr) => {
        //if (rr) {
        //console.log(rr)
        //    this.translateText.value = rr
        //    this.translateText.focus();
        //}
        //
        //});
        console.log(tt);
    }
  }

  private async loadStoredLanguages(): Promise<void> {
    const result = await this.browser.storage.sync.get(['selectedLanguages', 'fromLang', 'toLang']);
    const selectedLanguages = result.selectedLanguages || [];
    this.settings.selectedLanguages = selectedLanguages;
    this.populateLanguageDropdown(this.fromLang, selectedLanguages);
    this.populateLanguageDropdown(this.toLang, selectedLanguages);

    if (result.fromLang) this.fromLang.value = result.fromLang;
    if (result.toLang) this.toLang.value = result.toLang;
  }

  private populateLanguageDropdown(selectElement: HTMLSelectElement, languages: string[]): void {
    selectElement.innerHTML = '';
    languages.forEach((lang) => {
      const option = document.createElement('option');
      option.setAttribute('value', lang);
      option.textContent = lang;
      selectElement.appendChild(option);
    });
  }

  private attachEventListeners(): void {

    this.fromLang.addEventListener('change', () => {
      console.log(this.fromLang.value);
      this.browser.storage.sync.set({ fromLang: this.fromLang.value });
    });


    this.toLang.addEventListener('change', () => {
      console.log(this.toLang.value);
      this.browser.storage.sync.set({ toLang: this.toLang.value });
    });


    this.reverseLangsButton.addEventListener('click', () => {
      this.reverseLanguages();
    });

    this.translateButton.addEventListener('click', async () => {
      await this.translateTextToOtherLanguage();
    });
  }

  private reverseLanguages(): void {
    const tmp = this.fromLang.value;
    this.fromLang.value = this.toLang.value;
    this.toLang.value = tmp;
  }

  private async translateTextToOtherLanguage(): Promise<void> {
    const text = this.translateText.value.trim();
    if (!text) return;

    const settings = await this.browser.storage.sync.get(['token']);
    const token = settings.token || '';

    try {
      const response = await fetch('https://translate.kagi.com/?/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Kagi-Authorization': token,
          'Accept': 'application/json',
        },
        body: new URLSearchParams({
          from: this.fromLang.value,
          to: this.toLang.value,
          text: text,
        }),
      });

      if (!response.ok) {
        throw new Error('Translation request failed');
      }

      const data: TranslationResponse = await response.json();
      this.resultDiv.textContent = JSON.parse(data.data)[2] || 'Translation failed';
    } catch (error) {
      this.resultDiv.textContent = 'Error translating text';
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const app = new TranslateApp();
  await app.initialize();
});
