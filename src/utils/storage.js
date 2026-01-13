// Storage utility functions

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
  customPrompt: `Please summarize the following video:

Title: {{Title}}
URL: {{URL}}

Transcript:
{{Transcript}}

Provide a concise summary with key points.`
};

// Export to window object for content scripts
if (typeof window !== 'undefined') {
  window.StorageUtils = {
    getSettings,
    saveSettings,
    getSetting
  };
}

/**
 * Get all settings from storage with defaults
 */
async function getSettings() {
  try {
    const data = await chrome.storage.local.get(DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS, ...data };
  } catch (error) {
    console.error('Error getting settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save settings to storage
 */
async function saveSettings(settings) {
  try {
    await chrome.storage.local.set(settings);
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}

/**
 * Get a specific setting
 */
async function getSetting(key) {
  try {
    const settings = await getSettings();
    return settings[key];
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error);
    return DEFAULT_SETTINGS[key];
  }
}
