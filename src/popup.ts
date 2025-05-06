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
  private translating: boolean;
  private browser?;
  private messages: string[];
  private autoTranslateEnabled: boolean = false; // track setting

  constructor() {
    this.translateText = document.getElementById('translateText') as HTMLTextAreaElement;
    this.fromLangEl = document.getElementById('fromLang') as HTMLSelectElement;
    this.toLangEl = document.getElementById('toLang') as HTMLSelectElement;
    this.translateButton = document.getElementById('translateButton') as HTMLButtonElement;
    this.reverseLangsButton = document.getElementById('reverseLangsButton') as HTMLButtonElement;
    this.resultDiv = document.getElementById('result') as HTMLDivElement;
    this.settings = { token: '', fromLang: '', toLang: '', selectedLanguages: [] };
    this.messages = [];
    this.translating = false;
  }

  async initialize(): Promise<void> {
    await this.loadStoredLanguages();
    await this.loadSettings(); // load all settings
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
      // func: (() => { return window.getSelection().toString(); }) as any
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
    console.log('from loadText: this.autoTranslateEnabled, this.translating');
    console.log(this.autoTranslateEnabled, this.translating);

    console.log('from loadSettings: this.autoTranslateEnabled, this.translating');
    console.log(this.autoTranslateEnabled, this.translating);
    if(this.autoTranslateEnabled && ! this.translating) {
      this.translateTextToOtherLanguage();
    }


  }


  private async loadSettings(): Promise<void> {
    const settings = await browser.storage.sync.get(['token', 'fromLang', 'toLang', 'selectedLanguages', 'autoTranslateOnPopup']);
    this.settings.token = settings.token || '';
    this.settings.fromLang = settings.fromLang || '';
    this.settings.toLang = settings.toLang || '';
    this.settings.selectedLanguages = settings.selectedLanguages || [];
    this.autoTranslateEnabled = settings.autoTranslateOnPopup || false; // load auto translate setting

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

    if (languages.length == 0) {
      let msgNoLangsSelectedWarn = 'Go to options and select preffered languages!'
      if (!this.messages.includes(msgNoLangsSelectedWarn)) {
        this.messages.push(msgNoLangsSelectedWarn);
      }
    }
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

    browser.storage.sync.set({
      fromLang: this.fromLangEl.value,
      toLang: this.toLangEl.value,
    });
  }

  public async translateTextToOtherLanguage(): Promise<void> {
    console.log('translateTextToOtherLanguage START --- ')
    this.translating = true;
    const text = this.translateText.value.trim();
    console.log('== text');
    console.log(text);
    if (!text) {
      this.translating = false;
      return;
    }

    const settings = await browser.storage.sync.get(['token']);
    const token = settings.token || '';


    let msgNoTokenWarn = 'Token is empty, translation might not work, go to options to fix it'
    if (token.length === 0 && !this.messages.includes(msgNoTokenWarn)) {
      this.messages.push(msgNoTokenWarn);
      this.showMessages(); //TODO: make this.messages observed
    }

    this.resultDiv.textContent = 'Translating...';


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
      let translatedContent = JSON.parse(data.data)[2] || 'Translation failed';
      console.log(translatedContent);
      this.resultDiv.textContent = translatedContent;
    } catch (error) {
      this.resultDiv.textContent = 'Error translating text';
    }

    this.translating = false;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
    const app = new TranslateApp();
    await app.initialize();
});
