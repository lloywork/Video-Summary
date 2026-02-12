/**
 * Udemy Platform — Extends BasePlatform for Udemy-specific behavior.
 */

const BasePlatform = require('../../core/BasePlatform');
const { createSparkleIcon } = require('../../core/Assets');
const AIBridge = require('../../core/AIBridge');

class UdemyPlatform extends BasePlatform {
  constructor() {
    super();

    this.PLATFORM_NAME = 'udemy';
    this.BUTTON_ID = 'udemy_ai_summary_btn';

    this.SELECTORS = {
      controlBar: '.shaka-control-bar--control-bar--gXZ1u[data-purpose="video-controls"]',
      controlBarFallback: '[data-purpose="video-controls"]',
      transcriptToggle: 'button[data-purpose="transcript-toggle"]',
      settingsButton: 'button[data-purpose="settings-button"]',
      videoElement: 'video',
    };
  }

  // ═══════════════════════════════════════════════════════
  // OVERRIDES
  // ═══════════════════════════════════════════════════════

  isVideoPage() {
    return (
      window.location.pathname.includes('/learn/') ||
      window.location.pathname.includes('/lecture/') ||
      document.querySelector('video') !== null
    );
  }

  attemptButtonInsertion() {
    this._log('Attempting button insertion...');

    if (this.buttonExists()) { this._log('Button already exists'); return; }
    if (!this.isVideoPage()) { this._log('Not on a video page'); return; }

    const controlBar =
      document.querySelector(this.SELECTORS.controlBar) ||
      document.querySelector(this.SELECTORS.controlBarFallback);

    if (controlBar) {
      // Strategy 1: Before transcript toggle
      if (this._insertBeforeWrapped(controlBar, this.SELECTORS.transcriptToggle, 'Transcript')) return;

      // Strategy 2: Before captions button
      if (this._insertBeforeWrapped(controlBar, 'button[data-purpose="captions-dropdown-button"]', 'Captions')) return;

      // Strategy 3: Before settings button
      if (this._insertBeforeWrapped(controlBar, this.SELECTORS.settingsButton, 'Settings')) return;

      // Strategy 4: Append to control bar
      controlBar.appendChild(this._createButtonWrapper());
      this._log('✅ Button inserted (appended to control bar)');
      return;
    }

    this._log('❌ Could not find control bar, retrying...');
    setTimeout(() => this.attemptButtonInsertion(), 1000);
  }

  createButton() {
    const button = document.createElement('button');
    button.id = this.BUTTON_ID;
    button.type = 'button';
    button.className =
      'ud-btn ud-btn-small ud-btn-ghost ud-btn-text-sm control-bar-dropdown--trigger--FnmP- control-bar-dropdown--trigger-dark--ZK26r control-bar-dropdown--trigger-small--ogRJ4';
    button.title = 'AI Summary';
    button.setAttribute('aria-label', 'AI Summary - Tóm tắt bài giảng');
    button.innerHTML = createSparkleIcon({ size: 24, fill: 'currentColor' });
    button.tabIndex = 0;

    button.addEventListener('click', (e) => this.handleSummaryClick(e));
    return button;
  }

  pauseVideo() {
    const video = document.querySelector(this.SELECTORS.videoElement);
    const playButton = document.querySelector('button[data-purpose="play-button"]');

    if (video && !video.paused) {
      if (playButton) {
        this._log('⏸️ Clicking play button to pause video...');
        playButton.click();
        return true;
      }
      try { video.pause(); this._log('⏸️ Video paused via API'); return true; }
      catch (e) { this._log('Could not pause via API:', e); }
    }

    if (playButton) {
      const svg = playButton.querySelector('svg');
      const useElement = playButton.querySelector('use');
      const ariaLabel = svg?.getAttribute('aria-label') || '';
      const iconHref = useElement?.getAttribute('xlink:href') || '';

      const isPlaying =
        iconHref.includes('pause') ||
        ariaLabel.toLowerCase().includes('pause') ||
        ariaLabel.toLowerCase().includes('tạm dừng');

      if (isPlaying) {
        this._log('⏸️ Video detected as playing, clicking pause...');
        playButton.click();
        return true;
      }
    }

    this._log('Video already paused or not found');
    return false;
  }

  getVideoTitle() {
    const selectors = [
      '[data-purpose="course-header-title"]',
      'h1[class*="clp-lead__title"]',
      '[class*="ud-heading-xl"]',
      '[data-purpose="lead-title"]',
      'h1', 'title',
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) return el.textContent.trim();
    }
    return document.title.replace(' | Udemy', '').replace(' - Udemy', '');
  }

  getVideoUrl() {
    return window.location.href.split('?')[0];
  }

  /**
   * Udemy overrides handleSummaryClick to auto-open transcript first.
   */
  async handleSummaryClick(e) {
    e.preventDefault();
    e.stopPropagation();

    const btn = e.currentTarget;
    this.pauseVideo();

    try {
      this._setButtonLoading(btn, true);

      if (!this._isTranscriptOpen()) {
        this.notification.show('🔄 Opening transcript...', 'info');
        const opened = await this._autoOpenTranscript();
        if (!opened) {
          this.notification.show('❌ Could not open transcript', 'error');
          this._setButtonLoading(btn, false);
          return;
        }
        await this.sleep(1500);
      }

      await this._executeSharedFlow(btn);
    } catch (error) {
      console.error('[Udemy Summary] Error:', error);
      this.notification.show(`❌ Error: ${error.message}`, 'error');
      this._setButtonLoading(btn, false);
    }
  }

  async getTranscript(settings) {
    return window.TranscriptUtils.getUdemyTranscriptFromDom(settings.copyFormat);
  }

  // ═══════════════════════════════════════════════════════
  // PRIVATE
  // ═══════════════════════════════════════════════════════

  async _executeSharedFlow(btn) {
    const settings = await window.StorageUtils.getSettings();
    const transcript = await this.getTranscript(settings);

    if (!transcript || transcript.trim() === '') {
      this.notification.show('❌ Transcript is empty or not found', 'error');
      this._setButtonLoading(btn, false);
      return;
    }

    const finalTranscript = window.PromptUtils.truncateText(transcript);
    const promptTemplate = await window.StorageUtils.getPromptForService(this.PLATFORM_NAME);
    const prompt = window.PromptUtils.generatePrompt(promptTemplate, {
      title: this.getVideoTitle(),
      url: this.getVideoUrl(),
      transcript: finalTranscript,
    });

    await window.ClipboardUtils.copyToClipboard(prompt);

    const result = await AIBridge.execute({ prompt, settings, serviceName: this.PLATFORM_NAME });

    if (result.opened) {
      this.notification.show('✅ Opening AI...', 'success');
      setTimeout(() => this._setButtonLoading(btn, false), 500);
    } else {
      this.notification.show('✅ Copied! Paste (Ctrl+V) into AI chat', 'success');
      this._setButtonLoading(btn, false);
    }
  }

  _isTranscriptOpen() {
    const transcriptBtn = document.querySelector(this.SELECTORS.transcriptToggle);
    return transcriptBtn?.getAttribute('aria-expanded') === 'true';
  }

  async _autoOpenTranscript() {
    this._log('Auto-opening transcript...');
    try {
      const transcriptBtn = document.querySelector(this.SELECTORS.transcriptToggle);
      if (transcriptBtn) {
        transcriptBtn.click();
        await this.sleep(1000);
        if (this._isTranscriptOpen()) { this._log('✅ Transcript opened!'); return true; }
        transcriptBtn.click();
        await this.sleep(1500);
        return this._isTranscriptOpen();
      }
      this._log('❌ Transcript button not found');
      return false;
    } catch (error) {
      console.error('[Udemy Summary] Error opening transcript:', error);
      return false;
    }
  }

  _createButtonWrapper() {
    const wrapper = document.createElement('div');
    wrapper.className = 'popper-module--popper--mM5Ie';
    wrapper.appendChild(this.createButton());
    return wrapper;
  }

  _insertBeforeWrapped(controlBar, selector, label) {
    const targetBtn = controlBar.querySelector(selector);
    if (targetBtn) {
      const wrapper = targetBtn.closest('.popper-module--popper--mM5Ie');
      if (wrapper?.parentNode) {
        this._log(`Found ${label} button, inserting before it...`);
        wrapper.parentNode.insertBefore(this._createButtonWrapper(), wrapper);
        this._log(`✅ Button inserted (before ${label})`);
        return true;
      }
    }
    return false;
  }
}

// ── Bootstrap ────────────────────────────────────────────
const platform = new UdemyPlatform();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => platform.init());
} else {
  platform.init();
}
