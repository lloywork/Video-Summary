/**
 * Notification Manager — handles toast notifications in the video player.
 * Replaces the duplicated `showPlayerNotification`, `addNotificationKeyframes`,
 * and `addSpinKeyframes` functions that existed in every platform script.
 */

const { NOTIFICATION_COLORS, PLATFORM_INFO_COLORS, PLATFORM_FONTS } = require('./Assets');

class Notification {
  /**
   * @param {string} platformName - e.g. 'youtube', 'udemy', 'coursera', 'datacamp'
   * @param {Object} [options]
   * @param {string} [options.containerSelector] - CSS selector for the notification parent
   *   (e.g. '.html5-video-player' on YouTube). Falls back to document.body.
   * @param {'absolute'|'fixed'} [options.position='fixed'] - CSS position strategy.
   */
  constructor(platformName, options = {}) {
    this.platformName = platformName;
    this.containerSelector = options.containerSelector || null;
    this.position = options.position || 'fixed';

    this.notificationId = `${platformName}-summary-player-notification`;
    this.notificationStyleId = `${platformName}-summary-notification-styles`;
    this.spinStyleId = `${platformName}-summary-spin-styles`;
  }

  /**
   * Show a toast notification.
   * @param {string} message - Notification text
   * @param {'success'|'warning'|'error'|'info'} [type='info'] - Notification type
   */
  show(message, type = 'info') {
    this.dismiss();

    const notification = document.createElement('div');
    notification.id = this.notificationId;
    notification.textContent = message;

    const color = this._getColor(type);
    const fontFamily = PLATFORM_FONTS[this.platformName] || "'Roboto', sans-serif";
    const bottom = this.position === 'absolute' ? '60px' : '100px';

    notification.style.cssText = `
      position: ${this.position};
      bottom: ${bottom};
      left: 50%;
      transform: translateX(-50%);
      padding: ${this.position === 'absolute' ? '10px 20px' : '12px 24px'};
      border-radius: 8px;
      background: ${color.bg};
      color: ${color.text};
      font-family: ${fontFamily};
      font-size: 14px;
      font-weight: ${this.position === 'absolute' ? '500' : '600'};
      z-index: ${this.position === 'absolute' ? '9999' : '999999'};
      box-shadow: 0 4px ${this.position === 'absolute' ? '12px' : '20px'} rgba(0,0,0,${this.position === 'absolute' ? '0.4' : '0.3'});
      animation: fadeInUp 0.3s ease;
      pointer-events: none;
    `;

    this._injectNotificationStyles();

    const container = this._getContainer();
    container.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'fadeOutDown 0.3s ease forwards';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Remove any existing notification immediately.
   */
  dismiss() {
    const existing = document.getElementById(this.notificationId);
    if (existing) {
      existing.remove();
    }
  }

  /**
   * Inject spin keyframes (used for the loading spinner on the button SVG icon).
   */
  injectSpinStyles() {
    if (document.getElementById(this.spinStyleId)) return;

    const style = document.createElement('style');
    style.id = this.spinStyleId;
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  // ── Private helpers ──────────────────────────────────────

  /**
   * Get the color palette for a notification type.
   * @param {string} type
   * @returns {{ bg: string, text: string }}
   * @private
   */
  _getColor(type) {
    if (type === 'info') {
      return PLATFORM_INFO_COLORS[this.platformName] || NOTIFICATION_COLORS.info;
    }
    return NOTIFICATION_COLORS[type] || NOTIFICATION_COLORS.info;
  }

  /**
   * Get the container element to append notifications to.
   * @returns {HTMLElement}
   * @private
   */
  _getContainer() {
    if (this.containerSelector) {
      const container = document.querySelector(this.containerSelector);
      if (container) return container;
    }
    return document.body;
  }

  /**
   * Inject notification animation keyframes (once per platform).
   * @private
   */
  _injectNotificationStyles() {
    if (document.getElementById(this.notificationStyleId)) return;

    const style = document.createElement('style');
    style.id = this.notificationStyleId;
    style.textContent = `
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateX(-50%) translateY(10px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      @keyframes fadeOutDown {
        from { opacity: 1; transform: translateX(-50%) translateY(0); }
        to { opacity: 0; transform: translateX(-50%) translateY(10px); }
      }
    `;
    document.head.appendChild(style);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Notification;
}
