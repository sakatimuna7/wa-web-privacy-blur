/* ==========================================================================
   WA Web Privacy Blur - Background Script
   ========================================================================== */

// Listen for keyboard command (Alt + B)
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-blur') {
    const defaults = { mainActive: true };
    chrome.storage.local.get(defaults, (settings) => {
      const nextState = !settings.mainActive;
      chrome.storage.local.set({ mainActive: nextState }, () => {
        console.log(`Privacy Blur toggle state changed to: ${nextState}`);
      });
    });
  }
});
