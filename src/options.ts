import { getBrowser } from './webext-polyfill.js';

class SettingsManager {
  private kagiToken: HTMLInputElement;
  private languageFilter: HTMLInputElement;
  private languageGrid: HTMLDivElement;
  private saveButton: HTMLButtonElement;
  private statusDiv: HTMLDivElement;
  private browser;

  private readonly allLanguages: string[] = [
    'Automatic', 'English', 'Spanish', 'French', 'German', 'Italian',
    'Portuguese', 'Russian', 'Chinese', 'Japanese', 'Arabic', 'Korean',
    'Dutch', 'Swedish', 'Polish', 'Turkish', 'Hindi', 'Hebrew', 'Thai',
    'Vietnamese', 'Indonesian', 'Filipino', 'Malay'
  ];

  constructor() {
    this.browser = getBrowser();
    this.kagiToken = document.getElementById('kagiToken') as HTMLInputElement;
    this.languageFilter = document.getElementById('languageFilter') as HTMLInputElement;
    this.languageGrid = document.getElementById('languageGrid') as HTMLDivElement;
    this.saveButton = document.getElementById('saveSettings') as HTMLButtonElement;
    this.statusDiv = document.getElementById('status') as HTMLDivElement;

    this.initialize();
  }

  private async initialize(): Promise<void> {
    this.renderLanguagesCheckboxes(this.allLanguages);
    await this.restoreSelectedLanguages();
    this.addEventListeners();
  }

  private renderLanguagesCheckboxes(languages: string[]): void {
    this.languageGrid.innerHTML = '';
    languages.forEach(lang => {
      const languageDiv = this.createLanguageCheckbox(lang);
      this.languageGrid.appendChild(languageDiv);
    });
  }

  private createLanguageCheckbox(lang: string): HTMLDivElement {
    const languageDiv = document.createElement('div');
    languageDiv.classList.add('language-checkbox');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `lang-${lang}`;
    checkbox.value = lang;

    const label = document.createElement('label');
    label.htmlFor = `lang-${lang}`;
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
      document.querySelectorAll('#languageGrid input[type="checkbox"]').forEach((checkbox: HTMLInputElement) => {
        checkbox.checked = selectedLanguages.includes(checkbox.value);
      });
    } catch (error) {
      console.error('Error restoring settings:', error);
    }
  }

  private addEventListeners(): void {
    this.saveButton.addEventListener('click', this.saveSettings.bind(this));
  }

  private async saveSettings(): Promise<void> {
    const selectedLanguages = this.getSelectedLanguages();

    try {
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
