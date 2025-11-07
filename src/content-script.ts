function notifySelection() {
    let sel = window.getSelection() ?? '';
    let selectedText = sel.toString().trim();

    if (selectedText) {
        browser.runtime.sendMessage({ action: "textSelected", "message": selectedText })
    }
}

document.addEventListener("mouseup", notifySelection);
