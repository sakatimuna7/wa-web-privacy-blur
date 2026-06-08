/* ==========================================================================
   WA Web Privacy Blur - Content Script
   ========================================================================== */

(function () {
  console.log("WA Web Privacy Blur Aktif, Bre!");

  // Defaults matching popup.js
  const defaults = {
    mainActive: true,
    blurStyle: 'blur',
    blurMessages: true,
    valMessages: 8,
    blurPreviews: true,
    valPreviews: 6,
    blurMedia: true,
    valMedia: 15,
    blurGallery: true,
    valGallery: 15,
    blurInput: true,
    blurAvatars: false,
    valAvatars: 10,
    blurNames: false,
    valNames: 10,
    noTransition: true,
    unblurHover: false,
    blurIdle: false,
    valIdle: 5,
    usePin: false,
    securityPin: '1234',
    panicButton: false,
    isLocked: false,
    selectivelyBlurredChats: []
  };

  // State Variables
  let idleTimer = null;
  let isIdleEnabled = false;
  let idleDurationMs = 5 * 60 * 1000;
  let isOverlayActive = false;

  let selectivelyBlurredChats = [];
  let isExtensionActive = true;
  
  let isPinEnabled = false;
  let currentSecurityPin = '1234';
  let enteredPin = '';

  // 1. Initialize and monitor settings
  const applySettings = (settings) => {
    const root = document.documentElement;
    isExtensionActive = settings.mainActive;
    selectivelyBlurredChats = settings.selectivelyBlurredChats || [];

    if (!settings.mainActive) {
      // If extension is disabled, clear all classes and stop idle timer
      removeAllPrivacyClasses();
      stopIdleTracking();
      hideIdleOverlay();
      removePanicButton();
      removeSelectiveLocks();
      chrome.storage.local.set({ isLocked: false });
      return;
    }

    // Call scan immediately when settings are updated
    setTimeout(scanSelectiveChats, 50);

    // A. Apply Blur Style Class
    root.classList.remove('wa-style-blur', 'wa-style-solid', 'wa-style-faded');
    root.classList.add(`wa-style-${settings.blurStyle}`);

    // B. Apply CSS Variables for blur levels and transition speed
    root.style.setProperty('--wa-blur-messages', `${settings.valMessages}px`);
    root.style.setProperty('--wa-blur-previews', `${settings.valPreviews}px`);
    root.style.setProperty('--wa-blur-media', `${settings.valMedia}px`);
    root.style.setProperty('--wa-blur-gallery', `${settings.valGallery}px`);
    root.style.setProperty('--wa-blur-avatars', `${settings.valAvatars}px`);
    root.style.setProperty('--wa-blur-names', `${settings.valNames}px`);
    root.style.setProperty('--wa-transition-duration', settings.noTransition ? '0s' : '0.2s');

    // C. Apply Classes for Active Blurs
    toggleClassName(root, 'wa-blur-messages-active', settings.blurMessages);
    toggleClassName(root, 'wa-blur-previews-active', settings.blurPreviews);
    toggleClassName(root, 'wa-blur-media-active', settings.blurMedia);
    toggleClassName(root, 'wa-blur-gallery-active', settings.blurGallery);
    toggleClassName(root, 'wa-blur-input-active', settings.blurInput);
    toggleClassName(root, 'wa-blur-avatars-active', settings.blurAvatars);
    toggleClassName(root, 'wa-blur-names-active', settings.blurNames);
    toggleClassName(root, 'wa-unblur-hover-active', settings.unblurHover);

    // D. PIN and Panic Button Configurations
    isPinEnabled = settings.usePin;
    currentSecurityPin = settings.securityPin;

    if (settings.panicButton) {
      renderPanicButton();
    } else {
      removePanicButton();
    }

    // E. Setup Idle Detection
    isIdleEnabled = settings.blurIdle;
    idleDurationMs = settings.valIdle * 60 * 1000;
    
    if (settings.isLocked) {
      showIdleOverlay();
    } else if (isIdleEnabled) {
      startIdleTracking();
    } else {
      stopIdleTracking();
      hideIdleOverlay();
    }
  };

  // Class Toggle Helper
  const toggleClassName = (element, className, force) => {
    if (force) {
      element.classList.add(className);
    } else {
      element.classList.remove(className);
    }
  };

  // Remove All Blur Classes
  const removeAllPrivacyClasses = () => {
    const root = document.documentElement;
    root.classList.remove(
      'wa-style-blur',
      'wa-style-solid',
      'wa-style-faded',
      'wa-blur-messages-active',
      'wa-blur-previews-active',
      'wa-blur-media-active',
      'wa-blur-gallery-active',
      'wa-blur-input-active',
      'wa-blur-avatars-active',
      'wa-blur-names-active',
      'wa-unblur-hover-active',
      'wa-active-chat-locked'
    );
  };

  // 2. Idle Timer / Inactivity Monitoring
  const resetIdleTimer = () => {
    if (isOverlayActive) return;
    clearTimeout(idleTimer);
    if (isIdleEnabled) {
      idleTimer = setTimeout(showIdleOverlay, idleDurationMs);
    }
  };

  const startIdleTracking = () => {
    stopIdleTracking(); // Clean up existing listeners
    
    // Activity triggers
    window.addEventListener('mousemove', resetIdleTimer, { passive: true });
    window.addEventListener('mousedown', resetIdleTimer, { passive: true });
    window.addEventListener('keydown', resetIdleTimer, { passive: true });
    window.addEventListener('scroll', resetIdleTimer, { passive: true });
    window.addEventListener('touchstart', resetIdleTimer, { passive: true });
    
    resetIdleTimer();
  };

  const stopIdleTracking = () => {
    clearTimeout(idleTimer);
    window.removeEventListener('mousemove', resetIdleTimer);
    window.removeEventListener('mousedown', resetIdleTimer);
    window.removeEventListener('keydown', resetIdleTimer);
    window.removeEventListener('scroll', resetIdleTimer);
    window.removeEventListener('touchstart', resetIdleTimer);
  };

  // 3. Lock Overlay Management
  const showIdleOverlay = () => {
    let overlay = document.getElementById('wa-privacy-idle-overlay');
    enteredPin = '';
    
    // Save state to storage so it persists across reloads!
    chrome.storage.local.set({ isLocked: true });

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'wa-privacy-idle-overlay';
      document.body.appendChild(overlay);
    }

    // Build inner lockbox layout based on PIN setting
    if (isPinEnabled) {
      overlay.innerHTML = `
        <div class="lock-box" id="wa-lock-box-container">
          <svg class="lock-icon" viewBox="0 0 24 24" width="44" height="44" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <h2>WhatsApp Terkunci</h2>
          <p>Masukkan 4-digit PIN keamanan lo untuk membuka, bre!</p>
          <div class="pin-container">
            <div class="pin-dots">
              <div class="pin-dot" id="dot-0"></div>
              <div class="pin-dot" id="dot-1"></div>
              <div class="pin-dot" id="dot-2"></div>
              <div class="pin-dot" id="dot-3"></div>
            </div>
            <div class="error-text" id="wa-pin-error-msg">PIN Salah, bre!</div>
            <div class="pin-keyboard">
              <div class="pin-key num-key" data-val="1">1</div>
              <div class="pin-key num-key" data-val="2">2</div>
              <div class="pin-key num-key" data-val="3">3</div>
              <div class="pin-key num-key" data-val="4">4</div>
              <div class="pin-key num-key" data-val="5">5</div>
              <div class="pin-key num-key" data-val="6">6</div>
              <div class="pin-key num-key" data-val="7">7</div>
              <div class="pin-key num-key" data-val="8">8</div>
              <div class="pin-key num-key" data-val="9">9</div>
              <div class="pin-key action-key" id="key-clear">C</div>
              <div class="pin-key num-key" data-val="0">0</div>
              <div class="pin-key action-key" id="key-backspace">⌫</div>
            </div>
          </div>
        </div>
      `;

      // Set keyboard listeners
      overlay.querySelectorAll('.num-key').forEach(key => {
        key.addEventListener('click', (e) => {
          e.stopPropagation();
          enterPinDigit(key.getAttribute('data-val'));
        });
      });

      overlay.querySelector('#key-clear').addEventListener('click', (e) => {
        e.stopPropagation();
        clearPinDigits();
      });

      overlay.querySelector('#key-backspace').addEventListener('click', (e) => {
        e.stopPropagation();
        popPinDigit();
      });

      // Avoid outer click unlock when PIN is active
      overlay.onclick = null;
    } else {
      // Standard click to unlock overlay
      overlay.innerHTML = `
        <div class="lock-box">
          <svg class="lock-icon" viewBox="0 0 24 24" width="44" height="44" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <h2>WhatsApp Terkunci</h2>
          <p>Layar diburamkan karena lo sedang tidak aktif. Klik di mana saja untuk membuka kembali, bre!</p>
        </div>
      `;
      overlay.onclick = () => {
        hideIdleOverlay();
      };
    }
    
    document.documentElement.classList.add('wa-idle-active');
    overlay.classList.add('visible');
    isOverlayActive = true;
    stopIdleTracking();

    // Register physical keyboard inputs
    window.addEventListener('keydown', handlePhysicalKeyboard, true);
  };

  const hideIdleOverlay = () => {
    const overlay = document.getElementById('wa-privacy-idle-overlay');
    if (overlay) {
      overlay.classList.remove('visible');
    }
    document.documentElement.classList.remove('wa-idle-active');
    isOverlayActive = false;
    
    // Save state to storage!
    chrome.storage.local.set({ isLocked: false });

    window.removeEventListener('keydown', handlePhysicalKeyboard, true);

    if (isIdleEnabled) {
      startIdleTracking();
    }
  };

  // 4. PIN Keyboard Digit Handler
  const enterPinDigit = (digit) => {
    if (enteredPin.length >= 4) return;
    enteredPin += digit;
    updatePinDots();

    if (enteredPin.length === 4) {
      setTimeout(verifySecurityPin, 200);
    }
  };

  const popPinDigit = () => {
    if (enteredPin.length === 0) return;
    enteredPin = enteredPin.slice(0, -1);
    updatePinDots();
  };

  const clearPinDigits = () => {
    enteredPin = '';
    updatePinDots();
  };

  const updatePinDots = () => {
    for (let i = 0; i < 4; i++) {
      const dot = document.getElementById(`dot-${i}`);
      if (dot) {
        toggleClassName(dot, 'active', i < enteredPin.length);
      }
    }
  };

  const verifySecurityPin = () => {
    const errorMsg = document.getElementById('wa-pin-error-msg');
    const lockBox = document.getElementById('wa-lock-box-container');

    if (enteredPin === currentSecurityPin) {
      hideIdleOverlay();
    } else {
      // Wrong PIN feedback: Shake animation + Error text
      if (lockBox) {
        lockBox.classList.add('shake');
        setTimeout(() => lockBox.classList.remove('shake'), 400);
      }
      if (errorMsg) {
        errorMsg.classList.add('visible');
        setTimeout(() => errorMsg.classList.remove('visible'), 1500);
      }
      clearPinDigits();
    }
  };

  const handlePhysicalKeyboard = (e) => {
    if (!isOverlayActive || !isPinEnabled) return;
    
    if (e.key >= '0' && e.key <= '9') {
      e.stopPropagation();
      e.preventDefault();
      enterPinDigit(e.key);
    } else if (e.key === 'Backspace') {
      e.stopPropagation();
      e.preventDefault();
      popPinDigit();
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      clearPinDigits();
    }
  };

  // 5. Floating Panic Button
  const renderPanicButton = () => {
    let panicBtn = document.getElementById('wa-panic-button');
    if (!panicBtn) {
      panicBtn = document.createElement('button');
      panicBtn.id = 'wa-panic-button';
      panicBtn.title = 'Kunci layar instan (Panic Button)';
      panicBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      `;
      document.body.appendChild(panicBtn);
      
      panicBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showIdleOverlay();
      });
    }
  };

  const removePanicButton = () => {
    const panicBtn = document.getElementById('wa-panic-button');
    if (panicBtn) {
      panicBtn.remove();
    }
  };

  // ==========================================================================
  // SELECTIVE CHAT BLUR LOGIC
  // ==========================================================================

  function getRowElement(container) {
    let parent = container.parentElement;
    while (parent && parent !== document.body) {
      if (parent.querySelector('[data-testid="avatar"]') || parent.querySelector('[data-testid="chat-avatar"]')) {
        return parent;
      }
      parent = parent.parentElement;
    }
    return container;
  }

  function getActiveChatName() {
    const header = document.querySelector('[data-testid="conversation-info-header"]') || 
                   document.querySelector('header');
    if (header) {
      const titleEl = header.querySelector('[data-testid="conversation-info-header-chat-title"]') || 
                      header.querySelector('span[title]') || 
                      header.querySelector('[dir="auto"]');
      if (titleEl) {
        return (titleEl.getAttribute('title') || titleEl.textContent || '').trim();
      }
    }
    return '';
  }

  function toggleChatLock(name) {
    chrome.storage.local.get(defaults, (settings) => {
      let list = settings.selectivelyBlurredChats || [];
      if (list.includes(name)) {
        list = list.filter(item => item !== name);
      } else {
        list.push(name);
      }
      chrome.storage.local.set({ selectivelyBlurredChats: list }, () => {
        selectivelyBlurredChats = list;
        scanSelectiveChats();
      });
    });
  }

  function removeSelectiveLocks() {
    document.querySelectorAll('.wa-selective-lock-btn').forEach(btn => btn.remove());
    document.querySelectorAll('.wa-row-locked').forEach(row => row.classList.remove('wa-row-locked'));
    document.documentElement.classList.remove('wa-active-chat-locked');
  }

  function scanSelectiveChats() {
    if (!isExtensionActive) {
      removeSelectiveLocks();
      return;
    }

    // 1. Scan chat list rows
    const containers = document.querySelectorAll('[data-testid="cell-frame-container"]');
    containers.forEach(container => {
      const titleEl = container.querySelector('[data-testid="cell-frame-title"] span[title]') || 
                      container.querySelector('[data-testid="cell-frame-title"]') || 
                      container.querySelector('span[title]');
      if (!titleEl) return;
      const name = (titleEl.getAttribute('title') || titleEl.textContent || '').trim();
      if (!name) return;

      let lockBtn = container.querySelector('.wa-selective-lock-btn');
      if (!lockBtn) {
        lockBtn = document.createElement('div');
        lockBtn.className = 'wa-selective-lock-btn';
        lockBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          const currentName = lockBtn.getAttribute('data-name');
          if (currentName) {
            toggleChatLock(currentName);
          }
        });
        container.appendChild(lockBtn);
      }

      lockBtn.setAttribute('data-name', name);

      const isLocked = selectivelyBlurredChats.includes(name);
      const rowEl = getRowElement(container);

      if (isLocked) {
        lockBtn.classList.add('locked');
        lockBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        `;
        if (rowEl) {
          rowEl.classList.add('wa-row-locked');
        }
      } else {
        lockBtn.classList.remove('locked');
        lockBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
          </svg>
        `;
        if (rowEl) {
          rowEl.classList.remove('wa-row-locked');
        }
      }
    });

    // 2. Scan active chat header
    const activeChatName = getActiveChatName();
    const root = document.documentElement;
    if (activeChatName && selectivelyBlurredChats.includes(activeChatName)) {
      root.classList.add('wa-active-chat-locked');
    } else {
      root.classList.remove('wa-active-chat-locked');
    }
  }

  // Start periodic scanning
  const scanInterval = setInterval(scanSelectiveChats, 500);

  // 6. Listen for settings updates from the popup
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      chrome.storage.local.get(defaults, (settings) => {
        applySettings(settings);
      });
    }
  });

  // 7. Initial Run
  chrome.storage.local.get(defaults, (settings) => {
    applySettings(settings);
  });

})();
