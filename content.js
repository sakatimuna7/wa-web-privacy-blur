/* ==========================================================================
   WA Web Privacy Blur - Content Script
   ========================================================================== */

(function () {
  console.log("WA Web Privacy Blur Aktif, Bre!");

  // Defaults matching popup.js
  const defaults = {
    mainActive: true,
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
    valIdle: 5
  };

  // Idle Timer State
  let idleTimer = null;
  let isIdleEnabled = false;
  let idleDurationMs = 5 * 60 * 1000; // default 5 minutes
  let isOverlayActive = false;

  // 1. Initialize and monitor settings
  const applySettings = (settings) => {
    const root = document.documentElement;

    if (!settings.mainActive) {
      // If extension is disabled, clear all classes and stop idle timer
      removeAllPrivacyClasses();
      stopIdleTracking();
      hideIdleOverlay();
      return;
    }

    // A. Apply CSS Variables for blur levels and transition speed
    root.style.setProperty('--wa-blur-messages', `${settings.valMessages}px`);
    root.style.setProperty('--wa-blur-previews', `${settings.valPreviews}px`);
    root.style.setProperty('--wa-blur-media', `${settings.valMedia}px`);
    root.style.setProperty('--wa-blur-gallery', `${settings.valGallery}px`);
    root.style.setProperty('--wa-blur-avatars', `${settings.valAvatars}px`);
    root.style.setProperty('--wa-blur-names', `${settings.valNames}px`);
    root.style.setProperty('--wa-transition-duration', settings.noTransition ? '0s' : '0.2s');

    // B. Apply Classes for Active Blurs
    toggleClassName(root, 'wa-blur-messages-active', settings.blurMessages);
    toggleClassName(root, 'wa-blur-previews-active', settings.blurPreviews);
    toggleClassName(root, 'wa-blur-media-active', settings.blurMedia);
    toggleClassName(root, 'wa-blur-gallery-active', settings.blurGallery);
    toggleClassName(root, 'wa-blur-input-active', settings.blurInput);
    toggleClassName(root, 'wa-blur-avatars-active', settings.blurAvatars);
    toggleClassName(root, 'wa-blur-names-active', settings.blurNames);
    toggleClassName(root, 'wa-unblur-hover-active', settings.unblurHover);

    // C. Setup Idle Detection
    isIdleEnabled = settings.blurIdle;
    idleDurationMs = settings.valIdle * 60 * 1000;
    
    if (isIdleEnabled) {
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
      'wa-blur-messages-active',
      'wa-blur-previews-active',
      'wa-blur-media-active',
      'wa-blur-gallery-active',
      'wa-blur-input-active',
      'wa-blur-avatars-active',
      'wa-blur-names-active',
      'wa-unblur-hover-active'
    );
  };

  // 2. Idle Timer / Inactivity Monitoring
  const resetIdleTimer = () => {
    if (isOverlayActive) return; // Don't reset if already locked!
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
    
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'wa-privacy-idle-overlay';
      overlay.innerHTML = `
        <div class="lock-box">
          <svg class="lock-icon" viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <h2>WhatsApp Terkunci</h2>
          <p>Layar diburamkan karena lo tidak aktif. Klik di mana saja untuk membuka, bre!</p>
        </div>
      `;
      document.body.appendChild(overlay);
      
      overlay.addEventListener('click', () => {
        hideIdleOverlay();
      });
    }
    
    document.documentElement.classList.add('wa-idle-active');
    overlay.classList.add('visible');
    isOverlayActive = true;
    stopIdleTracking(); // Stop reset checks while locked
  };

  const hideIdleOverlay = () => {
    const overlay = document.getElementById('wa-privacy-idle-overlay');
    if (overlay) {
      overlay.classList.remove('visible');
    }
    document.documentElement.classList.remove('wa-idle-active');
    isOverlayActive = false;
    if (isIdleEnabled) {
      startIdleTracking(); // Re-track activity
    }
  };

  // 4. Listen for settings updates from the popup
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      chrome.storage.local.get(defaults, (settings) => {
        applySettings(settings);
      });
    }
  });

  // 5. Initial Run
  chrome.storage.local.get(defaults, (settings) => {
    applySettings(settings);
  });

})();
