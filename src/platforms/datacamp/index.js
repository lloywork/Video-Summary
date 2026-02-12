/**
 * DataCamp Platform — Extends BasePlatform for DataCamp-specific behavior.
 *
 * DataCamp is the most complex platform because:
 *  - The video player is in an iframe (cross-origin).
 *  - Two different UI versions exist (Old transcript panel & New AI Coach UI).
 *  - Multiple fallback button injection strategies are needed.
 */

const BasePlatform = require('../../core/BasePlatform');
const { createSparkleIcon } = require('../../core/Assets');
const AIBridge = require('../../core/AIBridge');

class DataCampPlatform extends BasePlatform {
  constructor() {
    super();

    this.PLATFORM_NAME = 'datacamp';
    this.BUTTON_ID = 'datacamp_ai_summary_btn';
    this._retryCount = 0;

    this.SELECTORS = {
      transcriptButton: 'button[data-testid="dynamic-transcript-button"]',
      transcriptPanel: '.side-panel-container-dynamic-transcript',
      transcriptSlide: 'div[data-trackid="transcript-slide"]',
      aiCoachToggle: '[data-waffles-component="toggle-button"]',
      transcriptTabButton: 'button[aria-label="Transcript"]',
    };
  }

  // ═══════════════════════════════════════════════════════
  // OVERRIDES
  // ═══════════════════════════════════════════════════════

  isVideoPage() {
    const isCoursePage =
      window.location.pathname.includes('/courses/') ||
      window.location.pathname.includes('/learn/');

    if (!isCoursePage) return false;

    return (
      document.querySelector(this.SELECTORS.transcriptButton) !== null ||
      document.querySelector(this.SELECTORS.transcriptTabButton) !== null ||
      document.querySelectorAll(this.SELECTORS.transcriptSlide).length > 0 ||
      document.querySelector('iframe[src*="projector.datacamp.com"]') !== null ||
      document.querySelector('.video-exercise') !== null
    );
  }

  attemptButtonInsertion() {
    this._log('Attempting button insertion...');

    if (this.buttonExists()) { this._log('Button already exists'); return; }
    if (!this.isVideoPage()) { this._log('Not on a video page'); return; }

    // Strategy 1: NEW AI Coach UI - next to "Got it!" button
    const gotItButton = document.querySelector('button[data-cy="submit-button"]');
    if (gotItButton) {
      const gotItContainer = gotItButton.closest('.css-99rcup') || gotItButton.parentNode;
      if (gotItContainer?.parentNode) {
        gotItContainer.parentNode.insertBefore(this._createAICoachButton(), gotItContainer.nextSibling);
        this._log('✅ Button inserted (next to Got it! button)');
        this._retryCount = 0;
        return;
      }
    }

    // Strategy 2: Next to "Show Transcript" button (OLD UI)
    const transcriptBtn = document.querySelector(this.SELECTORS.transcriptButton);
    if (transcriptBtn) {
      const transcriptWrapper = transcriptBtn.closest('.css-ww6sjh');
      if (transcriptWrapper?.parentNode) {
        transcriptWrapper.parentNode.insertBefore(this._createButtonWrapper(), transcriptWrapper.nextSibling);
        this._log('✅ Button inserted (next to Transcript button)');
        this._retryCount = 0;
        return;
      }
      if (transcriptBtn.parentNode) {
        transcriptBtn.parentNode.insertBefore(this.createButton(), transcriptBtn.nextSibling);
        this._log('✅ Button inserted (after Transcript button)');
        this._retryCount = 0;
        return;
      }
    }

    // Strategy 3: Controls area
    const controlsArea = document.querySelector('.css-f11twg');
    if (controlsArea) {
      controlsArea.insertBefore(this._createButtonWrapper(), controlsArea.firstChild);
      this._log('✅ Button inserted (in controls area)');
      this._retryCount = 0;
      return;
    }

    // Strategy 4: Video header
    const videoHeader = document.querySelector('.video-exercise header, .video-container header');
    if (videoHeader) {
      const button = this.createButton();
      button.style.marginLeft = '12px';
      videoHeader.querySelector('div')?.appendChild(button);
      this._log('✅ Button inserted (in header)');
      this._retryCount = 0;
      return;
    }

    // Strategy 5: Floating button
    const videoContainer = document.querySelector('.video-exercise, .video-container');
    if (videoContainer) {
      videoContainer.appendChild(this._createFloatingButton());
      this._log('✅ Floating button created');
      this._retryCount = 0;
      return;
    }

    this._log('❌ Could not find insertion point, retrying...');
    this._retryCount++;
    if (this._retryCount < 10) {
      setTimeout(() => this.attemptButtonInsertion(), 1000);
    } else {
      this._log('Max retries reached, giving up');
      this._retryCount = 0;
    }
  }

  createButton() {
    const button = document.createElement('button');
    button.id = this.BUTTON_ID;
    button.type = 'button';
    button.className = 'css-fxdk7l datacamp-ai-summary-btn';
    button.setAttribute('data-waffles-component', 'button');
    button.setAttribute('aria-label', 'AI Summary');
    button.title = 'AI Summary - Generate AI summary of this lesson';

    button.innerHTML = `
      <span class="css-61bni1" style="display: flex; align-items: center; gap: 6px;">
        ${createSparkleIcon({ size: 16, fill: 'currentColor' })}
        AI Summary
      </span>
    `;

    button.addEventListener('click', (e) => this.handleSummaryClick(e));
    return button;
  }

  pauseVideo() {
    this._log('Attempting to pause video...');
    const iframe = document.querySelector('iframe[src*="projector.datacamp.com"]');
    if (iframe?.contentWindow) {
      try {
        iframe.contentWindow.postMessage({ action: 'pause' }, '*');
        this._log('Sent pause message to iframe');
      } catch (e) {
        this._log('Could not send message to iframe:', e);
      }
    }
    this._log('⚠️ Video in iframe - manual pause may be needed');
    return false;
  }

  getVideoTitle() {
    const selectors = [
      'h1[data-cy="exercise-title"]',
      'h1.css-1qgaovm',
      '[data-cy="lesson-title"]',
      'h1', 'title',
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) return el.textContent.trim();
    }
    return document.title.replace(' | DataCamp', '').replace(' - DataCamp', '');
  }

  getVideoUrl() {
    return window.location.href.split('?')[0];
  }

  async getTranscript(settings) {
    return window.TranscriptUtils.getDataCampTranscriptFromDom(settings.copyFormat);
  }

  /**
   * DataCamp overrides handleSummaryClick to handle transcript opening
   * for both old and new UI versions.
   */
  async handleSummaryClick(e) {
    e.preventDefault();
    e.stopPropagation();

    const btn = e.currentTarget;
    this.pauseVideo();

    try {
      this._setButtonLoading(btn, true);
      btn.classList?.add('loading');
      this.notification.show('🔄 Getting transcript...', 'info');

      if (!this._isTranscriptOpen()) {
        const opened = await this._autoOpenTranscript();
        if (!opened) {
          this.notification.show('❌ Could not open transcript', 'error');
          this._setButtonLoading(btn, false);
          btn.classList?.remove('loading');
          return;
        }
        await this.sleep(1000);
      }

      const settings = await window.StorageUtils.getSettings();
      const transcript = await this.getTranscript(settings);

      if (!transcript || transcript.trim() === '') {
        this.notification.show('❌ Transcript is empty or not found', 'error');
        this._setButtonLoading(btn, false);
        btn.classList?.remove('loading');
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
        setTimeout(() => {
          this._setButtonLoading(btn, false);
          btn.classList?.remove('loading');
        }, 500);
      } else {
        this.notification.show('✅ Copied! Paste (Ctrl+V) into AI chat', 'success');
        this._setButtonLoading(btn, false);
        btn.classList?.remove('loading');
      }
    } catch (error) {
      console.error('[DataCamp Summary] Error:', error);
      this.notification.show(`❌ Error: ${error.message}`, 'error');
      this._setButtonLoading(btn, false);
      btn.classList?.remove('loading');
    }
  }

  // ═══════════════════════════════════════════════════════
  // PRIVATE
  // ═══════════════════════════════════════════════════════

  _isNewAICoachUI() {
    return document.querySelector(this.SELECTORS.aiCoachToggle) !== null;
  }

  _isTranscriptTabActive() {
    const transcriptBtn = document.querySelector(this.SELECTORS.transcriptTabButton);
    if (transcriptBtn) {
      const parentLi = transcriptBtn.closest('li');
      return parentLi?.getAttribute('aria-current') === 'true';
    }
    return false;
  }

  _hasTranscriptSlides() {
    return document.querySelectorAll(this.SELECTORS.transcriptSlide).length > 0;
  }

  _isTranscriptOpen() {
    if (this._isNewAICoachUI()) {
      return this._isTranscriptTabActive() && this._hasTranscriptSlides();
    }
    const panel = document.querySelector(this.SELECTORS.transcriptPanel);
    return panel !== null && panel.offsetHeight > 0;
  }

  async _autoOpenTranscript() {
    this._log('Checking transcript panel...');

    if (this._isNewAICoachUI()) {
      this._log('Detected new AI Coach UI');
      if (this._isTranscriptTabActive()) {
        await this.sleep(300);
        if (this._hasTranscriptSlides()) return true;
      }
      const clicked = await this._clickTranscriptTab();
      if (clicked) {
        await this.sleep(500);
        if (this._hasTranscriptSlides()) return true;
      }
      this._log('❌ Could not open transcript in new UI');
      return false;
    }

    // Old UI
    if (this._isTranscriptOpen()) return true;

    const transcriptBtn = document.querySelector(this.SELECTORS.transcriptButton);
    if (transcriptBtn) {
      transcriptBtn.click();
      await this.sleep(1000);
      if (this._isTranscriptOpen()) return true;
      transcriptBtn.click();
      await this.sleep(1500);
      return this._isTranscriptOpen();
    }

    this._log('❌ Transcript button not found');
    return false;
  }

  async _clickTranscriptTab() {
    const transcriptBtn = document.querySelector(this.SELECTORS.transcriptTabButton);
    if (transcriptBtn) {
      transcriptBtn.click();
      await this.sleep(500);
      if (this._isTranscriptTabActive()) return true;
      transcriptBtn.click();
      await this.sleep(500);
      return this._isTranscriptTabActive();
    }
    return false;
  }

  _createButtonWrapper() {
    const wrapper = document.createElement('div');
    wrapper.className = 'css-ww6sjh datacamp-ai-summary-wrapper';
    wrapper.style.cssText = 'display: inline-flex; margin-left: 8px;';
    wrapper.appendChild(this.createButton());
    return wrapper;
  }

  _createAICoachButton() {
    const wrapper = document.createElement('div');
    wrapper.className = 'css-1vr7vmn datacamp-ai-summary-wrapper';
    wrapper.style.cssText = 'margin-left: 8px;';

    const button = document.createElement('button');
    button.id = this.BUTTON_ID;
    button.type = 'button';
    button.className = 'css-pib74g datacamp-ai-summary-btn';
    button.setAttribute('aria-label', 'AI Summary');
    button.title = 'AI Summary - Generate AI summary of this lesson';

    button.innerHTML = `
      <span class="css-m8cbsc" style="display: flex; align-items: center; gap: 6px;">
        ${createSparkleIcon({ size: 14, fill: 'currentColor' })}
        AI Summary
      </span>
    `;

    button.addEventListener('click', (e) => this.handleSummaryClick(e));
    wrapper.appendChild(button);
    return wrapper;
  }

  _createFloatingButton() {
    const button = this.createButton();
    button.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 1000;
      background: #03EF62;
      color: #05192d;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    button.innerHTML = `
      ${createSparkleIcon({ size: 16, fill: 'currentColor' })}
      <span>AI Summary</span>
    `;
    return button;
  }
}

// ── Bootstrap ────────────────────────────────────────────
const platform = new DataCampPlatform();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => platform.init());
} else {
  platform.init();
}
