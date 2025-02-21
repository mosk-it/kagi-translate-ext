// import { ALL_LANGUAGES } from './languages';
import  ALL_LANGUAGES  from './languages.json';

interface LanguageInterface {
  lang: string;
  iso: string;
  m?: boolean;
}

console.log(ALL_LANGUAGES);

class SettingsManager {
  private kagiToken: HTMLInputElement;
  private languageFilter: HTMLInputElement;
  private languageGrid: HTMLDivElement;
  private saveButton: HTMLButtonElement;
  private statusDiv: HTMLDivElement;
  private showAllLangsButton: HTMLButtonElement;
  private browser;

  private readonly  allLanguages: LanguageInterface[] = ALL_LANGUAGES;


  constructor() {
    this.browser = browser;
    this.kagiToken = document.getElementById('kagiToken') as HTMLInputElement;
    this.languageFilter = document.getElementById('languageFilter') as HTMLInputElement;
    this.languageGrid = document.getElementById('languageGrid') as HTMLDivElement;
    this.saveButton = document.getElementById('saveSettings') as HTMLButtonElement;
    this.statusDiv = document.getElementById('status') as HTMLDivElement;
    this.showAllLangsButton = document.getElementById('showAllLangs') as HTMLButtonElement;
    

    this.initialize();
  }

  private async initialize(): Promise<void> {
    this.renderLanguagesCheckboxes();
    await this.restoreSelectedLanguages();
    this.addEventListeners();
  }

  private renderLanguagesCheckboxes(): void {
    this.languageGrid.innerHTML = '';
    this.allLanguages.forEach(ob => {
      //ob.m - is by default hidden
      const languageDiv = this.createLanguageCheckbox(ob.lang, ob.m);
      this.languageGrid.appendChild(languageDiv);
    });
  }

  private langToId(lang: string): string {
      return 'lang-' + lang.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-');
  }

  private createLanguageCheckbox(lang: string, isVisible: boolean = false): HTMLDivElement {
    const languageDiv = document.createElement('div');
    languageDiv.classList.add('language-checkbox');

    let langId = this.langToId(lang);

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = langId;
    checkbox.value = lang;

    const label = document.createElement('label');
    label.htmlFor = langId;
    if (!isVisible) {
        languageDiv.style.display = 'none';
    }
    label.textContent = lang;

    languageDiv.appendChild(checkbox);
    languageDiv.appendChild(label);


    return languageDiv;
  }

  private async restoreSelectedLanguages(): Promise<void> {
    try {
      const result = await this.browser.storage.sync.get(['selectedLanguages', 'token']);
      this.kagiToken.value = result.token || '';

      const selectedLanguages = result.selectedLanguages || [];
        for (let selectedLang of selectedLanguages) {
            let el = document.getElementById(this.langToId(selectedLang));
            if (el) {
                el.checked = true;
                el.parentElement.style.display = 'flex';
            }
        }
    } catch (error) {
      console.error('Error restoring settings:', error);
    }
  }

  private addEventListeners(): void {
    this.saveButton.addEventListener('click', this.saveSettings.bind(this));
    this.showAllLangsButton.addEventListener('click', this.showAllLangs.bind(this));
  }

  /*
   * extracts token from url like https://kagi.com/search?token=ZZZ.YYY
   */
  private getTokenOutOfURLParams(): void {
      this.kagiToken.value = (new URLSearchParams((
          new URL(this.kagiToken.value)
      ).search)).get('token');
  }

  private async saveSettings(): Promise<void> {
    const selectedLanguages = this.getSelectedLanguages();

    try {
       let token = this.kagiToken.value;
      if (token.includes('kagi.com') && token.includes('token=')) {
          this.getTokenOutOfURLParams();
      }


      await this.browser.storage.sync.set({
        token: this.kagiToken.value.trim(),
        selectedLanguages
      });

      this.showStatusMessage('Settings saved successfully!', 'success');
    } catch (error) {
      this.showStatusMessage('Error saving settings', 'error');
      console.error('Error saving settings:', error);
    }
  }

  private async showAllLangs(): Promise<void> {
    for (let langDiv of document.querySelectorAll('.language-checkbox')) {
        langDiv.style.display = 'flex'
    }
    this.showAllLangsButton.style.display = 'none';
  }

  private getSelectedLanguages(): string[] {
    return Array.from(document.querySelectorAll('#languageGrid input[type="checkbox"]:checked'))
      .map((checkbox: HTMLInputElement) => checkbox.value);
  }

  private showStatusMessage(message: string, statusClass: string): void {
    this.statusDiv.textContent = message;
    this.statusDiv.className = statusClass;

    setTimeout(() => {
      this.statusDiv.textContent = '';
      this.statusDiv.className = '';
    }, 3000);
  }
}

// Initialize the SettingsManager when the DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SettingsManager();
});
