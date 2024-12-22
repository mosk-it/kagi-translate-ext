document.addEventListener('DOMContentLoaded', () => {
  const kagiToken = document.getElementById('kagiToken');
  const languageFilter = document.getElementById('languageFilter');
  const languageGrid = document.getElementById('languageGrid');
  const saveButton = document.getElementById('saveSettings');
  const statusDiv = document.getElementById('status');

  // not all, ik
  const allLanguages = [
    'Automatic', 'English', 'Spanish', 'French', 'German', 'Italian',
    'Portuguese', 'Russian', 'Chinese', 'Japanese', 'Arabic', 'Korean',
    'Dutch', 'Swedish', 'Polish', 'Turkish', 'Hindi', 'Hebrew', 'Thai',
    'Vietnamese', 'Indonesian', 'Filipino', 'Malay'
  ];


  function renderLanguagesCheckboxes(languages) {
    languageGrid.innerHTML = '';
    languages.forEach(lang => {
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
      languageGrid.appendChild(languageDiv);
    });
  }

  // restore saved settings
  function restoreSelectedLanguages() {
    browser.storage.sync.get(['selectedLanguages', 'token']).then(result => {
      kagiToken.value = result.token || '';

      const selectedLanguages = result.selectedLanguages || [];
      document.querySelectorAll('#languageGrid input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = selectedLanguages.includes(checkbox.value);
      });
    });
  }

  // initial
  renderLanguagesCheckboxes(allLanguages);
  restoreSelectedLanguages();

  saveButton.addEventListener('click', () => {
    // collect languages
    const selectedLanguages = Array.from(
      document.querySelectorAll('#languageGrid input[type="checkbox"]:checked')
    ).map(checkbox => checkbox.value);

    // save
    browser.storage.sync.set({
      token: kagiToken.value.trim(),
      selectedLanguages: selectedLanguages
    }).then(() => {
      statusDiv.textContent = 'Settings saved successfully!';
      statusDiv.className = 'success';

      // clear status
      setTimeout(() => {
        statusDiv.textContent = '';
        statusDiv.className = '';
      }, 3000);
    }).catch(error => {
      statusDiv.textContent = 'Error saving settings';
      statusDiv.className = 'error';
      console.error(error);
    });
  });
});
