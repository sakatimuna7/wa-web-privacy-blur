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

  // Sync listener via CustomEvent on document (crosses isolated-main world boundary)
  document.addEventListener('wa-privacy-ws-control', (e) => {
    if (!e || !e.detail) return;
    const action = e.detail.action;
    handleAction(action);
  });

  // Listen for control messages from the content script (async fallback)
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.source === 'wa-privacy-content') {
      handleAction(event.data.action);
    }
  });

  function handleAction(action) {
    if (action === 'pause') {
      isWebSocketPaused = true;
      queuedSends = [];
      console.log("[WA Privacy] WebSocket paused synchronously");
    } else if (action === 'resume') {
      isWebSocketPaused = false;
      console.log(`[WA Privacy] WebSocket resumed synchronously. Flushing ${queuedSends.length} messages...`);
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
      console.log(`[WA Privacy] WebSocket resumed synchronously. Discarding ${queuedSends.length} read receipts.`);
      queuedSends = [];
    }
  }
})();
