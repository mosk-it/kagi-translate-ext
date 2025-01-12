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
  private fromLangEl: HTMLSelectElement;
  private toLangEl: HTMLSelectElement;
  private translateButton: HTMLButtonElement;
  private reverseLangsButton: HTMLButtonElement;
  private resultDiv: HTMLDivElement;
  private settings: Settings;
  private browser?;

  constructor() {
    this.translateText = document.getElementById('translateText') as HTMLTextAreaElement;
    this.fromLangEl = document.getElementById('fromLang') as HTMLSelectElement;
    this.toLangEl = document.getElementById('toLang') as HTMLSelectElement;
    this.translateButton = document.getElementById('translateButton') as HTMLButtonElement;
    this.reverseLangsButton = document.getElementById('reverseLangsButton') as HTMLButtonElement;
    this.resultDiv = document.getElementById('result') as HTMLDivElement;
    this.settings = { token: '', fromLang: '', toLang: '', selectedLanguages: [] };
  }

  async initialize(): Promise<void> {
      this.loadText();
      await this.loadStoredLanguages();
      this.attachEventListeners();
  }


  private async storeSelectedText(msg: string):  Promise<void> {

      await browser.storage.local.set({
          translatedSelectedText2: msg 
      });

      browser.storage.local.get('translatedSelectedText2').then((r)=> { console.log(r);});
  }

  /*
   * Loads either currently selected text or previously selected (if no selection)
   */
  private async loadText(): Promise<void> {

      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

      let selText = await browser.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => { return window.getSelection().toString(); }
      }).then((results) => {
          if (results && results[0]) {
              let selText = results[0].result;
              return selText

          }
      });

      if (selText) {
          this.storeSelectedText(selText);
          this.translateText.value = selText;
          this.translateText.focus();
      } else {
          const storedData = await browser.storage.local.get('translatedSelectedText2');
          if (storedData.translatedSelectedText2) {
              this.translateText.value = storedData.translatedSelectedText2;
              this.translateText.focus();
          }
      }
  }

  private async loadStoredLanguages(): Promise<void> {
    const result = await browser.storage.sync.get(['selectedLanguages', 'fromLang', 'toLang']);
    const selectedLanguages = result.selectedLanguages || [];
    this.settings.selectedLanguages = selectedLanguages;
    this.populateLanguageDropdown(this.fromLangEl, selectedLanguages);
    this.populateLanguageDropdown(this.toLangEl, selectedLanguages);

    if (result.fromLang) this.fromLangEl.value = result.fromLang;
    if (result.toLang) this.toLangEl.value = result.toLang;
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

    this.fromLangEl.addEventListener('change', () => {
      browser.storage.sync.set({ fromLang: this.fromLangEl.value });
    });


    this.toLangEl.addEventListener('change', () => {
      browser.storage.sync.set({ toLang: this.toLangEl.value });
    });


    this.reverseLangsButton.addEventListener('click', () => {
      this.reverseLanguages();
    });

    this.translateButton.addEventListener('click', async () => {
      await this.translateTextToOtherLanguage();
    });
  }

  private reverseLanguages(): void {
    const tmp = this.fromLangEl.value;
    this.fromLangEl.value = this.toLangEl.value;
    this.toLangEl.value = tmp;
  }

  private async translateTextToOtherLanguage(): Promise<void> {
    const text = this.translateText.value.trim();
    if (!text) return;

    const settings = await browser.storage.sync.get(['token']);
    const token = settings.token || '';

    try {
        await browser.cookies.set({
            url: 'https://translate.kagi.com',
            name: 'kagi_session',
            value: token,
            domain: '.kagi.com',
            secure: true
        });

      const response = await fetch('https://translate.kagi.com/?/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': token,
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: new URLSearchParams({
          from: this.fromLangEl.value,
          to: this.toLangEl.value,
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
