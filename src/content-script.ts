function copySelection() {
  let selectedText = window.getSelection().toString().trim();

  console.log(copySelection);

  if (selectedText) {
    browser.runtime.sendMessage({ action: "textSelected", "message": selectedText })
  }
}

document.addEventListener("mouseup", copySelection);
