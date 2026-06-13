/* ==========================================================================
   WA Web Privacy Blur - Page Context Inject Script (MAIN World)
   ========================================================================== */

(function() {
  console.log("WA Web Privacy Injector Aktif, Bre!");

  let isWebSocketPaused = false;
  let queuedSends = [];
  const originalSend = WebSocket.prototype.send;

  // 1. Expose window.__waPeekActive backed by synchronous DOM attribute wa-peek-active
  Object.defineProperty(window, '__waPeekActive', {
    get: () => document.documentElement.getAttribute('wa-peek-active') === 'true',
    set: (val) => document.documentElement.setAttribute('wa-peek-active', String(val)),
    configurable: true
  });

  // Intercept the send method of WebSockets (outgoing messages)
  WebSocket.prototype.send = function(data) {
    const isPeekActive = window.__waPeekActive;
    
    // Check if payload looks like a read receipt (protobuf binary keywords)
    let looksLikeReadReceipt = false;
    try {
      let text = "";
      if (typeof data === "string") {
        text = data;
      } else {
        const buffer = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
        if (buffer instanceof Uint8Array || Array.isArray(buffer)) {
          if (typeof TextDecoder !== "undefined") {
            text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
          } else {
            const arr = [];
            const len = Math.min(buffer.length, 1000);
            for (let i = 0; i < len; i++) {
              arr.push(String.fromCharCode(buffer[i]));
            }
            text = arr.join("");
          }
        }
      }
      if (text && (text.includes("read") || text.includes("receipt") || text.includes("read-self"))) {
        looksLikeReadReceipt = true;
      }
    } catch (e) {}

    // Drop outgoing packet if we are in peek mode OR if it looks like a read receipt
    if (isPeekActive || looksLikeReadReceipt) {
      console.log("[WA Privacy] Outgoing read receipt/packet blocked during peek mode:", data);
      return; // Drop packet
    }

    // Classic pause/queue fallback
    if (isWebSocketPaused) {
      queuedSends.push({ ws: this, args: arguments });
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

  function handleAction(action) {
    if (action === 'pause') {
      isWebSocketPaused = true;
      queuedSends = [];
      console.log("[WA Privacy] WebSocket paused synchronously");
    } else if (action === 'resume') {
      isWebSocketPaused = false;
      console.log(`[WA Privacy] WebSocket resumed. Flushing ${queuedSends.length} messages...`);
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
      console.log(`[WA Privacy] WebSocket resumed. Discarding ${queuedSends.length} read receipts.`);
      queuedSends = [];
    }
  }

  // ==========================================================================
  // WINDOW.STORE EXPOSURE (WEBPACK HOOKS)
  // ==========================================================================
  
  function findStoreModules(webpackRequire) {
    const store = {};
    try {
      const keys = Object.keys(webpackRequire.m);
      for (const key of keys) {
        try {
          const moduleStr = webpackRequire.m[key].toString();
          
          if (
            moduleStr.includes('ChatCollection') || 
            moduleStr.includes('ChatStore') || 
            moduleStr.includes('MsgCollection') ||
            moduleStr.includes('MsgStore')
          ) {
            const m = webpackRequire(key);
            if (m) {
              if (m.Chat) store.Chat = m.Chat;
              if (m.Msg) store.Msg = m.Msg;
              
              if (m.default && typeof m.default === 'object') {
                if (m.default.Chat) store.Chat = m.default.Chat;
                if (m.default.Msg) store.Msg = m.default.Msg;
              }
            }
          }
          
          if (moduleStr.includes('ConnCollection') || moduleStr.includes('ConnStore')) {
            const m = webpackRequire(key);
            if (m) {
              if (m.Conn) store.Conn = m.Conn;
              if (m.default && typeof m.default === 'object' && m.default.Conn) {
                store.Conn = m.default.Conn;
              }
            }
          }
        } catch (e) {}
      }
    } catch (err) {
      console.error("[WA Privacy] Error scanning Webpack modules:", err);
    }
    
    if (store.Chat && store.Msg) {
      window.Store = store;
      console.log("[WA Privacy] window.Store successfully exposed!");
      return true;
    }
    return false;
  }

  // Polling for Webpack Chunk to grab webpack require
  const storeInitInterval = setInterval(() => {
    if (window.Store) {
      clearInterval(storeInitInterval);
      return;
    }

    try {
      // 1. Try finding via window.require
      if (typeof window.require !== 'undefined') {
        try {
          const waWebColls = window.require('WAWebCollections');
          if (waWebColls) {
            window.Store = waWebColls;
            console.log("[WA Privacy] window.Store exposed via window.require!");
            clearInterval(storeInitInterval);
            return;
          }
        } catch (e) {}
      }

      // 2. Hook into webpackChunkwhatsapp_web_client
      const chunkName = "webpackChunkwhatsapp_web_client";
      if (window[chunkName]) {
        let webpackRequire = null;
        window[chunkName].push([
          ["wa-privacy-hook-" + Math.floor(Math.random() * 10000)],
          {},
          (r) => { webpackRequire = r; }
        ]);

        if (webpackRequire) {
          const found = findStoreModules(webpackRequire);
          if (found) {
            clearInterval(storeInitInterval);
          }
        }
      }
    } catch (err) {
      console.error("[WA Privacy] Error in Store initializer loop:", err);
    }
  }, 1000);

  // ==========================================================================
  // STORE MESSAGE EXTRACTION BRIDGE
  // ==========================================================================

  function getChatMessagesFromStore(contactName) {
    if (!window.Store || !window.Store.Chat) {
      return null;
    }

    const normalize = (name) => {
      if (!name) return '';
      let clean = name.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDFFF]/g, '');
      return clean.toLowerCase().replace(/[\s\p{P}]/gu, ' ').trim().replace(/\s+/g, ' ');
    };

    const targetNorm = normalize(contactName);

    const chats = window.Store.Chat.models || 
                  (typeof window.Store.Chat.getModels === 'function' ? window.Store.Chat.getModels() : []) ||
                  window.Store.Chat;
                  
    if (!chats || !chats.length) return null;

    let chat = null;
    for (const c of chats) {
      const name = c.name || c.formattedTitle || (c.contact && c.contact.name) || '';
      const jid = c.id && c.id._serialized ? c.id._serialized : '';
      if (normalize(name) === targetNorm || (jid && normalize(jid) === targetNorm)) {
        chat = c;
        break;
      }
    }

    if (!chat) return null;

    const msgsCollection = chat.msgs;
    if (!msgsCollection) return null;

    const msgs = msgsCollection.models || 
                 (typeof msgsCollection.getModels === 'function' ? msgsCollection.getModels() : []) ||
                 msgsCollection;
                 
    if (!msgs) return [];

    const parsed = [];
    const latestMsgs = msgs.slice(-15);

    latestMsgs.forEach(m => {
      const dir = m.id && m.id.fromMe ? 'out' : 'in';
      let text = m.body || m.text || '';
      
      let time = '';
      const timestamp = m.t || m.timestamp;
      if (timestamp) {
        const date = new Date(timestamp * 1000);
        time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      }

      const hasImage = m.type === 'image' || m.type === 'sticker';
      const hasVideo = m.type === 'video';
      const hasAudio = m.type === 'audio' || m.type === 'ptt';

      let imgSrc = null;
      let videoSrc = null;
      let videoPoster = null;
      let audioSrc = null;

      const media = m.mediaData || {};
      let mediaUrl = media.renderableUrl || media.preview || m.deprecatedMms3Url || null;
      let blobUrl = null;
      
      if (media.downloadedWebBlob instanceof Blob) {
        try {
          blobUrl = URL.createObjectURL(media.downloadedWebBlob);
        } catch (err) {}
      }

      const finalUrl = blobUrl || mediaUrl;

      if (hasImage) {
        imgSrc = finalUrl;
      } else if (hasVideo) {
        videoSrc = finalUrl;
        videoPoster = media.preview || null;
      } else if (hasAudio) {
        audioSrc = finalUrl;
      }

      parsed.push({
        dir: dir,
        text: text,
        time: time,
        hasImage: hasImage,
        hasVideo: hasVideo,
        hasAudio: hasAudio,
        imgSrc: imgSrc,
        videoSrc: videoSrc,
        videoPoster: videoPoster,
        audioSrc: audioSrc
      });
    });

    return parsed;
  }

  // Handle message requests from isolated content script
  document.addEventListener('wa-privacy-store-request', (e) => {
    if (!e || !e.detail) return;
    const { requestId, contactName } = e.detail;
    
    console.log(`[WA Privacy] Message extraction request received for: "${contactName}" (ID: ${requestId})`);
    const messages = getChatMessagesFromStore(contactName);
    
    document.dispatchEvent(new CustomEvent('wa-privacy-store-response', {
      detail: { requestId, messages }
    }));
  });

})();
