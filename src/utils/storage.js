// Storage utility functions

const DEFAULT_PROMPT_CONTENT = `Please summarize the following video:

Title: {{Title}}
URL: {{URL}}

Transcript:
{{Transcript}}

Provide a concise summary with key points.`;

const DEFAULT_SETTINGS = {
  // AI Mode: 'global' = one AI for all, 'custom' = per-service AI
  aiMode: 'global',
  
  // Global model (used when aiMode is 'global')
  selectedModel: 'chatgpt',
  
  // Global prompt (used when aiMode is 'global')
  globalPromptId: 'default',
  
  // Per-service models (used when aiMode is 'custom')
  // UPDATED SCHEMA: { model: string, promptId: string, autoSubmit: boolean }
  serviceSettings: {
    youtube: { model: 'chatgpt', promptId: 'default', autoSubmit: true },
    udemy: { model: 'chatgpt', promptId: 'default', autoSubmit: true },
    coursera: { model: 'chatgpt', promptId: 'default', autoSubmit: true },
    datacamp: { model: 'chatgpt', promptId: 'default', autoSubmit: true }
  },
  
  // Prompt Library
  prompts: [
    {
      id: 'default',
      name: 'Default Summary',
      description: 'Standard summary template',
      content: DEFAULT_PROMPT_CONTENT
    }
  ],
  
  geminiUrl: 'https://gemini.google.com/app',
  theme: 'auto',
  copyFormat: 'markdown',
  showButton: true,
  autoFillEnabled: true,  // Auto-fill & Auto-submit toggle
  
  // Deprecated but kept for reference or backup if needed
  // customPrompt: ... 
};

// Export to window object for content scripts
if (typeof window !== 'undefined') {
  window.StorageUtils = {
    getSettings,
    saveSettings,
    getSetting,
    generateId,
    getPromptForService
  };
}

/**
 * Get all settings from storage with defaults and MIGRATION logic
 */
async function getSettings() {
  try {
    // 1. Fetch raw data to check structure
    const raw = await chrome.storage.local.get(null);
    
    // 2. Check if migration is needed (missing 'prompts' array)
    if (!raw.prompts) {
      console.log('Migrating storage to Prompt Library format...');
      const migrated = await migrateSettings(raw);
      return migrated;
    }

    // 3. Return merged settings
    return { ...DEFAULT_SETTINGS, ...raw };
  } catch (error) {
    console.error('Error getting settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Execute migration from old format to new format
 */
async function migrateSettings(oldData) {
  const newSettings = { ...DEFAULT_SETTINGS };
  
  // 1. Preserve simple scalar values
  const keysToCopy = ['aiMode', 'selectedModel', 'geminiUrl', 'theme', 'copyFormat', 'showButton', 'autoFillEnabled'];
  keysToCopy.forEach(key => {
    if (oldData[key] !== undefined) {
      newSettings[key] = oldData[key];
    }
  });

  // 2. Migrate Custom Prompt
  const legacyContent = oldData.customPrompt || DEFAULT_PROMPT_CONTENT;
  const legacyId = 'legacy-prompt-' + generateId().substring(0, 8);
  
  newSettings.prompts = [
    {
      id: 'default',
      name: 'Default Summary',
      description: 'Standard summary template',
      content: DEFAULT_PROMPT_CONTENT
    }
  ];

  // Only add legacy prompt if it differs from default
  if (legacyContent.trim() !== DEFAULT_PROMPT_CONTENT.trim()) {
      newSettings.prompts.push({
        id: legacyId,
        name: 'My Custom Prompt',
        description: 'Migrated from previous version',
        content: legacyContent
      });
  } else {
    // If identical, just use default
    // legacyId = 'default'; // cant reassign const, handled below
  }
  
  const targetPromptId = (legacyContent.trim() !== DEFAULT_PROMPT_CONTENT.trim()) ? legacyId : 'default';

  // 3. Migrate Service Settings
  // Old format: { youtube: 'chatgpt' }
  // New format: { youtube: { model: 'chatgpt', promptId: '...', autoSubmit: boolean } }
  const oldServices = oldData.serviceSettings || {};
  const services = ['youtube', 'udemy', 'coursera', 'datacamp'];
  
  // Use old global autoFillEnabled as default for per-service autoSubmit
  const defaultAutoSubmit = oldData.autoFillEnabled !== false;
  
  newSettings.serviceSettings = {};
  
  services.forEach(service => {
    const oldVal = oldServices[service];
    // If oldVal is string, it's the model name. If object, check for existing autoSubmit
    const model = (typeof oldVal === 'string') ? oldVal : (oldVal?.model || 'chatgpt');
    const autoSubmit = (typeof oldVal === 'object' && oldVal?.autoSubmit !== undefined) 
      ? oldVal.autoSubmit 
      : defaultAutoSubmit;
    
    newSettings.serviceSettings[service] = {
      model: model,
      promptId: targetPromptId,
      autoSubmit: autoSubmit
    };
  });

  // 4. Save migrated data
  await chrome.storage.local.set(newSettings);
  console.log('Migration complete:', newSettings);
  
  return newSettings;
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

/**
 * Generate a simple ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Get prompt content for a specific service (youtube, udemy, etc.)
 * This is the main function content scripts should use.
 */
async function getPromptForService(serviceName) {
  try {
    const settings = await getSettings();
    
    let promptId = 'default';
    
    // Check aiMode: global uses globalPromptId, custom uses per-service mapping
    if (settings.aiMode === 'global') {
      // Global mode: use the global prompt
      promptId = settings.globalPromptId || 'default';
    } else {
      // Per-service mode: get promptId from service config
      const serviceConfig = settings.serviceSettings?.[serviceName];
      if (serviceConfig) {
        // New format: { model: 'chatgpt', promptId: 'xxx' }
        promptId = serviceConfig.promptId || 'default';
      }
    }
    
    // Find the prompt content
    const prompt = settings.prompts?.find(p => p.id === promptId);
    
    if (prompt) {
      return prompt.content;
    }
    
    // Fallback to first prompt or default
    if (settings.prompts && settings.prompts.length > 0) {
      return settings.prompts[0].content;
    }
    
    return DEFAULT_PROMPT_CONTENT;
    
  } catch (error) {
    console.error(`Error getting prompt for ${serviceName}:`, error);
    return DEFAULT_PROMPT_CONTENT;
  }
}
