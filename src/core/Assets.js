/**
 * Centralized SVG Icons and shared style constants.
 * All platform scripts import from here to avoid duplication.
 */

/**
 * Sparkle icon used as the "AI Summary" button icon.
 * @param {Object} [options] - Icon options
 * @param {number} [options.size=24] - Width and height of the icon
 * @param {string} [options.fill='currentColor'] - Fill color
 * @returns {string} SVG markup string
 */
function createSparkleIcon({ size = 24, fill = 'currentColor' } = {}) {
  return `
    <svg height="${size}" width="${size}" viewBox="0 0 24 24" fill="${fill}" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L13.09 8.26L18 6L15.74 10.91L22 12L15.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L8.26 13.09L2 12L8.26 10.91L6 6L10.91 8.26L12 2Z"/>
    </svg>
  `;
}

/**
 * Notification color palettes per notification type.
 * Shared defaults — platforms can override the 'info' color for branding.
 */
const NOTIFICATION_COLORS = {
  success: { bg: 'rgba(76, 175, 80, 0.95)', text: '#fff' },
  warning: { bg: 'rgba(255, 152, 0, 0.95)', text: '#fff' },
  error: { bg: 'rgba(244, 67, 54, 0.95)', text: '#fff' },
  info: { bg: 'rgba(33, 150, 243, 0.95)', text: '#fff' },
};

/**
 * Platform-specific brand colors for the 'info' notification type.
 */
const PLATFORM_INFO_COLORS = {
  youtube: { bg: 'rgba(33, 150, 243, 0.95)', text: '#fff' },
  udemy: { bg: 'rgba(163, 30, 211, 0.95)', text: '#fff' },
  coursera: { bg: 'rgba(0, 86, 210, 0.95)', text: '#fff' },
  datacamp: { bg: 'rgba(3, 239, 98, 0.95)', text: '#05192d' },
};

/**
 * Platform-specific font families for notifications.
 */
const PLATFORM_FONTS = {
  youtube: "'YouTube Sans', 'Roboto', sans-serif",
  udemy: "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Roboto', 'Segoe UI', sans-serif",
  coursera: "'Source Sans Pro', Arial, sans-serif",
  datacamp: "'Lato', sans-serif",
};

// Export for use by other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createSparkleIcon, NOTIFICATION_COLORS, PLATFORM_INFO_COLORS, PLATFORM_FONTS };
}
