/**
 * BasePlatform — Abstract base class for all platform content scripts.
 *
 * Implements the **Template Method Pattern**: defines the fixed lifecycle
 * (init → observe → inject → click → summarize) while delegating
 * platform-specific details to subclasses.
 *
 * Subclasses MUST override:
 *   - PLATFORM_NAME (string)
 *   - BUTTON_ID (string)
 *   - isVideoPage()
 *   - attemptButtonInsertion()
 *   - createButton()
 *   - pauseVideo()
 *   - getVideoTitle()
 *   - getVideoUrl()
 *   - getTranscript(settings) → Promise<string>
 *
 * Subclasses MAY override:
 *   - getNotificationOptions()  (to customize notification container / position)
 */

const Notification = require('./Notification');
const AIBridge = require('./AIBridge');

class BasePlatform {
  constructor() {
    if (new.target === BasePlatform) {
      throw new Error('BasePlatform is abstract and cannot be instantiated directly.');
    }

    /** @abstract */ this.PLATFORM_NAME = '';
    /** @abstract */ this.BUTTON_ID = '';

    // Will be initialized in init()
    this.notification = null;
    this.settings = null;
    this._lastUrl = location.href;
  }

  // ═══════════════════════════════════════════════════════
  // PUBLIC LIFECYCLE
  // ═══════════════════════════════════════════════════════

  /**
   * Entry point — called once when the content script loads.
   */
  async init() {
    this._log('Initializing...');

    // Read settings
    this.settings = await window.StorageUtils.getSettings();

    if (!this.settings.showButton) {
      this._log('Summary button is disabled in settings');
      return;
    }

    // Create Notification instance with platform-appropriate options
    const notifOptions = this.getNotificationOptions();
    this.notification = new Notification(this.PLATFORM_NAME, notifOptions);

    // Delay initial insertion for the player to render
    setTimeout(() => this.attemptButtonInsertion(), 2000);

    // SPA navigation observer
    this._startNavigationObserver();
  }

  // ═══════════════════════════════════════════════════════
  // ABSTRACT METHODS (must be overridden)
  // ═══════════════════════════════════════════════════════

  /**
   * @abstract
   * Check if the current page is a video page for this platform.
   * @returns {boolean}
   */
  isVideoPage() {
    throw new Error(`${this.PLATFORM_NAME}: isVideoPage() not implemented`);
  }

  /**
   * @abstract
   * Attempt to find the right DOM location and inject the summary button.
   * Should call createButton() internally and handle retry logic.
   */
  attemptButtonInsertion() {
    throw new Error(`${this.PLATFORM_NAME}: attemptButtonInsertion() not implemented`);
  }

  /**
   * @abstract
   * Create the HTML button element (styled for this specific platform).
   * @returns {HTMLButtonElement}
   */
  createButton() {
    throw new Error(`${this.PLATFORM_NAME}: createButton() not implemented`);
  }

  /**
   * @abstract
   * Pause the currently playing video.
   * @returns {boolean} true if video was paused
   */
  pauseVideo() {
    throw new Error(`${this.PLATFORM_NAME}: pauseVideo() not implemented`);
  }

  /**
   * @abstract
   * Get the video / lecture title from the page DOM.
   * @returns {string}
   */
  getVideoTitle() {
    throw new Error(`${this.PLATFORM_NAME}: getVideoTitle() not implemented`);
  }

  /**
   * @abstract
   * Get the clean video URL.
   * @returns {string}
   */
  getVideoUrl() {
    throw new Error(`${this.PLATFORM_NAME}: getVideoUrl() not implemented`);
  }

  /**
   * @abstract
   * Extract the transcript text from the page.
   * @param {Object} settings - Full settings object
   * @returns {Promise<string>} The transcript text (may be empty if unavailable)
   */
  async getTranscript(settings) {
    throw new Error(`${this.PLATFORM_NAME}: getTranscript() not implemented`);
  }

  // ═══════════════════════════════════════════════════════
  // VIRTUAL METHODS (may be overridden)
  // ═══════════════════════════════════════════════════════

  /**
   * Return Notification constructor options.
   * Override to customize container or position strategy.
   * @returns {{ containerSelector?: string, position?: 'absolute'|'fixed' }}
   */
  getNotificationOptions() {
    return {};
  }

  // ═══════════════════════════════════════════════════════
  // SHARED LOGIC (used by all subclasses)
  // ═══════════════════════════════════════════════════════

  /**
   * Standard click handler for the summary button.
   * Orchestrates: pause → loading → transcript → prompt → AI.
   *
   * Subclasses bind this to their button's click event:
   *   button.addEventListener('click', (e) => this.handleSummaryClick(e));
   *
   * @param {MouseEvent} e
   */
  async handleSummaryClick(e) {
    e.preventDefault();
    e.stopPropagation();

    const btn = e.currentTarget;

    // Step 0: Pause video
    this.pauseVideo();

    try {
      // Loading state
      this._setButtonLoading(btn, true);
      this.notification.show('🔄 Getting transcript...', 'info');

      // Refresh settings in case they changed
      const settings = await window.StorageUtils.getSettings();

      // Get video info
      const videoTitle = this.getVideoTitle();
      const videoUrl = this.getVideoUrl();

      // Get transcript (platform-specific)
      const transcript = await this.getTranscript(settings);

      if (!transcript || transcript.trim() === '') {
        this.notification.show('❌ Transcript is empty or not found', 'error');
        this._setButtonLoading(btn, false);
        return;
      }

      // Truncate and generate prompt
      const finalTranscript = window.PromptUtils.truncateText(transcript);
      const promptTemplate = await window.StorageUtils.getPromptForService(this.PLATFORM_NAME);
      const prompt = window.PromptUtils.generatePrompt(promptTemplate, {
        title: videoTitle,
        url: videoUrl,
        transcript: finalTranscript,
      });

      // Copy to clipboard (backup)
      await window.ClipboardUtils.copyToClipboard(prompt);

      // Execute AI bridge
      const result = await AIBridge.execute({
        prompt,
        settings,
        serviceName: this.PLATFORM_NAME,
      });

      if (result.opened) {
        this.notification.show('✅ Opening AI...', 'success');
        setTimeout(() => this._setButtonLoading(btn, false), 500);
      } else {
        this.notification.show('✅ Copied! Paste (Ctrl+V) into AI chat', 'success');
        this._setButtonLoading(btn, false);
      }
    } catch (error) {
      console.error(`[${this.PLATFORM_NAME} Summary] Error:`, error);
      this.notification.show(`❌ Error: ${error.message}`, 'error');
      this._setButtonLoading(btn, false);
    }
  }

  // ═══════════════════════════════════════════════════════
  // PROTECTED HELPERS
  // ═══════════════════════════════════════════════════════

  /**
   * Check if the summary button already exists in the DOM.
   * @returns {boolean}
   */
  buttonExists() {
    return document.getElementById(this.BUTTON_ID) !== null;
  }

  /**
   * Convenience sleep.
   * @param {number} ms
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Log a message prefixed with the platform name.
   * @param {...*} args
   * @protected
   */
  _log(...args) {
    console.log(`[${this.PLATFORM_NAME} Summary]`, ...args);
  }

  // ── Private ──────────────────────────────────────────

  /**
   * Toggle the loading spinner on the button's SVG icon.
   * @param {HTMLButtonElement} btn
   * @param {boolean} loading
   * @private
   */
  _setButtonLoading(btn, loading) {
    btn.disabled = loading;
    const svg = btn.querySelector('svg');
    if (svg) {
      if (loading) {
        this.notification.injectSpinStyles();
        svg.style.animation = 'spin 1s linear infinite';
      } else {
        svg.style.animation = '';
      }
    }
  }

  /**
   * Start a MutationObserver that watches for URL changes (SPA navigation)
   * and re-injects the button when needed.
   * @private
   */
  _startNavigationObserver() {
    new MutationObserver(() => {
      const url = location.href;

      if (url !== this._lastUrl) {
        this._lastUrl = url;
        if (this.isVideoPage()) {
          this._log('URL changed, re-inserting button...');
          setTimeout(() => this.attemptButtonInsertion(), 2000);
        }
      }

      // Re-insert if button was removed (player re-render)
      if (this.isVideoPage() && !this.buttonExists()) {
        this.attemptButtonInsertion();
      }
    }).observe(document.body, { subtree: true, childList: true });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BasePlatform;
}
