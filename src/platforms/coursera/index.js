/**
 * Coursera Platform — Extends BasePlatform for Coursera-specific behavior.
 */

const BasePlatform = require('../../core/BasePlatform');
const { createSparkleIcon } = require('../../core/Assets');
const AIBridge = require('../../core/AIBridge');

class CourseraPlatform extends BasePlatform {
  constructor() {
    super();

    this.PLATFORM_NAME = 'coursera';
    this.BUTTON_ID = 'coursera_ai_summary_btn';

    this.SELECTORS = {
      saveNoteButton: '#save-note-button',
      captureHighlightContainer: '.rc-CaptureHighlightButton',
      playToggle: 'button[data-testid="playToggle"]',
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

    // Strategy 1: Insert before Save note button
    const saveNoteBtn = document.getElementById('save-note-button');
    if (saveNoteBtn?.parentNode) {
      saveNoteBtn.parentNode.insertBefore(this.createButton(), saveNoteBtn);
      this._log('✅ Button inserted (inline, left of Save note)');
      return;
    }

    // Strategy 2: Insert into .rc-CaptureHighlightButton container
    const captureContainer = document.querySelector(this.SELECTORS.captureHighlightContainer);
    if (captureContainer) {
      captureContainer.insertBefore(this.createButton(), captureContainer.firstChild);
      this._log('✅ Button inserted (first child of Save note container)');
      return;
    }

    this._log('❌ Could not find Save note button yet, retrying...');
    setTimeout(() => this.attemptButtonInsertion(), 1000);
  }

  createButton() {
    const button = document.createElement('button');
    button.id = this.BUTTON_ID;
    button.type = 'button';
    button.className = 'cds-131 cds-button-disableElevation cds-button-ghost css-2bhpsm';
    button.setAttribute('aria-disabled', 'false');
    button.setAttribute('tabindex', '0');

    const labelSpan = document.createElement('span');
    labelSpan.className = 'cds-button-label';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'cds-button-startIcon';
    iconSpan.innerHTML = createSparkleIcon({ size: 16, fill: 'currentColor' });

    labelSpan.appendChild(iconSpan);
    labelSpan.append('AI Summary');
    button.appendChild(labelSpan);

    button.addEventListener('click', (e) => this.handleSummaryClick(e));
    return button;
  }

  pauseVideo() {
    const video = document.querySelector(this.SELECTORS.videoElement);
    const playButton = document.querySelector(this.SELECTORS.playToggle);

    if (video && !video.paused) {
      if (playButton) {
        const ariaLabel = (playButton.getAttribute('aria-label') || '').toLowerCase();
        if (ariaLabel.includes('pause') || ariaLabel.includes('tạm dừng')) {
          this._log('⏸️ Clicking pause button...');
          playButton.click();
          return true;
        }
      }
      try { video.pause(); this._log('⏸️ Video paused via API'); return true; }
      catch (e) { this._log('Could not pause via API:', e); }
    }

    if (playButton) {
      const ariaLabel = (playButton.getAttribute('aria-label') || '').toLowerCase();
      if (ariaLabel.includes('pause') || ariaLabel.includes('tạm dừng')) {
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
      'h1[data-testid="item-name"]',
      'h1.cds-119',
      '[data-testid="rc-ItemName"] h1',
      'h1', 'title',
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) return el.textContent.trim();
    }
    return document.title.replace(' | Coursera', '').replace(' - Coursera', '');
  }

  getVideoUrl() {
    return window.location.href.split('?')[0];
  }

  async getTranscript(settings) {
    return window.TranscriptUtils.getCourseraTranscriptFromDom(settings.copyFormat);
  }

  /**
   * Coursera doesn't need the transcript sidebar opening step,
   * so we use the base handleSummaryClick mostly as-is but with
   * a "Getting transcript..." notification.
   */
  async handleSummaryClick(e) {
    e.preventDefault();
    e.stopPropagation();

    const btn = e.currentTarget;
    this.pauseVideo();

    try {
      this._setButtonLoading(btn, true);
      this.notification.show('🔄 Getting transcript...', 'info');

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
    } catch (error) {
      console.error('[Coursera Summary] Error:', error);
      this.notification.show(`❌ Error: ${error.message}`, 'error');
      this._setButtonLoading(btn, false);
    }
  }
}

// ── Bootstrap ────────────────────────────────────────────
const platform = new CourseraPlatform();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => platform.init());
} else {
  platform.init();
}
