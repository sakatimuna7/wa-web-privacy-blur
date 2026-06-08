document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const mainActiveToggle = document.getElementById('main-active-toggle');
  const settingsCard = document.querySelector('.settings-card');
  const blurStyleSelect = document.getElementById('blur-style-select');
  
  const toggles = {
    messages: document.getElementById('toggle-blur-messages'),
    previews: document.getElementById('toggle-blur-previews'),
    media: document.getElementById('toggle-blur-media'),
    gallery: document.getElementById('toggle-blur-gallery'),
    input: document.getElementById('toggle-blur-input'),
    avatars: document.getElementById('toggle-blur-avatars'),
    names: document.getElementById('toggle-blur-names'),
    transition: document.getElementById('toggle-no-transition'),
    hover: document.getElementById('toggle-unblur-hover'),
    idle: document.getElementById('toggle-blur-idle'),
    usePin: document.getElementById('toggle-use-pin'),
    panicButton: document.getElementById('toggle-panic-button')
  };

  const sliders = {
    messages: document.getElementById('slide-messages'),
    previews: document.getElementById('slide-previews'),
    media: document.getElementById('slide-media'),
    gallery: document.getElementById('slide-gallery'),
    avatars: document.getElementById('slide-avatars'),
    names: document.getElementById('slide-names'),
    idle: document.getElementById('slide-idle')
  };

  const valueLabels = {
    messages: document.getElementById('val-messages'),
    previews: document.getElementById('val-previews'),
    media: document.getElementById('val-media'),
    gallery: document.getElementById('val-gallery'),
    avatars: document.getElementById('val-avatars'),
    names: document.getElementById('val-names'),
    idle: document.getElementById('val-idle')
  };

  const inputPin = document.getElementById('input-pin');
  const savePinBtn = document.getElementById('save-pin-btn');
  const valPin = document.getElementById('val-pin');

  // Default values
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
    panicButton: false
  };

  // 1. Gear button drawers toggle
  document.querySelectorAll('.gear-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetId = btn.getAttribute('data-target');
      const drawer = document.getElementById(targetId);
      
      if (drawer) {
        const isExpanded = drawer.classList.contains('expanded');
        
        // Collapse all drawers first for a clean single-open behavior
        document.querySelectorAll('.slider-drawer').forEach(d => d.classList.remove('expanded'));
        document.querySelectorAll('.gear-btn').forEach(b => b.classList.remove('active'));
        
        // Toggle the clicked one
        if (!isExpanded) {
          drawer.classList.add('expanded');
          btn.classList.add('active');
        }
      }
    });
  });

  // 2. Load stored configurations
  const loadSettings = () => {
    chrome.storage.local.get(defaults, (settings) => {
      // Main Active Toggle
      mainActiveToggle.checked = settings.mainActive;
      toggleSettingsState(settings.mainActive);

      // Blur Style Dropdown
      blurStyleSelect.value = settings.blurStyle;

      // Sub toggles
      toggles.messages.checked = settings.blurMessages;
      toggles.previews.checked = settings.blurPreviews;
      toggles.media.checked = settings.blurMedia;
      toggles.gallery.checked = settings.blurGallery;
      toggles.input.checked = settings.blurInput;
      toggles.avatars.checked = settings.blurAvatars;
      toggles.names.checked = settings.blurNames;
      toggles.transition.checked = settings.noTransition;
      toggles.hover.checked = settings.unblurHover;
      toggles.idle.checked = settings.blurIdle;
      toggles.usePin.checked = settings.usePin;
      toggles.panicButton.checked = settings.panicButton;

      // PIN value label
      valPin.textContent = settings.securityPin;

      // Sliders & value text
      Object.keys(sliders).forEach(key => {
        const settingName = 'val' + key.charAt(0).toUpperCase() + key.slice(1);
        sliders[key].value = settings[settingName];
        if (key === 'idle') {
          valueLabels[key].textContent = `${settings[settingName]} menit`;
        } else {
          valueLabels[key].textContent = `${settings[settingName]}px`;
        }
      });
    });
  };

  // Save utility helper
  const saveSetting = (key, value) => {
    chrome.storage.local.set({ [key]: value });
  };

  // Helper to enable/disable settings card UX when main toggle is OFF
  const toggleSettingsState = (isActive) => {
    if (isActive) {
      settingsCard.style.opacity = '1';
      settingsCard.style.pointerEvents = 'auto';
      blurStyleSelect.style.opacity = '1';
      blurStyleSelect.style.pointerEvents = 'auto';
    } else {
      settingsCard.style.opacity = '0.5';
      settingsCard.style.pointerEvents = 'none';
      blurStyleSelect.style.opacity = '0.5';
      blurStyleSelect.style.pointerEvents = 'none';
      // Collapse drawers when disabled
      document.querySelectorAll('.slider-drawer').forEach(d => d.classList.remove('expanded'));
      document.querySelectorAll('.gear-btn').forEach(b => b.classList.remove('active'));
    }
  };

  // 3. Event Listeners for changes
  mainActiveToggle.addEventListener('change', () => {
    const isActive = mainActiveToggle.checked;
    saveSetting('mainActive', isActive);
    toggleSettingsState(isActive);
  });

  // Blur Style Change Listener
  blurStyleSelect.addEventListener('change', () => {
    saveSetting('blurStyle', blurStyleSelect.value);
  });

  // Sub switches change listeners
  toggles.messages.addEventListener('change', () => saveSetting('blurMessages', toggles.messages.checked));
  toggles.previews.addEventListener('change', () => saveSetting('blurPreviews', toggles.previews.checked));
  toggles.media.addEventListener('change', () => saveSetting('blurMedia', toggles.media.checked));
  toggles.gallery.addEventListener('change', () => saveSetting('blurGallery', toggles.gallery.checked));
  toggles.input.addEventListener('change', () => saveSetting('blurInput', toggles.input.checked));
  toggles.avatars.addEventListener('change', () => saveSetting('blurAvatars', toggles.avatars.checked));
  toggles.names.addEventListener('change', () => saveSetting('blurNames', toggles.names.checked));
  toggles.transition.addEventListener('change', () => saveSetting('noTransition', toggles.transition.checked));
  toggles.hover.addEventListener('change', () => saveSetting('unblurHover', toggles.hover.checked));
  toggles.idle.addEventListener('change', () => saveSetting('blurIdle', toggles.idle.checked));
  toggles.usePin.addEventListener('change', () => saveSetting('usePin', toggles.usePin.checked));
  toggles.panicButton.addEventListener('change', () => saveSetting('panicButton', toggles.panicButton.checked));

  // Save PIN button listener
  savePinBtn.addEventListener('click', () => {
    const newPin = inputPin.value.trim();
    if (/^\d{4}$/.test(newPin)) {
      saveSetting('securityPin', newPin);
      valPin.textContent = newPin;
      inputPin.value = '';
      alert('PIN Keamanan berhasil disimpan!');
    } else {
      alert('PIN harus berupa 4 digit angka, bre!');
    }
  });

  // Sliders input listeners
  Object.keys(sliders).forEach(key => {
    sliders[key].addEventListener('input', () => {
      const val = parseInt(sliders[key].value, 10);
      if (key === 'idle') {
        valueLabels[key].textContent = `${val} menit`;
      } else {
        valueLabels[key].textContent = `${val}px`;
      }
      const settingName = 'val' + key.charAt(0).toUpperCase() + key.slice(1);
      saveSetting(settingName, val);
    });
  });

  // Initial load
  loadSettings();
});
