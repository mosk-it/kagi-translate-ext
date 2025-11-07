interface Settings {
  fromLang: string;
  toLang: string;
  selectedLanguages: string[];
}

class TranslateAPI {
    protected translating: boolean = false;
    protected model: string = "standard";

    public isTranslating(): boolean {
        return this.translating;
    }

    constructor() {}

    private getAPIHeaders(): Record<string, string> {
        return {
            Accept: '*/*',
            'Accept-Language': 'en-US,en;q=0.5',
            'Content-Type': 'application/json',
            'X-Signal': 'abortable',
            Pragma: 'no-cache',
            'Cache-Control': 'no-cache',
            Priority: 'u=4'
        };
    }

    private async _makeRequest<T = any>(
        endpoint: string,
        body: Record<string, any>
    ): Promise<T> {
        const response = await fetch(`https://translate.kagi.com/api${endpoint}`, {
            credentials: 'include',
            headers: this.getAPIHeaders(),
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Request failed: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    protected async detectLang(text: string): Promise<string> {
        const data = await this._makeRequest<{ language: string }>('/detect', { text });
        return data.language;
    }

    private async* streamResponse(response: Response): AsyncGenerator<string, void, unknown> {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop()!;

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') return;
                    try {
                        const parsed = JSON.parse(data);
                        yield parsed.delta || '';
                    } catch {}
                }
            }
        }
    }

    public async translate(
        text: string,
        fromLang: string,
        toLang: string,
        options: {
            stream?: boolean;
            onUpdate?: (chunk: string) => void;
        } = {}
    ): Promise<string> {
        const { stream = false, onUpdate } = options;
        this.translating = true;

        try {
            const response = await fetch('https://translate.kagi.com/api/translate', {
                credentials: 'include',
                headers: this.getAPIHeaders(),
                method: 'POST',
                mode: 'cors',
                body: JSON.stringify({
                    from: fromLang,
                    to: toLang,
                    text: text.trim(),
                    stream: stream,
                    prediction: '',
                    formality: 'default',
                    speaker_gender: 'unknown',
                    addressee_gender: 'unknown',
                    translation_style: 'natural',
                    context: '',
                    model: this.model,
                    dictionary_language: 'en'
                })
            });

            if (stream && onUpdate) {
                let fullText = '';
                for await (const chunk of this.streamResponse(response)) {
                    fullText += chunk;
                    onUpdate(chunk);
                }
                return fullText;
            } else {
                const data = await response.json();
                return data.text || data.translation || '';
            }
        } finally {
            this.translating = false;
        }
    }
}



class TranslateApp extends TranslateAPI {


  async initialize(): Promise<void> {

  }

}



class TranslatePopup extends TranslateAPI {
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
    super();
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
    if (this.autoTranslateEnabled && !this.translating) {
      this.translateTextToOtherLanguage();
    }

  }


  private async loadSettings(): Promise<void> {
    const settings = await browser.storage.local.get([
      'fromLang', 'toLang', 'selectedLanguages', 'autoTranslateOnPopup', ''
    ]);
    this.settings.fromLang = settings.fromLang || '';
    this.settings.toLang = settings.toLang || '';
    this.settings.selectedLanguages = settings.selectedLanguages || [];
    this.autoTranslateEnabled = settings.autoTranslateOnPopup || false; // load auto translate setting

  }

  private async loadStoredLanguages(): Promise<void> {
    const result = await browser.storage.local.get(['selectedLanguages', 'fromLang', 'toLang']);
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

  private reverseLanguages(): void {
    const tmp = this.fromLangEl.value;
    this.fromLangEl.value = this.toLangEl.value;
    this.toLangEl.value = tmp;

    browser.storage.local.set({
      fromLang: this.fromLangEl.value,
      toLang: this.toLangEl.value,
    });
  }


  protected detectLanguageFromTo(text: text|undefined = '') {
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

});
