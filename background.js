chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);

  console.log('Unknown message type:', message.type);
  sendResponse({ error: 'Unknown message type.' });
  return true; // Ensure the message channel remains open
});