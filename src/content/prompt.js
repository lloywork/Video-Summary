// Prompt template generation and variable replacement

/**
 * Generate prompt by replacing template variables
 * @param {string} template - Prompt template with variables
 * @param {Object} data - Data object with title, url, transcript
 * @returns {string} Generated prompt
 */
function generatePrompt(template, data) {
  const { title, url, transcript } = data;
  
  let prompt = template;
  prompt = prompt.replace(/\{\{Title\}\}/g, title || 'Unknown Title');
  prompt = prompt.replace(/\{\{URL\}\}/g, url || '');
  prompt = prompt.replace(/\{\{Transcript\}\}/g, transcript || 'No transcript available');
  
  return prompt;
}

/**
 * Return text without any truncation (no limit)
 * @param {string} text - Text to process
 * @returns {string} Original text unchanged
 */
function truncateText(text) {
  // No limit - return full transcript
  return text;
}

/**
 * Get video title from page
 * @returns {string} Video title
 */
function getVideoTitle() {
  const titleElement = document.querySelector('h1.ytd-watch-metadata yt-formatted-string');
  return titleElement ? titleElement.textContent.trim() : document.title.replace(' - YouTube', '');
}

/**
 * Get video URL
 * @returns {string} Video URL
 */
function getVideoUrl() {
  return window.location.href.split('&')[0]; // Remove extra parameters
}

/**
 * Get video ID from URL
 * @returns {string|null} Video ID
 */
function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

// Make functions available globally
if (typeof window !== 'undefined') {
  window.PromptUtils = {
    generatePrompt,
    truncateText,
    getVideoTitle,
    getVideoUrl,
    getVideoId
  };
}
