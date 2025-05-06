browser.commands.onCommand.addListener(async (command) => {
  if (command === "open-popup") {
    console.log('open-popup ojojoj');
    await browser.action.openPopup();
  }
});
