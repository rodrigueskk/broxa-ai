// Broxa AI Extension - Background Service Worker

// Garante que o painel lateral esteja disponível em todas as abas
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Ouve mensagens de outros scripts ou do site
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'OPEN_SIDE_PANEL') {
    chrome.sidePanel.open({ tabId: sender.tab.id });
  }
  return true;
});
