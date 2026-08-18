const RESTRICTED_URL_PREFIXES = [
  "chrome://",
  "chrome-extension://",
  "edge://",
  "about:",
  "devtools://",
  "https://chrome.google.com/webstore",
];

function isRestrictedUrl(url) {
  if (!url) return true;
  return RESTRICTED_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
}

function sendTriggerToActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || !tab.id) return;
    if (isRestrictedUrl(tab.url)) return;

    chrome.tabs.sendMessage(tab.id, { type: "TRIGGER_AUTOFILL" }, () => {
      if (chrome.runtime.lastError) {
        return;
      }
    });
  });
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("onboarding.html") });
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "trigger-autofill") {
    sendTriggerToActiveTab();
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message && message.type === "TRIGGER_AUTOFILL_FROM_POPUP") {
    sendTriggerToActiveTab();
  }
});
