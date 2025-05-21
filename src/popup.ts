interface Settings {
  fromLang: string;
  toLang: string;
  selectedLanguages: string[];
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
  private model: string = "standard"; // might put it into options later

  constructor() {
    this.translateText = document.getElementById('translateText') as HTMLTextAreaElement;
    this.fromLangEl = document.getElementById('fromLang') as HTMLSelectElement;
    this.toLangEl = document.getElementById('toLang') as HTMLSelectElement;
    this.translateButton = document.getElementById('translateButton') as HTMLButtonElement;
    this.reverseLangsButton = document.getElementById('reverseLangsButton') as HTMLButtonElement;
    this.resultDiv = document.getElementById('result') as HTMLDivElement;
    this.settings = { fromLang: '', toLang: '', selectedLanguages: [] };
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
    if(this.autoTranslateEnabled && ! this.translating) {
      this.translateTextToOtherLanguage();
    }


  }


  private async loadSettings(): Promise<void> {
    const settings = await browser.storage.sync.get(['fromLang', 'toLang', 'selectedLanguages', 'autoTranslateOnPopup']);
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
    this.translating = true;
    const text = this.translateText.value.trim();
    if (!text) {
      this.translating = false;
      return;
    }

    this.resultDiv.textContent = 'Translating...';


    try {

      const response = await fetch("https://translate.kagi.com/api/translate", {
        "credentials": "include",
        "headers": {
          "Accept": "*/*",
          "Accept-Language": "en-US,en;q=0.5",
          "Content-Type": "application/json",
          "X-Signal": "abortable",
          "Pragma": "no-cache",
          "Cache-Control": "no-cache",
          "Priority": "u=4"
        },
        "method": "POST",
        "mode": "cors",
        body: JSON.stringify({
          from: this.fromLangEl.value,
          to: this.toLangEl.value,
          text: text,
          stream: false,
          prediction: "",
          formality: "default",
          speaker_gender: "unknown",
          addressee_gender: "unknown",
          translation_style: "natural",
          context: "",
          model: this.model,
          dictionary_language: "en"
        })
      });


      if (!response.ok) {
        throw new Error('Translation request failed');
      }

      const data = await response.json();
      const translatedContent = data.translation || 'Translation failed';
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
