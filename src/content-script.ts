import { SettingsLoader } from "./shared/settings";
import browser from "webextension-polyfill";

let themeApplied = false;
let selectionTimeout: number | null = null;
let currentIcon: HTMLElement | null = null;
let currentPopup: HTMLElement | null = null;
let closeHandler: ((event: MouseEvent) => void) | null = null;
let closeIconHandler: ((event: MouseEvent) => void) | null = null;


let boundBubbleHandler: ((e: MouseEvent) => void) | null = null;
let boundSelectHandler: ((e: MouseEvent) => void) | null = null;

async function initializeWithSettings() {
  const sl = new SettingsLoader();
  const settings = await sl.loadSettings();

  cleanupEventListeners();
  injectScopedStyles(settings.theme);

  if (!settings.selectionAction) {
    return "";
  } else if (settings.selectionAction === "bubbleIcon") {
    boundBubbleHandler = (e: MouseEvent) =>
      handleSelectionWithIconBubble(e, settings);
    document.addEventListener("mouseup", boundBubbleHandler);
  } else if (settings.selectionAction === "selectPopup") {
    boundSelectHandler = (e: MouseEvent) =>
      handleSelectionWithSelectPopup(e, settings);
    document.addEventListener("mouseup", boundSelectHandler);
  }
}

function injectScopedStyles(theme: string) {
  if (document.getElementById('extension-popup-styles')) return;

  const link = document.createElement('link');
  link.id = 'extension-popup-styles';
  link.rel = 'stylesheet';
  link.href = browser.runtime.getURL('shared-styles.css');

  document.head.appendChild(link);
}



function getSelectPopupContainerClassName(theme) {
  console.log(theme);
  console.log(window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (theme == "auto") {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return "dark";
    } else {
      return 'light';
    }
  } else {
    return theme;
  }
}


function handleSelectionWithIconBubble(e: MouseEvent, settings) {
  if (selectionTimeout) {
    clearTimeout(selectionTimeout);
  }

  selectionTimeout = setTimeout(() => {
    const sel = window.getSelection();
    const selectedText = sel?.toString().trim() || "";

    if (sel && selectedText && sel.rangeCount > 0) {
      cleanUp();

      const icon = document.createElement("div");
      icon.style.left = `${e.clientX}px`;
      icon.style.top = `${e.clientY}px`;
      icon.innerHTML = "💬";
      icon.className = "";
      icon.classList.add('bubble-icon-translate')
      icon.classList.add('kte')


      const autoRemoveTimeout = setTimeout(() => {
        if (currentIcon) {
          currentIcon.remove();
          currentIcon = null;
        }
      }, 3000);

      icon.addEventListener("click", (clickEvent) => {
        clickEvent.stopPropagation();
        clearTimeout(autoRemoveTimeout);
        if (currentIcon) {
          currentIcon.remove();
          currentIcon = null;
        }
        if (closeIconHandler) {
          document.removeEventListener("click", closeIconHandler);
          closeIconHandler = null;
        }

        const idx = "tr-select-" + Date.now();
        const popup = createSelectPopupContainer(
          e.clientY + 10,
          e.clientX + 10,
          idx,
        );

        if (settings.customCSS) {
          const styleElement = document.createElement("style");
          styleElement.textContent = settings.customCSS;
          styleElement.id = `custom-css-${Date.now()}`;
          popup.appendChild(styleElement);
        }
        popup.classList.add(getSelectPopupContainerClassName(settings.theme));

        document.body.appendChild(popup);
        currentPopup = popup;

        browser.runtime.sendMessage({
          action: "translateText",
          txt: selectedText,
          elementId: idx,
        });

        closeHandler = (event: MouseEvent) => {
          if (!popup.contains(event.target as Node)) {
            popup.remove();
            currentPopup = null;
            if (closeHandler) {
              document.removeEventListener("click", closeHandler);
              closeHandler = null;
            }
          }
        };

        setTimeout(() => {
          document.addEventListener("click", closeHandler!);
        }, 0);
      });

      document.body.appendChild(icon);
      currentIcon = icon;

      closeIconHandler = (event: MouseEvent) => {
        if (currentIcon && !currentIcon.contains(event.target as Node)) {
          currentIcon.remove();
          currentIcon = null;
          if (closeIconHandler) {
            document.removeEventListener("click", closeIconHandler);
            closeIconHandler = null;
          }
        }
      };

      setTimeout(() => {
        document.addEventListener("click", closeIconHandler);
      }, 0);
    }
  }, 300) as unknown as number;
}

function handleSelectionWithSelectPopup(e: MouseEvent, settings) {
  if (selectionTimeout) {
    clearTimeout(selectionTimeout);
  }

  selectionTimeout = setTimeout(() => {
    const sel = window.getSelection();
    const selectedText = sel?.toString().trim() || "";

    if (sel && selectedText && sel.rangeCount > 0) {
      cleanUp();

      const idx = "tr-select-" + Date.now();
      const popup = createSelectPopupContainer(
        e.clientY + 10,
        e.clientX + 10,
        idx,
      );
        popup.classList.add(getSelectPopupContainerClassName(settings.theme));

      if (settings.customCSS) {
        const styleElement = document.createElement("style");
        styleElement.textContent = settings.customCSS;
        styleElement.id = `custom-css-${Date.now()}`;
        popup.appendChild(styleElement);
      }

      document.body.appendChild(popup);
      currentPopup = popup;

      browser.runtime.sendMessage({
        action: "translateText",
        txt: selectedText,
        elementId: idx,
      });

      closeHandler = (event: MouseEvent) => {
        if (!popup.contains(event.target as Node)) {
          popup.remove();
          currentPopup = null;
          if (closeHandler) {
            document.removeEventListener("click", closeHandler);
            closeHandler = null;
          }
        }
      };

      setTimeout(() => {
        document.addEventListener("click", closeHandler!);
      }, 0);
    }
  }, 300) as unknown as number;
}

function createSelectPopupContainer(
  offsetTop: number,
  offsetLeft: number,
  idx: string | null = null,
): HTMLDivElement {
  const popup = document.createElement("div");
  popup.className = "";
  popup.classList.add('select-popup-container');
  popup.classList.add('kte');

  popup.innerHTML = `
    <div class="kte select-popup-content">
      <p class="kte translation-text" id="${idx}" style=""></p>
    </div>
  `;

  popup.style.cssText = `
    top: ${offsetTop + 16}px;
    left: ${offsetLeft}px;
    position: absolute;
    z-index: 10001;
  `;

  return popup;
}

function cleanupEventListeners() {
  if (boundBubbleHandler) {
    document.removeEventListener("mouseup", boundBubbleHandler);
    boundBubbleHandler = null;
  }
  if (boundSelectHandler) {
    document.removeEventListener("mouseup", boundSelectHandler);
    boundSelectHandler = null;
  }
}

browser.runtime.onMessage.addListener((data) => {
  if (data.action === "partialTranslation") {
    const el = document.getElementById(data.elementId);
    if (el) el.textContent += data.chunk;
  }
});

function cleanUp() {
  if (currentIcon) {
    currentIcon.remove();
    currentIcon = null;
  }
  if (currentPopup) {
    currentPopup.remove();
    currentPopup = null;
  }
  if (closeHandler) {
    document.removeEventListener("click", closeHandler);
    closeHandler = null;
  }
  if (closeIconHandler) {
    document.removeEventListener("click", closeIconHandler);
    closeIconHandler = null;
  }
  document
    .querySelectorAll(".bubble-icon-translate")
    .forEach((el) => el.remove());
  document
    .querySelectorAll(".select-popup-container")
    .forEach((el) => el.remove());
}

initializeWithSettings().catch(console.error);
