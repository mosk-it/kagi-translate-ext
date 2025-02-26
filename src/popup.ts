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
  private messages: string[];

  constructor() {
    this.translateText = document.getElementById('translateText') as HTMLTextAreaElement;
    this.fromLangEl = document.getElementById('fromLang') as HTMLSelectElement;
    this.toLangEl = document.getElementById('toLang') as HTMLSelectElement;
    this.translateButton = document.getElementById('translateButton') as HTMLButtonElement;
    this.reverseLangsButton = document.getElementById('reverseLangsButton') as HTMLButtonElement;
    this.resultDiv = document.getElementById('result') as HTMLDivElement;
    this.settings = { token: '', fromLang: '', toLang: '', selectedLanguages: [] };
    this.messages = [];
  }

  async initialize(): Promise<void> {
      this.loadText();
      await this.loadStoredLanguages();
      this.attachEventListeners();
      this.showMessages();
  }


  private async showMessages(): Promise<void> {
      if (this.messages.length > 0) {

          for (let i=0; i <= this.messages.length; i++) {

              let msg = this.messages[i];

              let messageElement = document.createElement('span');
              messageElement.innerHTML = msg;
              document.getElementById('message-box').append(messageElement)

              const index = this.messages.indexOf(item);
              if (index > -1) {
                  this.messages.splice(index, 1);
              }
          }




      }
  }

  private async storeSelectedText(msg: string):  Promise<void> {

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

    if (languages.length == 0) {
        this.messages.push('Go to options and select preffered languages');
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
  }


  async createFormData(text: string, sessionToken: string) {

    const formData = new FormData()

    formData.append('session_token', sessionToken)
    // formData.append('from', this.fromLangEl.value)
    // formData.append('to', this.toLangEl.value)
    // TODO
    formData.append('from', 'en')
    formData.append('to', 'Polish')
    formData.append('text', text)
    formData.append('name', 'text')
    // formData.append('predictedLanguage', '123123') // their bug?
    // formData.append('prediction', '')
    formData.append('translationMode', JSON.stringify({
      speaker_gender: 'unknown',
      addressee_gender: 'unknown',
      formality_level: 'neutral',
      translation_style: 'natural',
      context: ''
    }))

    console.log(formData)
    return formData;
  }


  private async translateTextToOtherLanguage(): Promise<void> {
    const text = this.translateText.value.trim();
    if (!text) return;

    const settings = await browser.storage.sync.get(['token']);
    const token = settings.token || '';

    // try {
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
          'Content-Type': 'application/json',
          'Authorization': token,
          'Accept': 'application/json',
          'X-Kagi-Authorization': token,
        },
        credentials: 'include',
        body: await this.createFormData(text, token),
      });

      if (!response.ok) {
        throw new Error('Translation request failed');
      }

      const data: TranslationResponse = await response.json();
      this.resultDiv.textContent = JSON.parse(data.data)[2] || 'Translation failed';
    // } catch (error) {
    //   this.resultDiv.textContent = 'Error translating text';
    // }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const app = new TranslateApp();
  await app.initialize();
});
