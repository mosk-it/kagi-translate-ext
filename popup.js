document.addEventListener('DOMContentLoaded', async () => {
  const translateText = document.getElementById('translateText');
  const fromLang = document.getElementById('fromLang');
  const toLang = document.getElementById('toLang');
  const translateButton = document.getElementById('translateButton');
  const resultDiv = document.getElementById('result');

  const storedData = await browser.storage.local.get('translatedSelectedText');
  if (storedData.translatedSelectedText) {
    translateText.value = storedData.translatedSelectedText;
    translateText.focus();
    // Clear the stored text
    await browser.storage.local.remove('translatedSelectedText');
  } else {

    try {
      const response = await browser.runtime.sendMessage({
        action: 'translateSelectedText'
      });

      if (response && response.selectedText) {
        translateText.value = response.selectedText;
        translateText.focus();
      }
    } catch (error) {
      console.error('Error getting selected text:', error);
    }
  }

  browser.storage.sync.get(['fromLang', 'toLang']).then(result => {
    if (result.fromLang) fromLang.value = result.fromLang;
    if (result.toLang) toLang.value = result.toLang;
  });

  fromLang.addEventListener('change', () => {
    browser.storage.sync.set({ fromLang: fromLang.value });
  });

  toLang.addEventListener('change', () => {
    browser.storage.sync.set({ toLang: toLang.value });
  });

  function populateLanguageDropdown(selectElement, languages) {
    const optionsContainer = selectElement;
    optionsContainer.innerHTML = '';

    languages.forEach(lang => {
      const option = document.createElement('option');
      option.setAttribute('value', lang);
      option.textContent = lang;
      optionsContainer.appendChild(option);
    });
  }

  browser.storage.sync.get(['selectedLanguages']).then(result => {
    const selectedLanguages = result.selectedLanguages || [];

    const fromLangSelect = document.getElementById('fromLang');
    const toLangSelect = document.getElementById('toLang');

    const sourceLanguages = [...selectedLanguages];
    populateLanguageDropdown(fromLangSelect, sourceLanguages);
    populateLanguageDropdown(toLangSelect, selectedLanguages);
  });

  translateButton.addEventListener('click', async () => {
    const text = translateText.value.trim();
    if (!text) return;

    const settings = await browser.storage.sync.get(['token']);

    try {
      const response = await fetch('https://translate.kagi.com/?/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Kagi-Authorization': settings.token || '',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          from: fromLang.value,
          to: toLang.value,
          text: text
        })
      });

      if (!response.ok) {
        throw new Error('Translation request failed');
      }

      const data = await response.json();
      resultDiv.textContent = JSON.parse(data.data)[2] || 'Translation failed';
    } catch (error) {
      resultDiv.textContent = 'Error translating text';
    }
  });
});
