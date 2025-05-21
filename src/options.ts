// import { ALL_LANGUAGES } from './languages';
import  ALL_LANGUAGES  from './languages.json';

interface LanguageInterface {
  lang: string;
  iso: string;
  m?: boolean; // is lang "common"?
}

console.log(ALL_LANGUAGES);

class SettingsManager {
  private languageFilter: HTMLInputElement;
  private languageGrid: HTMLDivElement;
  private saveButton: HTMLButtonElement;
  private statusDiv: HTMLDivElement;
  private showAllLangsButton: HTMLButtonElement;
  private autoTranslateCheckbox: HTMLInputElement;
  private browser;

  private readonly  allLanguages: LanguageInterface[] = ALL_LANGUAGES;


  constructor() {
    this.browser = browser;
    this.languageFilter = document.getElementById('languageFilter') as HTMLInputElement;
    this.languageGrid = document.getElementById('languageGrid') as HTMLDivElement;
    this.saveButton = document.getElementById('saveSettings') as HTMLButtonElement;
    this.statusDiv = document.getElementById('status') as HTMLDivElement;
    this.autoTranslateCheckbox = document.getElementById('autoTranslateOnPopup') as HTMLInputElement; // get checkbox
    this.showAllLangsButton = document.getElementById('showAllLangs') as HTMLButtonElement;
    

    this.initialize();
  }

  private async initialize(): Promise<void> {
    this.renderLanguagesCheckboxes();
    await this.restoreSelectedLanguages();
    await this.restoreSettings();
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

  // restore settings
  private async restoreSettings(): Promise<void> {
    const settings = await browser.storage.sync.get(['autoTranslateOnPopup']);
    if (settings.autoTranslateOnPopup !== undefined) { // check if exists
      this.autoTranslateCheckbox.checked = settings.autoTranslateOnPopup;
    }
  }
  private async restoreSelectedLanguages(): Promise<void> {
    try {
      const result = await this.browser.storage.sync.get(['selectedLanguages']);

      const selectedLanguages = result.selectedLanguages || [];
        for (let selectedLang of selectedLanguages) {
            let el = document.getElementById(this.langToId(selectedLang));
            console.log('el')
            console.log(el)
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


  private async saveSettings(): Promise<void> {
    const selectedLanguages = this.getSelectedLanguages();

    try {


      await this.browser.storage.sync.set({
        selectedLanguages: selectedLanguages,
        autoTranslateOnPopup: this.autoTranslateCheckbox.checked,
      });

      this.showStatusMessage('Settings saved successfully!', 'success');
    } catch (error) {
      this.showStatusMessage('Error saving settings', 'error');
      console.error('Error saving settings:', error);
    }
  }

  private async showAllLangs(): Promise<void> {
    for (let langDiv of document.querySelectorAll<HTMLElement>('.language-checkbox')) {
        langDiv.style.display = 'flex';
    }
    this.showAllLangsButton.style.display = 'none';
  }

  // private getSelectedLanguages(): string[] {
  //   return Array.from(document.querySelectorAll('#languageGrid input[type="checkbox"]:checked'))
  //     .map((checkbox: HTMLInputElement) => checkbox.value);
  // }
  private getSelectedLanguages(): string[] {
    return Array.from(document.querySelectorAll('#languageGrid input[type="checkbox"]:checked'))
      .map((checkbox) => (checkbox as HTMLInputElement).value);
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
