// Options page script

// Default settings (same as storage.js)
const DEFAULT_SETTINGS = {
  // AI Mode: 'global' = one AI for all, 'custom' = per-service AI
  aiMode: 'global',
  
  // Global model (used when aiMode is 'global')
  selectedModel: 'chatgpt',
  
  // Per-service models (used when aiMode is 'custom')
  serviceSettings: {
    youtube: 'chatgpt',
    udemy: 'chatgpt',
    coursera: 'chatgpt',
    datacamp: 'chatgpt'
  },
  
  geminiUrl: 'https://gemini.google.com/app',
  theme: 'auto',
  copyFormat: 'markdown',
  showButton: true,
  autoFillEnabled: true,  // Auto-fill & Auto-submit toggle
  customPrompt: `Please summarize the following YouTube video:

Title: {{Title}}
URL: {{URL}}

Transcript:
{{Transcript}}

Provide a concise summary with key points.`
};

// DOM elements
let form, selectedModelSelect, geminiUrlGroup, themeSelect, saveBtn, saveStatus;
let globalModeSection, customModeSection;
let youtubeModelSelect, udemyModelSelect, courseraModelSelect, datacampModelSelect;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

async function init() {
  // Get DOM elements
  form = document.getElementById('settingsForm');
  selectedModelSelect = document.getElementById('selectedModel');
  geminiUrlGroup = document.getElementById('geminiUrlGroup');
  themeSelect = document.getElementById('theme');
  saveBtn = document.getElementById('saveBtn');
  saveStatus = document.getElementById('saveStatus');
  
  // Mode sections
  globalModeSection = document.getElementById('globalModeSection');
  customModeSection = document.getElementById('customModeSection');
  
  // Per-service model selects
  youtubeModelSelect = document.getElementById('youtubeModel');
  udemyModelSelect = document.getElementById('udemyModel');
  courseraModelSelect = document.getElementById('courseraModel');
  datacampModelSelect = document.getElementById('datacampModel');

  // Load saved settings
  await loadSettings();

  // Add event listeners
  selectedModelSelect.addEventListener('change', handleModelChange);
  themeSelect.addEventListener('change', handleThemeChange);
  form.addEventListener('submit', handleSave);
  
  // Add AI mode radio change listeners
  const aiModeRadios = document.querySelectorAll('input[name="aiMode"]');
  aiModeRadios.forEach(radio => {
    radio.addEventListener('change', handleAIModeChange);
  });
  
  // Add per-service model change listeners (for Gemini URL visibility)
  [youtubeModelSelect, udemyModelSelect, courseraModelSelect, datacampModelSelect].forEach(select => {
    if (select) {
      select.addEventListener('change', updateGeminiUrlVisibility);
    }
  });

  // Initial UI updates
  updateModeUI();
  updateGeminiUrlVisibility();

  // Apply initial theme
  applyTheme(themeSelect.value);
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  try {
    const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);

    // Populate AI Mode radio
    const aiModeRadio = document.querySelector(`input[name="aiMode"][value="${settings.aiMode || 'global'}"]`);
    if (aiModeRadio) {
      aiModeRadio.checked = true;
    }

    // Populate global model
    document.getElementById('selectedModel').value = settings.selectedModel;
    document.getElementById('geminiUrl').value = settings.geminiUrl;
    document.getElementById('theme').value = settings.theme;
    
    // Populate per-service models
    const serviceSettings = settings.serviceSettings || DEFAULT_SETTINGS.serviceSettings;
    if (youtubeModelSelect) youtubeModelSelect.value = serviceSettings.youtube || 'chatgpt';
    if (udemyModelSelect) udemyModelSelect.value = serviceSettings.udemy || 'chatgpt';
    if (courseraModelSelect) courseraModelSelect.value = serviceSettings.coursera || 'chatgpt';
    if (datacampModelSelect) datacampModelSelect.value = serviceSettings.datacamp || 'chatgpt';
    
    // Set radio buttons for copy format
    const copyFormatRadio = document.querySelector(`input[name="copyFormat"][value="${settings.copyFormat}"]`);
    if (copyFormatRadio) {
      copyFormatRadio.checked = true;
    }

    document.getElementById('showButton').checked = settings.showButton;
    document.getElementById('autoFillEnabled').checked = settings.autoFillEnabled;
    document.getElementById('customPrompt').value = settings.customPrompt;

    console.log('Settings loaded:', settings);
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Error loading settings', 'error');
  }
}

/**
 * Handle AI mode change (global vs custom)
 */
function handleAIModeChange() {
  updateModeUI();
  updateGeminiUrlVisibility();
}

/**
 * Update UI based on selected AI mode
 */
function updateModeUI() {
  const selectedMode = document.querySelector('input[name="aiMode"]:checked')?.value || 'global';
  
  if (selectedMode === 'global') {
    globalModeSection.classList.remove('hidden');
    customModeSection.classList.add('hidden');
  } else {
    globalModeSection.classList.add('hidden');
    customModeSection.classList.remove('hidden');
  }
}

/**
 * Handle model selection change
 */
function handleModelChange() {
  updateGeminiUrlVisibility();
}

/**
 * Update Gemini URL visibility based on selected models
 */
function updateGeminiUrlVisibility() {
  const selectedMode = document.querySelector('input[name="aiMode"]:checked')?.value || 'global';
  
  let showGeminiUrl = false;
  
  if (selectedMode === 'global') {
    // In global mode, show if Gemini is selected
    showGeminiUrl = selectedModelSelect.value === 'gemini';
  } else {
    // In custom mode, show if any service uses Gemini
    showGeminiUrl = 
      youtubeModelSelect?.value === 'gemini' ||
      udemyModelSelect?.value === 'gemini' ||
      courseraModelSelect?.value === 'gemini' ||
      datacampModelSelect?.value === 'gemini';
  }
  
  if (showGeminiUrl) {
    geminiUrlGroup.classList.remove('hidden');
  } else {
    geminiUrlGroup.classList.add('hidden');
  }
}

/**
 * Handle theme change
 */
function handleThemeChange() {
  const theme = themeSelect.value;
  applyTheme(theme);
}

/**
 * Apply theme to body
 */
function applyTheme(theme) {
  document.body.className = `theme-${theme}`;
}

/**
 * Handle form save
 */
async function handleSave(e) {
  e.preventDefault();

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    // Get form data
    const formData = new FormData(form);
    const aiMode = formData.get('aiMode') || 'global';
    
    const settings = {
      aiMode: aiMode,
      selectedModel: formData.get('selectedModel'),
      serviceSettings: {
        youtube: formData.get('youtubeModel') || 'chatgpt',
        udemy: formData.get('udemyModel') || 'chatgpt',
        coursera: formData.get('courseraModel') || 'chatgpt',
        datacamp: formData.get('datacampModel') || 'chatgpt'
      },
      geminiUrl: formData.get('geminiUrl') || DEFAULT_SETTINGS.geminiUrl,
      theme: formData.get('theme'),
      copyFormat: formData.get('copyFormat'),
      showButton: formData.get('showButton') === 'on',
      autoFillEnabled: formData.get('autoFillEnabled') === 'on',
      customPrompt: formData.get('customPrompt')
    };

    // Validate
    if (!settings.customPrompt.trim()) {
      showStatus('Prompt template cannot be empty', 'error');
      saveBtn.disabled = false;
      saveBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16L21 8V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M17 21V13H7V21M7 3V8H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Save Settings
      `;
      return;
    }

    // Save to storage
    await chrome.storage.local.set(settings);

    console.log('Settings saved:', settings);
    showStatus('✅ Settings saved successfully!', 'success');

    // Reset button after 2 seconds
    setTimeout(() => {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16L21 8V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M17 21V13H7V21M7 3V8H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Save Settings
      `;
      hideStatus();
    }, 2000);

  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('❌ Error saving settings', 'error');
    saveBtn.disabled = false;
    saveBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16L21 8V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M17 21V13H7V21M7 3V8H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Save Settings
    `;
  }
}

/**
 * Show status message
 */
function showStatus(message, type) {
  saveStatus.textContent = message;
  saveStatus.className = `save-status show ${type}`;
}

/**
 * Hide status message
 */
function hideStatus() {
  saveStatus.classList.remove('show');
  setTimeout(() => {
    saveStatus.textContent = '';
    saveStatus.className = 'save-status';
  }, 300);
}
