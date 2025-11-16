import  ALL_LANGUAGES   from './shared/languages.json';
import { SETTINGS_KEY } from './shared/settings';
import { resetSettings } from "./shared/settings";

var browser = require("webextension-polyfill");
import { SettingsLoader, SettingsInterface, DEFAULT_SETTINGS } from './shared/settings'
import { LanguageInterface } from './shared/languages'

class OptionsPage {

  protected languageFilter: HTMLInputElement;
  protected languageGrid: HTMLDivElement;
  protected saveButton: HTMLButtonElement;
  protected statusDiv: HTMLDivElement;
  protected showAllLangsButton: HTMLButtonElement;
  protected autoTranslateCheckbox: HTMLInputElement;
  protected openMinimalPopupCheckbox: HTMLInputElement;

  protected advancedOpen: boolean;

  private readonly  allLanguages: LanguageInterface[] = ALL_LANGUAGES;

  private settingsManager: SettingsManager;


  constructor() {

    this.languageGrid = document.getElementById('languageGrid') as HTMLDivElement;

    this.settingsManager = new SettingsManager();

    this.saveButton = document.getElementById('saveSettings') as HTMLButtonElement;
    this.statusDiv = document.getElementById('status') as HTMLDivElement;
    this.showAllLangsButton = document.getElementById('showAllLangs') as HTMLButtonElement;
    this.autoTranslateCheckbox = document.getElementById('autoTranslateOnPopup') as HTMLInputElement; // get checkbox
    // this.openMinimalPopupCheckbox = document.getElementById('openMinimalPopup') as HTMLInputElement;

    this.initializeEventListeners();
    this.autoDetectionSelectFillLangs();
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


    for (let el of document.querySelectorAll('.theme-radio')) {
      el.addEventListener('click', async(e) => {
        if (e.target) {
          document.documentElement.classList.remove('auto', 'dark', 'light');
          document.documentElement.classList.add(e.target.value);
        }
      });
    }



  }

  private async loadSettingsIntoUI(): Promise<void> {
    try {
      await this.renderLanguagesCheckboxes();
      const settings = this.settingsManager.getSettings();
      this.setChecked('autoTranslateOnPopup', settings.autoTranslateOnPopup);
      this.setChecked('bubbleIcon', settings.bubbleIcon);
      // this.setChecked('autoDetectLanguageInPopup', settings.autoDetectLanguageInPopup);

      const selectionActionElement = document.querySelector(`input[name="selectionAction"][value="${settings.selectionAction}"]`) as HTMLInputElement;
      if (selectionActionElement) {
        selectionActionElement.checked = true;
      }


      const themeElement = document.querySelector(`input[name="theme"][value="${settings.theme}"]`) as HTMLInputElement;
      if (themeElement) {
        themeElement.checked = true;
      }

      for (let selectedLang of settings.selectedLanguages) {
        this.setChecked(this.langToId(selectedLang.iso), true);
      }

      this.setValueToElement('autoDetectLangTo', settings.autoDetectLangTo || '');
      this.setValueToElement('autoDetectLangToAlt', settings.autoDetectLangToAlt || '');

      this.setValueToElement('customCSS', settings.customCSS);


        console.log(document.documentElement.className)
        console.log(settings.theme)
        document.documentElement.className = settings.theme;

    } catch (error) {
      console.warn('Failed to load settings into UI:', error);
      this.showStatusMessage('Failed to load settings', 'error');
    }
  }

  private async saveSettingsFromUI(): Promise<void> {
    try {
      const settings = await this.settingsManager.getSettings();

      settings.autoTranslateOnPopup = this.getChecked('autoTranslateOnPopup');
      settings.bubbleIcon = this.getChecked('bubbleIcon');
      settings.autoDetectLanguageInPopup = this.getChecked('autoDetectLanguageInPopup');

      const checkedLanguages = this.languageGrid.querySelectorAll('input[type="checkbox"]:checked');

      let selLangs: LanguageInterface[] = []
      checkedLanguages.forEach(checkbox => {
        const langName = checkbox.getAttribute('data-lang');
        const langIso = checkbox.getAttribute('data-iso');
        if (langIso && langName) {
          selLangs.push( { lang: langName, iso: langIso});
        }
      });
      settings.selectedLanguages = selLangs;

      settings.selectionAction = (document.querySelector('input[name="selectionAction"]:checked') as HTMLInputElement)?.value as "" | "bubbleIcon" | "selectPopup" || '';


      settings.theme = (document.querySelector('input[name="theme"]:checked') as HTMLInputElement)?.value as "auto" | "dark" | "light" || '';

      settings.autoDetectLangTo = this.getValueFromElement('autoDetectLangTo');
      settings.autoDetectLangToAlt = this.getValueFromElement('autoDetectLangToAlt');
      settings.customCSS = this.getValueFromElement('customCSS');

      this.settingsManager.updateSettings(settings);
      this.settingsManager.save().then(() => {
          this.showStatusMessage('Settings saved successfully!', 'success')
        }
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

  private async renderLanguagesCheckboxes(): Promise<void> {
    await this.settingsManager.ensureSettingsLoaded();
    this.languageGrid.innerHTML = '';
    let selectedIsoCodes = this.settingsManager.getSettings().selectedLanguages.map(language => language.iso);
    const languageDiv = this.createLanguageCheckbox({lang: "Automatic", iso:"auto"}, true);
    this.languageGrid.appendChild(languageDiv);
    this.allLanguages.forEach(ob => {
      //ob.m defines if lang is by default hidden
      const languageDiv = this.createLanguageCheckbox(ob, ob.m || selectedIsoCodes.includes(ob.iso));
      this.languageGrid.appendChild(languageDiv);
    });
  }

  private langToId(lang: string): string {
    return 'lang-' + lang.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-');
  }

  private createLanguageCheckbox(lang: LanguageInterface, isVisible: boolean = false): HTMLDivElement {
    const languageDiv = document.createElement('div');
    languageDiv.classList.add('language-checkbox');

    let langId = this.langToId(lang.iso);

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = langId;
    checkbox.value = lang.iso;
    checkbox.setAttribute('data-iso', lang.iso);
    checkbox.setAttribute('data-lang', lang.lang);

    const label = document.createElement('label');
    label.htmlFor = langId;
    if (!isVisible) {
        languageDiv.style.display = 'none';
    }
    label.textContent = lang.lang;

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

  private autoDetectionSelectFillLangs() {
    this.populateLanguageToSelect("autoDetectLangTo", [...this.allLanguages]);
    this.populateLanguageToSelect("autoDetectLangToAlt", [ ...this.allLanguages, ]);
  }

  private populateLanguageToSelect(
    selectId: string,
    languages: LanguageInterface[],
  ): void {
    languages.sort((x, y) => x.lang.localeCompare(y.lang));

    let selectElement = document.getElementById(selectId);
    if (!selectElement) {
      console.error(`Not found select ${selectId}`);
      return;
    }

    languages.forEach((lang) => {
      const option = document.createElement("option");
      option.setAttribute("value", lang.iso);
      option.textContent = lang.lang;
      selectElement.appendChild(option);
    });
  }


}

class SettingsManager extends SettingsLoader {

  private settingsLoaded: Promise<SettingsInterface> | null = null;

  constructor() {
    super();

    this.settingsLoaded = this.loadSettings();
  }

  public async ensureSettingsLoaded(): Promise<void> {
    if (this.settingsLoaded) {
      await this.settingsLoaded;
    }
  }

  public async save(): Promise<void> {
    try {
      const settingsObj = {
        [SETTINGS_KEY]: this.settings
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
    resetSettings()
    this.loadSettings()
  }

}



document.addEventListener('DOMContentLoaded', () => {
  new OptionsPage();
});
