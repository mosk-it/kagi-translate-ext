import  ALL_LANGUAGES  from './shared/languages.json';

var browser = require("webextension-polyfill");
import { SettingsLoader, SettingsInterface, DEFAULT_SETTINGS, LanguageInterface } from './shared/settings'


class OptionsPage {

  protected languageFilter: HTMLInputElement;
  protected languageGrid: HTMLDivElement;
  protected saveButton: HTMLButtonElement;
  protected statusDiv: HTMLDivElement;
  protected showAllLangsButton: HTMLButtonElement;
  protected autoTranslateCheckbox: HTMLInputElement;
  protected openMinimalPopupCheckbox: HTMLInputElement;
  protected advancedOpen;

  private readonly  allLanguages: LanguageInterface[] = ALL_LANGUAGES;

  private settings: SettingsInterface;
  private settingsManager


  constructor() {

    this.languageGrid = document.getElementById('languageGrid') as HTMLDivElement;

    this.settingsManager = new SettingsManager();

    this.saveButton = document.getElementById('saveSettings') as HTMLButtonElement;
    this.statusDiv = document.getElementById('status') as HTMLDivElement;
    this.showAllLangsButton = document.getElementById('showAllLangs') as HTMLButtonElement;
    // this.autoTranslateCheckbox = document.getElementById('autoTranslateOnPopup') as HTMLInputElement; // get checkbox
    // this.openMinimalPopupCheckbox = document.getElementById('openMinimalPopup') as HTMLInputElement;

    this.initializeEventListeners();

    this.renderLanguagesCheckboxes();
    this.loadSettingsIntoUI();
  }

  private toggleAdvancedSettings(): void {
    this.advancedOpen = !this.advancedOpen;
    const content = document.getElementById('advancedContent');
    const toggle = document.getElementById('advancedToggle');

    if (content && toggle) {
      content.style.display = this.advancedOpen ? 'block' : 'none';
      toggle.textContent = this.advancedOpen ? '[-] Advanced Settings' : '[+] Advanced Settings';
    }
  }

  private initializeEventListeners(): void {

    const advancedToggle = document.getElementById('advancedToggle');
    if (advancedToggle) {
      advancedToggle.addEventListener('click', () => this.toggleAdvancedSettings());
    }

    const resetCSSButton = document.getElementById('resetCSS');
    if (resetCSSButton) {
      resetCSSButton.addEventListener('click', () => this.resetCustomCSS());
    }

    this.showAllLangsButton.addEventListener('click', this.showAllLangs.bind(this));


    this.saveButton.addEventListener('click', this.saveSettingsFromUI.bind(this));

  }

  private async loadSettingsIntoUI(): Promise<void> {
    try {
      const settings = await this.settingsManager.loadSettings();
      this.setChecked('autoTranslateOnPopup', settings.autoTranslateOnPopup);
      this.setChecked('bubbleIcon', settings.bubbleIcon);
      this.setChecked('autoDetectLanguage', settings.autoDetectLanguage);

      const selectionActionElement = document.querySelector(`input[name="selectionAction"][value="${settings.selectionAction}"]`) as HTMLInputElement;
      if (selectionActionElement) {
        selectionActionElement.checked = true;
      }

      for (let selectedLang of settings.selectedLanguages) {
        this.setChecked(this.langToId(selectedLang), true);
      }

      this.setValueToElement('autoDetectLangTo', settings.autoDetectLangTo || '');
      this.setValueToElement('autoDetectLangToAlt', settings.autoDetectLangToAlt || '');
      this.setValueToElement('customCSS', settings.customCSS);

      this.setValueToElement('customCSS', settings.customCSS);

    } catch (error) {
      console.error('Failed to load settings into UI:', error);
      this.showStatusMessage('Failed to load settings', 'error');
    }
  }

  private async saveSettingsFromUI(): Promise<void> {
    try {
      const settings = await this.settingsManager.loadSettings();

      settings.autoTranslateOnPopup = this.getChecked('autoTranslateOnPopup');
      settings.bubbleIcon = this.getChecked('bubbleIcon');
      settings.autoDetectLanguage = this.getChecked('autoDetectLanguage');

      const checkedLanguages = this.languageGrid.querySelectorAll('input[type="checkbox"]:checked');

      let selLangs: string[] = []
      checkedLanguages.forEach(checkbox => {
        const langCode = checkbox.getAttribute('data-lang');
        if (langCode) {
          selLangs.push(langCode);
        }
      });
      settings.selectedLanguages = selLangs;

      settings.selectionAction = (document.querySelector('input[name="selectionAction"]:checked') as HTMLInputElement)?.value  || '';

      settings.autoDetectLangTo = this.getValueFromElement('autoDetectLangTo');
      settings.autoDetectLangToAlt = this.getValueFromElement('autoDetectLangToAlt');
      settings.customCSS = this.getValueFromElement('customCSS');

      this.settingsManager.updateSettings(settings);
      this.settingsManager.save().then(
        this.showStatusMessage('Settings saved successfully!', 'success')
      );

    } catch (error) {
      console.error('Failed to save settings from UI:', error);
      this.showStatusMessage('Failed to save settings', 'error');
    }
  }

  private getValueFromElement(elementId: string): string {
    const element = document.getElementById(elementId) as HTMLTextAreaElement;
    if (element) {
      return element.value;
    }
    console.warn(`Element with id '${elementId}' not found`);
    return '';
  }

  private resetCustomCSS(): void {
    const defaultCSS = DEFAULT_SETTINGS.customCSS;
    this.setValueToElement('customCSS', defaultCSS);
  }

  protected setValueToElement(id: string, value: string): void {
    const element = document.getElementById(id) as HTMLTextAreaElement;
    if (element) {
      element.value = value;
    }
  }

  private renderLanguagesCheckboxes(): void {
    this.languageGrid.innerHTML = '';
    this.allLanguages.forEach(ob => {
      //ob.m defines if lang is by default hidden
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
    checkbox.setAttribute('data-lang', lang);

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

  private async showAllLangs(): Promise<void> {
    for (let langDiv of document.querySelectorAll<HTMLElement>('.language-checkbox')) {
        langDiv.style.display = 'flex';
    }
    this.showAllLangsButton.style.display = 'none';
  }

  private setChecked(elementId: string, checked: boolean): void {
    const element = document.getElementById(elementId) as HTMLInputElement;
    if (element && element.type === 'checkbox') {
      element.checked = checked;
    } else if (element) {
      element.setAttribute('checked', checked ? 'checked' : '');
    } else {
      console.warn(`Element with ID '${elementId}' not found`);
    }
  }

  private getChecked(elementId: string): boolean {
    const element = document.getElementById(elementId) as HTMLInputElement;
    if (element && element.type === 'checkbox') {
      return element.checked;
    } else if (element) {
      return element.hasAttribute('checked');
    }
    console.warn(`Element with ID '${elementId}' not found`);
    return false;
  }

  private showStatusMessage(message: string, statusClass: 'success' | 'error'): void {
    this.statusDiv.textContent = message;
    this.statusDiv.className = statusClass;

    setTimeout(() => {
      this.statusDiv.textContent = '';
      this.statusDiv.className = '';
    }, 3000);
  }

  private getSelectedLanguages(): string[] {
    return Array.from(document.querySelectorAll('#languageGrid input[type="checkbox"]:checked'))
      .map((checkbox) => (checkbox as HTMLInputElement).value);
  }

}



class SettingsManager extends SettingsLoader {

  constructor() {
    super()
  }



  public async save(): Promise<void> {
    try {
      const settingsObj = {
        [SettingsManager.SETTINGS_KEY]: this.settings
      };
      await browser.storage.local.set(settingsObj);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  public getSettings(): SettingsInterface {
    return this.settings;
  }

  public updateSettings(newSettings: Partial<SettingsInterface>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  public resetToDefaults(): void {
    this.settings = { ...DEFAULT_SETTINGS };
  }

}



document.addEventListener('DOMContentLoaded', () => {
  new OptionsPage();
});
