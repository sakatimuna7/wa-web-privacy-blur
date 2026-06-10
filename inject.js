/* ==========================================================================
   WA Web Privacy Blur - Page Context Inject Script
   ========================================================================== */

(function() {
  console.log("WA Web Privacy Injector Aktif, Bre!");

  let isWebSocketPaused = false;
  let queuedSends = [];
  const originalSend = WebSocket.prototype.send;

  // Intercept the send method of WebSockets
  WebSocket.prototype.send = function(data) {
    if (isWebSocketPaused) {
      queuedSends.push({ ws: this, args: arguments });
      // console.log("[WA Privacy] Outgoing message queued & blocked:", data);
      return;
    }
    return originalSend.apply(this, arguments);
  };

  // Listen for control messages from the content script
  window.addEventListener('message', (event) => {
    // Only accept messages from our content script
    if (event.source !== window) return;
    if (event.data && event.data.source === 'wa-privacy-content') {
      const action = event.data.action;

      if (action === 'pause') {
        isWebSocketPaused = true;
        queuedSends = [];
        // console.log("[WA Privacy] WebSocket paused");
      } else if (action === 'resume') {
        isWebSocketPaused = false;
        // Flush all queued sends
        // console.log(`[WA Privacy] WebSocket resumed. Flushing ${queuedSends.length} queued messages...`);
        queuedSends.forEach(item => {
          try {
            originalSend.apply(item.ws, item.args);
          } catch (e) {
            console.error("[WA Privacy] Error flushing queued message:", e);
          }
        });
        queuedSends = [];
      } else if (action === 'discard') {
        isWebSocketPaused = false;
        // console.log(`[WA Privacy] WebSocket resumed. Discarded ${queuedSends.length} queued messages!`);
        // Just empty the array and don't send anything
        queuedSends = [];
      }
    }
  });
})();
