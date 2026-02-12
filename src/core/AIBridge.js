/**
 * AIBridge — handles the "hand-off" from content script to AI service.
 * Replaces the duplicated `openAIService` function and the
 * `shouldOpenTab` / `pendingPrompt` logic in every platform script.
 */

/** Default URLs for each AI model */
const DEFAULT_AI_URLS = {
  chatgpt: 'https://chatgpt.com/',
  gemini: 'https://gemini.google.com/app',
  grok: 'https://grok.com/',
  claude: 'https://claude.ai/new',
};

class AIBridge {
  /**
   * Execute the full "send to AI" flow:
   *  1. Determine whether to open a tab (based on settings).
   *  2. Save pendingPrompt + pendingSource to chrome.storage.local.
   *  3. Open the correct AI service tab.
   *
   * @param {Object} params
   * @param {string} params.prompt - The generated prompt text.
   * @param {Object} params.settings - Full settings object from StorageUtils.
   * @param {string} params.serviceName - Platform name: 'youtube' | 'udemy' | 'coursera' | 'datacamp'.
   * @returns {Promise<{ opened: boolean }>} Whether a new AI tab was opened.
   */
  static async execute({ prompt, settings, serviceName }) {
    const shouldOpenTab = AIBridge.shouldOpenTab(settings, serviceName);

    if (!shouldOpenTab) {
      return { opened: false };
    }

    // Persist prompt for auto-fill agent
    await chrome.storage.local.set({
      pendingPrompt: prompt,
      pendingSource: serviceName,
    });

    console.log(`[AIBridge] Saved pendingPrompt and pendingSource ('${serviceName}') to storage`);

    const url = AIBridge.getTargetUrl(settings, serviceName);
    if (url) {
      window.open(url, '_blank');
    }

    return { opened: true };
  }

  /**
   * Determine if we should open an AI tab based on current settings and mode.
   *
   * - **Global mode** → checks `settings.autoFillEnabled`.
   * - **Custom (per-service) mode** → checks `serviceSettings[serviceName].autoSubmit`.
   *
   * @param {Object} settings
   * @param {string} serviceName
   * @returns {boolean}
   */
  static shouldOpenTab(settings, serviceName) {
    if (settings.aiMode === 'custom') {
      return settings.serviceSettings?.[serviceName]?.autoSubmit ?? true;
    }
    // Global mode
    return settings.autoFillEnabled !== false;
  }

  /**
   * Resolve the target AI URL based on the active model and any custom URLs.
   *
   * @param {Object} settings
   * @param {string} serviceName
   * @returns {string} The URL to open.
   */
  static getTargetUrl(settings, serviceName) {
    const model = AIBridge.getActiveModel(settings, serviceName);

    // Check for user-configured custom URL first
    const customUrlKey = `${model}Url`;
    const customUrl = settings[customUrlKey];

    if (customUrl) return customUrl;

    return DEFAULT_AI_URLS[model] || DEFAULT_AI_URLS.chatgpt;
  }

  /**
   * Get the active AI model name for the given service.
   *
   * @param {Object} settings
   * @param {string} serviceName
   * @returns {string} Model key, e.g. 'chatgpt', 'gemini', 'grok', 'claude'.
   */
  static getActiveModel(settings, serviceName) {
    if (settings.aiMode === 'custom' && settings.serviceSettings) {
      const serviceSetting = settings.serviceSettings[serviceName];
      if (typeof serviceSetting === 'string') return serviceSetting;
      return serviceSetting?.model || 'chatgpt';
    }
    return settings.selectedModel || 'chatgpt';
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIBridge;
}
