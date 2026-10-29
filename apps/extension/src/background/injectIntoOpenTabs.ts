// Adds the content script to tabs that were open before the extension loaded.
export async function injectIntoOpenTabs(): Promise<void> {
  const files =
    chrome.runtime
      .getManifest()
      .content_scripts?.flatMap((script) => script.js ?? []) ?? [];
  const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });

  for (const tab of tabs) {
    if (tab.id === undefined) continue;
    chrome.scripting
      .executeScript({ target: { tabId: tab.id }, files })
      .catch(() => {});
  }
}
