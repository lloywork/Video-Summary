/**
 * YouTube Platform — Extends BasePlatform for YouTube-specific behavior.
 *
 * Handles:
 *  - Button injection into YouTube's `.ytp-right-controls`
 *  - Transcript auto-open via description expand → "Show transcript" click
 *  - YouTube-specific DOM selectors and video ID extraction
 */

const BasePlatform = require('../../core/BasePlatform');
const { createSparkleIcon } = require('../../core/Assets');

class YouTubePlatform extends BasePlatform {
  constructor() {
    super();

    this.PLATFORM_NAME = 'youtube';
    this.BUTTON_ID = 'yt_ai_summary_btn';

    this.SELECTORS = {
      settingsButton: '.ytp-settings-button',
      subtitlesButton: '.ytp-subtitles-button',
      rightControlsLeft: '.ytp-right-controls-left',
      rightControls: '.ytp-right-controls',
    };
  }

  // ═══════════════════════════════════════════════════════
  // OVERRIDES
  // ═══════════════════════════════════════════════════════

  getNotificationOptions() {
    return {
      containerSelector: '.html5-video-player',
      position: 'absolute',
    };
  }

  isVideoPage() {
    return window.location.href.includes('/watch');
  }

  attemptButtonInsertion() {
    this._log('Attempting button insertion...');

    if (this.buttonExists()) {
      this._log('Button already exists');
      return;
    }

    const videoId = this._getVideoId();
    if (!videoId) {
      this._log('Not on a video page');
      return;
    }

    // Strategy 1: Before Settings button
    const settingsBtn = document.querySelector(this.SELECTORS.settingsButton);
    if (settingsBtn?.parentNode) {
      const button = this.createButton();
      settingsBtn.parentNode.insertBefore(button, settingsBtn);
      this._log('✅ Button inserted (before Settings)');
      return;
    }

    // Strategy 2: Before Subtitles button
    const subtitlesBtn = document.querySelector(this.SELECTORS.subtitlesButton);
    if (subtitlesBtn?.parentNode) {
      const button = this.createButton();
      subtitlesBtn.parentNode.insertBefore(button, subtitlesBtn);
      this._log('✅ Button inserted (before Subtitles)');
      return;
    }

    // Strategy 3: Append to right-controls-left
    const rightControlsLeft = document.querySelector(this.SELECTORS.rightControlsLeft);
    if (rightControlsLeft) {
      rightControlsLeft.appendChild(this.createButton());
      this._log('✅ Button inserted (appended to left)');
      return;
    }

    // Strategy 4: Prepend to right-controls
    const rightControls = document.querySelector(this.SELECTORS.rightControls);
    if (rightControls) {
      rightControls.insertBefore(this.createButton(), rightControls.firstChild);
      this._log('✅ Button inserted (prepended to right-controls)');
      return;
    }

    this._log('❌ Could not find container, retrying...');
    setTimeout(() => this.attemptButtonInsertion(), 1000);
  }

  createButton() {
    const button = document.createElement('button');
    button.id = this.BUTTON_ID;
    button.className = 'ytp-button';
    button.title = 'Summarize Video';
    button.setAttribute('aria-label', 'Summarize Video');
    button.innerHTML = createSparkleIcon({ size: 24, fill: 'white' });

    button.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.9;
      transition: opacity 0.2s ease, transform 0.2s ease;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.opacity = '1';
      button.style.transform = 'scale(1.1)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.opacity = '0.9';
      button.style.transform = 'scale(1)';
    });

    button.addEventListener('click', (e) => this.handleSummaryClick(e));

    return button;
  }

  pauseVideo() {
    const video = document.querySelector('video.html5-main-video');
    if (video && !video.paused) {
      video.pause();
      this._log('⏸️ Video paused');
      return true;
    }
    return false;
  }

  getVideoTitle() {
    const titleElement = document.querySelector('h1.ytd-watch-metadata yt-formatted-string');
    return titleElement
      ? titleElement.textContent.trim()
      : document.title.replace(' - YouTube', '');
  }

  getVideoUrl() {
    return window.location.href.split('&')[0];
  }

  /**
   * Override the click handler to add YouTube-specific transcript opening step.
   */
  async handleSummaryClick(e) {
    e.preventDefault();
    e.stopPropagation();

    const btn = e.currentTarget;
    this.pauseVideo();

    try {
      this._setButtonLoading(btn, true);

      // YouTube-specific: auto-open transcript sidebar
      if (!window.TranscriptUtils.isTranscriptSidebarOpen()) {
        this.notification.show('🔄 Opening transcript...', 'info');

        const opened = await this._autoOpenTranscript();
        if (!opened) {
          this.notification.show('❌ Could not open transcript', 'error');
          this._setButtonLoading(btn, false);
          return;
        }
        await this.sleep(1500);
      }

      // Continue with shared flow
      await this._executeSharedFlow(btn);
    } catch (error) {
      console.error('[YouTube Summary] Error:', error);
      this.notification.show(`❌ Error: ${error.message}`, 'error');
      this._setButtonLoading(btn, false);
    }
  }

  /**
   * YouTube transcript extraction.
   * Uses TranscriptUtils API for YouTube-specific DOM scraping.
   */
  async getTranscript(settings) {
    const videoId = this._getVideoId();
    const langOptions = await window.TranscriptUtils.getLangOptionsWithLink(videoId);

    if (!langOptions || langOptions.length === 0) {
      return '';
    }

    return window.TranscriptUtils.getFormattedTranscript(
      langOptions[0],
      videoId,
      settings.copyFormat
    );
  }

  // ═══════════════════════════════════════════════════════
  // YOUTUBE-SPECIFIC PRIVATE METHODS
  // ═══════════════════════════════════════════════════════

  /**
   * Run the shared portion of the click flow
   * (transcript → prompt → clipboard → AI).
   * @param {HTMLButtonElement} btn
   * @private
   */
  async _executeSharedFlow(btn) {
    const settings = await window.StorageUtils.getSettings();
    const videoTitle = this.getVideoTitle();
    const videoUrl = this.getVideoUrl();

    const transcript = await this.getTranscript(settings);

    if (!transcript || transcript.trim() === '') {
      this.notification.show('❌ Transcript is empty', 'error');
      this._setButtonLoading(btn, false);
      return;
    }

    const finalTranscript = window.PromptUtils.truncateText(transcript);
    const promptTemplate = await window.StorageUtils.getPromptForService(this.PLATFORM_NAME);
    const prompt = window.PromptUtils.generatePrompt(promptTemplate, {
      title: videoTitle,
      url: videoUrl,
      transcript: finalTranscript,
    });

    await window.ClipboardUtils.copyToClipboard(prompt);

    const AIBridge = require('../../core/AIBridge');
    const result = await AIBridge.execute({ prompt, settings, serviceName: this.PLATFORM_NAME });

    if (result.opened) {
      this.notification.show('✅ Opening AI...', 'success');
      setTimeout(() => this._setButtonLoading(btn, false), 500);
    } else {
      this.notification.show('✅ Copied! Paste (Ctrl+V) into AI chat', 'success');
      this._setButtonLoading(btn, false);
    }
  }

  /**
   * Auto-open the transcript sidebar.
   * @returns {Promise<boolean>}
   * @private
   */
  async _autoOpenTranscript() {
    this._log('Auto-opening transcript...');

    try {
      // Expand description if collapsed
      const moreBtn = document.querySelector(
        '#expand, tp-yt-paper-button#expand, ytd-text-inline-expander #expand'
      );
      if (moreBtn && moreBtn.offsetHeight > 0) {
        this._log('Clicking "more" button...');
        moreBtn.click();
        await this.sleep(800);
      }

      // Find and click "Show transcript"
      const transcriptBtn = this._findTranscriptButton();

      if (transcriptBtn) {
        this._log('Found transcript button, clicking...');
        transcriptBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await this.sleep(300);
        transcriptBtn.click();
        await this.sleep(1000);

        if (window.TranscriptUtils.isTranscriptSidebarOpen()) {
          this._log('✅ Transcript opened successfully!');
          return true;
        }

        // Retry once
        transcriptBtn.click();
        await this.sleep(1500);
        return window.TranscriptUtils.isTranscriptSidebarOpen();
      }

      this._log('❌ Transcript button not found');
      return false;
    } catch (error) {
      console.error('[YouTube Summary] Error opening transcript:', error);
      return false;
    }
  }

  /**
   * Find the "Show transcript" button (multi-language).
   * @returns {Element|null}
   * @private
   */
  _findTranscriptButton() {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      const text = btn.textContent.toLowerCase();
      const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();

      if (
        text.includes('transcript') ||
        text.includes('chép lời') ||
        ariaLabel.includes('transcript') ||
        ariaLabel.includes('chép lời')
      ) {
        return btn;
      }
    }

    const transcriptSection = document.querySelector(
      'ytd-video-description-transcript-section-renderer'
    );
    if (transcriptSection) {
      return transcriptSection.querySelector('button');
    }

    return null;
  }

  /**
   * Get video ID from URL.
   * @returns {string|null}
   * @private
   */
  _getVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('v');
  }
}

// ── Bootstrap ────────────────────────────────────────────
const platform = new YouTubePlatform();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => platform.init());
} else {
  platform.init();
}
