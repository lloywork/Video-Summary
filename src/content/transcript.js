// Transcript scraping from YouTube's visible DOM (Vanilla JS)
// Strategy: User manually opens "Show Transcript" sidebar, extension reads from DOM

/**
 * Check if transcript sidebar is currently open and has content
 * @returns {boolean} True if transcript is visible in DOM
 */
function isTranscriptSidebarOpen() {
  const segments = document.querySelectorAll('ytd-transcript-segment-renderer');
  return segments.length > 0;
}

/**
 * Get available language options (simplified for DOM scraping)
 * Returns a mock "DOM" option if transcript sidebar is open
 * 
 * @param {string} videoId - YouTube video ID (unused, kept for API compatibility)
 * @returns {Promise<Array|null>} Array with single "DOM" option or null
 */
async function getLangOptionsWithLink(videoId) {
  console.log('[YouTube Summary] Checking for open transcript sidebar...');
  
  // Wait a moment for DOM to be ready
  await sleep(300);
  
  if (!isTranscriptSidebarOpen()) {
    console.warn('[YouTube Summary] Transcript sidebar not found. User needs to open it manually.');
    return null;
  }
  
  // Return a mock language option indicating we'll scrape from DOM
  console.log('[YouTube Summary] Transcript sidebar detected!');
  return [{
    language: 'DOM',
    link: null,  // No URL needed - we scrape directly from DOM
    source: 'dom-scrape'
  }];
}

/**
 * Find the VISIBLE transcript list container (YouTube may render 2 - one hidden)
 * @returns {Element|null} The visible scroll container
 */
function getVisibleTranscriptContainer() {
  const containers = document.querySelectorAll('ytd-transcript-segment-list-renderer');
  
  // Find the one that is actually visible
  for (const container of containers) {
    if (container.offsetWidth > 0 && container.offsetHeight > 0) {
      return container;
    }
  }
  
  // Fallback to first one if none appear visible
  return containers[0] || null;
}

/**
 * Scroll through transcript panel to load all segments
 * YouTube may lazy-load segments for long videos
 * @returns {Promise<Element|null>} The scrolled container element
 */
async function scrollToLoadAllSegments() {
  const scrollEl = getVisibleTranscriptContainer();
  
  if (!scrollEl) {
    console.log('[YouTube Summary] Scrollable element not found, skipping scroll');
    return null;
  }
  
  console.log('[YouTube Summary] Scrolling to load all transcript segments...');
  console.log(`[YouTube Summary] Container: ${scrollEl.offsetWidth}x${scrollEl.offsetHeight}, scrollHeight: ${scrollEl.scrollHeight}`);
  
  // Count only segments WITHIN this container (not from hidden duplicate)
  const getSegmentCount = () => scrollEl.querySelectorAll('ytd-transcript-segment-renderer').length;
  
  const initialCount = getSegmentCount();
  let previousScrollHeight = 0;
  let stableRounds = 0;
  const maxScrollAttempts = 500; // Increased for very long videos (6hr+)
  
  // Scroll to bottom incrementally until no new content loads
  for (let i = 0; i < maxScrollAttempts; i++) {
    // Scroll down by viewport height
    scrollEl.scrollTop += scrollEl.clientHeight;
    await sleep(400); // Increased wait time for slower connections
    
    // Check if we've truly reached the bottom
    const atBottom = scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 20;
    
    if (atBottom) {
      // Wait a bit more to see if more content loads
      await sleep(500);
      
      // Check if scrollHeight increased (more content loaded)
      if (scrollEl.scrollHeight === previousScrollHeight) {
        stableRounds++;
        if (stableRounds >= 3) {
          console.log(`[YouTube Summary] Reached end. Total: ${getSegmentCount()} segments.`);
          break;
        }
      } else {
        stableRounds = 0;
      }
    }
    
    previousScrollHeight = scrollEl.scrollHeight;
    
    // Log progress every 20 scrolls
    if (i % 20 === 0) {
      console.log(`[YouTube Summary] Scroll ${i}: ${getSegmentCount()} segments, scrollTop: ${scrollEl.scrollTop}/${scrollEl.scrollHeight}`);
    }
  }
  
  const finalCount = getSegmentCount();
  console.log(`[YouTube Summary] Scroll complete: ${finalCount} segments (was ${initialCount})`);
  
  return scrollEl;
}

/**
 * Get raw transcript data from the visible DOM
 * Scrolls to ensure all segments are loaded first
 * @returns {Promise<Array>} Array of transcript items with timestamp and text
 */
async function getRawTranscriptFromDom() {
  // EXPERIMENTAL: Skip scrolling, get transcript immediately
  // This tests if YouTube lazy-loads segments or has all of them in DOM
  console.log('[YouTube Summary] [EXPERIMENTAL] Skipping scroll - getting transcript immediately...');
  
  const container = getVisibleTranscriptContainer();
  
  // Get segments only from the visible container (not the hidden duplicate)
  const segments = container 
    ? container.querySelectorAll('ytd-transcript-segment-renderer')
    : document.querySelectorAll('ytd-transcript-segment-renderer');
  
  console.log(`[YouTube Summary] [EXPERIMENTAL] Found ${segments.length} segments without scrolling`);
  
  if (segments.length === 0) {
    console.warn('[YouTube Summary] No transcript segments found in DOM');
    return [];
  }
  
  console.log(`[YouTube Summary] Scraping ${segments.length} transcript segments from visible container`);
  
  // Use a Map to deduplicate by timestamp+text (YouTube may render duplicates)
  const seenMap = new Map();
  
  segments.forEach((segment) => {
    // Extract timestamp - try multiple selectors
    const timestampEl = segment.querySelector('.segment-timestamp, .segment-start-offset');
    const timestamp = timestampEl ? timestampEl.textContent.trim() : '';
    
    // Extract text
    const textEl = segment.querySelector('.segment-text');
    const text = textEl ? textEl.textContent.trim() : '';
    
    if (text) {
      // Create unique key from timestamp + first 50 chars of text
      const key = `${timestamp}|${text.substring(0, 50)}`;
      
      if (!seenMap.has(key)) {
        seenMap.set(key, {
          timestamp: timestamp,
          text: text,
          // Convert timestamp string to seconds for sorting
          start: parseFloat(timestampToSeconds(timestamp)) || 0
        });
      }
    }
  });
  
  // Convert to array and sort by timestamp (seconds)
  const transcriptItems = Array.from(seenMap.values())
    .sort((a, b) => a.start - b.start)
    .map((item, index) => ({
      index: index,
      timestamp: item.timestamp,
      text: item.text,
      start: String(item.start)
    }));
  
  console.log(`[YouTube Summary] Deduplicated to ${transcriptItems.length} unique segments`);
  
  return transcriptItems;
}

/**
 * Convert timestamp string (e.g., "1:23" or "1:23:45") to seconds
 * @param {string} timestamp - Timestamp string
 * @returns {string} Seconds as string (for compatibility with old format)
 */
function timestampToSeconds(timestamp) {
  if (!timestamp) return '0';
  
  const parts = timestamp.split(':').map(p => parseInt(p, 10) || 0);
  
  if (parts.length === 3) {
    // HH:MM:SS
    return String(parts[0] * 3600 + parts[1] * 60 + parts[2]);
  } else if (parts.length === 2) {
    // MM:SS
    return String(parts[0] * 60 + parts[1]);
  }
  
  return '0';
}

/**
 * Get transcript text (plain, no timestamps)
 * @param {Object} langOption - Language option (unused for DOM scraping)
 * @returns {Promise<string>} Plain transcript text
 */
async function getTranscript(langOption) {
  try {
    const items = await getRawTranscriptFromDom();
    return items.map(item => item.text).join(' ');
  } catch (error) {
    console.error('[YouTube Summary] Error getting transcript:', error);
    return '';
  }
}

/**
 * Get raw transcript with timestamps
 * @param {string} link - URL (unused for DOM scraping, kept for compatibility)
 * @returns {Promise<Array>} Array of transcript items
 */
async function getRawTranscript(link) {
  return await getRawTranscriptFromDom();
}

/**
 * Get formatted transcript with timestamps
 * @param {Object} langOption - Language option (unused for DOM scraping)
 * @param {string} videoId - YouTube video ID (unused, kept for compatibility)
 * @param {string} format - Format type: 'plain' or 'markdown'
 * @returns {Promise<string>} Formatted transcript
 */
async function getFormattedTranscript(langOption, videoId, format = 'plain') {
  try {
    const items = await getRawTranscriptFromDom();
    
    if (items.length === 0) {
      return '';
    }
    
    return items.map(item => {
      if (format === 'markdown') {
        return `**[${item.timestamp}]** ${item.text}`;
      }
      return `(${item.timestamp}) ${item.text}`;
    }).join('\n');

  } catch (error) {
    console.error('[YouTube Summary] Error formatting transcript:', error);
    return '';
  }
}

/**
 * Direct method to get transcript from DOM (new simplified API)
 * @param {string} format - Format type: 'plain', 'markdown', or 'raw'
 * @returns {string|Array} Transcript in requested format
 */
async function getTranscriptFromDom(format = 'plain') {
  const items = await getRawTranscriptFromDom();
  
  if (items.length === 0) {
    return format === 'raw' ? [] : '';
  }
  
  if (format === 'raw') {
    return items;
  }
  
  if (format === 'markdown') {
    return items.map(item => `**[${item.timestamp}]** ${item.text}`).join('\n');
  }
  
  // Plain format with timestamps
  if (format === 'plain') {
    return items.map(item => `(${item.timestamp}) ${item.text}`).join('\n');
  }
  
  // Text only - no timestamps
  return items.map(item => item.text).join(' ');
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Resolves after ms milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==========================================
// UDEMY TRANSCRIPT SCRAPING FUNCTIONS
// ==========================================

/**
 * Check if Udemy transcript sidebar is currently open
 * @returns {boolean} True if transcript panel is visible
 */
function isUdemyTranscriptOpen() {
  const transcriptBtn = document.querySelector('button[data-purpose="transcript-toggle"]');
  if (transcriptBtn) {
    return transcriptBtn.getAttribute('aria-expanded') === 'true';
  }
  return false;
}

/**
 * Get transcript panel container for Udemy
 * @returns {Element|null} The transcript panel element
 */
function getUdemyTranscriptPanel() {
  // Udemy transcript panel selectors (try multiple patterns)
  const selectors = [
    '[data-purpose="transcript-panel"]',
    '[class*="transcript-panel"]',
    '[class*="sidebar"] [class*="transcript"]',
    '[class*="transcript-cue-container"]',
    // Panel that appears when transcript is toggled
    '[data-purpose="curriculum-item-viewer-content"] [class*="transcript"]',
  ];

  for (const selector of selectors) {
    const panel = document.querySelector(selector);
    if (panel && panel.offsetHeight > 0) {
      return panel;
    }
  }

  return null;
}

/**
 * Get raw transcript data from Udemy's DOM
 * @returns {Promise<Array>} Array of transcript items with timestamp and text
 */
async function getRawUdemyTranscriptFromDom() {
  console.log('[Udemy Summary] Scraping transcript from Udemy DOM...');
  
  // Wait for potential lazy loading
  await sleep(500);
  
  // Udemy transcript cue selectors (try multiple patterns)
  const cueSelectors = [
    '[data-purpose="transcript-cue-container"]',
    '[class*="transcript-cue"]',
    '[class*="cue-container"]',
    // Individual cue items
    '[data-purpose="transcript-cue"]',
    'button[data-purpose^="transcript-cue"]',
    // Generic patterns in transcript area
    '[class*="transcript"] p',
    '[class*="transcript"] span[data-purpose]',
  ];

  let cues = [];
  
  // Try each selector until we find cues
  for (const selector of cueSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`[Udemy Summary] Found ${elements.length} cues with selector: ${selector}`);
      cues = elements;
      break;
    }
  }

  // If still no cues, try to find any clickable transcript items
  if (cues.length === 0) {
    // Look for buttons/divs with transcript-related attributes anywhere
    const allButtons = document.querySelectorAll('button[data-purpose*="transcript"], [data-purpose*="cue"]');
    if (allButtons.length > 0) {
      cues = allButtons;
      console.log(`[Udemy Summary] Found ${cues.length} transcript buttons`);
    }
  }

  // Last resort: look for any elements in the transcript sidebar area
  if (cues.length === 0) {
    const sidebar = document.querySelector('[class*="sidebar"]');
    if (sidebar) {
      // Find all paragraph-like elements that might be transcript text
      const textElements = sidebar.querySelectorAll('p, span[class*="text"], div[class*="cue"]');
      if (textElements.length > 5) { // Likely transcript if many items
        cues = textElements;
        console.log(`[Udemy Summary] Found ${cues.length} potential transcript elements in sidebar`);
      }
    }
  }

  if (cues.length === 0) {
    console.warn('[Udemy Summary] No transcript cues found in DOM');
    return [];
  }

  console.log(`[Udemy Summary] Processing ${cues.length} transcript cues`);

  const transcriptItems = [];
  let index = 0;

  cues.forEach((cue) => {
    // Try to extract timestamp
    let timestamp = '';
    let text = '';

    // Method 1: Look for data attributes
    const dataTime = cue.getAttribute('data-start') || 
                     cue.getAttribute('data-time') ||
                     cue.getAttribute('data-purpose')?.match(/\d+/)?.[0];
    
    // Method 2: Look for timestamp element within cue
    const timestampEl = cue.querySelector('[class*="timestamp"], [class*="time"], span:first-child');
    if (timestampEl) {
      const timestampText = timestampEl.textContent.trim();
      // Check if it looks like a timestamp (e.g., "1:23" or "01:23:45")
      if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timestampText)) {
        timestamp = timestampText;
      }
    }

    // Method 3: Parse from data attribute
    if (!timestamp && dataTime) {
      const seconds = parseInt(dataTime, 10);
      if (!isNaN(seconds)) {
        timestamp = formatSecondsToTimestamp(seconds);
      }
    }

    // Extract text content
    // Try to get just the text part (not timestamp)
    const textEl = cue.querySelector('[class*="text"], p, span:last-child');
    if (textEl) {
      text = textEl.textContent.trim();
    } else {
      // Fallback: get all text and remove timestamp if present
      text = cue.textContent.trim();
      if (timestamp && text.startsWith(timestamp)) {
        text = text.substring(timestamp.length).trim();
      }
    }

    // Clean up text
    text = text.replace(/\s+/g, ' ').trim();

    if (text && text.length > 0) {
      transcriptItems.push({
        index: index++,
        timestamp: timestamp || formatSecondsToTimestamp(index * 5), // Estimate if no timestamp
        text: text,
        start: timestamp ? timestampToSeconds(timestamp) : String(index * 5)
      });
    }
  });

  console.log(`[Udemy Summary] Parsed ${transcriptItems.length} transcript items`);
  
  return transcriptItems;
}

/**
 * Format seconds to timestamp string
 * @param {number} seconds - Total seconds
 * @returns {string} Formatted timestamp (MM:SS or HH:MM:SS)
 */
function formatSecondsToTimestamp(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get formatted transcript from Udemy DOM
 * @param {string} format - Format type: 'plain', 'markdown', or 'raw'
 * @returns {Promise<string|Array>} Transcript in requested format
 */
async function getUdemyTranscriptFromDom(format = 'plain') {
  const items = await getRawUdemyTranscriptFromDom();
  
  if (items.length === 0) {
    return format === 'raw' ? [] : '';
  }
  
  if (format === 'raw') {
    return items;
  }
  
  if (format === 'markdown') {
    return items.map(item => `**[${item.timestamp}]** ${item.text}`).join('\n');
  }
  
  // Plain format with timestamps
  if (format === 'plain') {
    return items.map(item => `(${item.timestamp}) ${item.text}`).join('\n');
  }
  
  // Text only - no timestamps
  return items.map(item => item.text).join(' ');
}

// ==========================================
// COURSERA TRANSCRIPT SCRAPING FUNCTIONS
// ==========================================

/**
 * Get raw transcript data from Coursera's DOM
 * Coursera displays transcript in div.rc-Paragraph elements
 * Each paragraph has a button.timestamp and multiple span.rc-Phrase
 * @returns {Promise<Array>} Array of transcript items with timestamp and text
 */
async function getRawCourseraTranscriptFromDom() {
  console.log('[Coursera Summary] Scraping transcript from Coursera DOM...');
  
  // Wait for potential lazy loading
  await sleep(300);
  
  // Find transcript panel - Coursera uses role="tabpanel"
  const transcriptPanels = document.querySelectorAll('div[role="tabpanel"]');
  let transcriptPanel = null;
  
  // Find the panel that contains transcript content
  for (const panel of transcriptPanels) {
    if (panel.querySelector('div.rc-Paragraph') || panel.querySelector('.rc-Transcript')) {
      transcriptPanel = panel;
      break;
    }
  }
  
  if (!transcriptPanel) {
    // Try alternative selectors
    transcriptPanel = document.querySelector('.rc-Transcript') || 
                      document.querySelector('[class*="transcript"]');
  }
  
  if (!transcriptPanel) {
    console.warn('[Coursera Summary] Transcript panel not found');
    return [];
  }
  
  console.log('[Coursera Summary] Found transcript panel');
  
  // Find all paragraph containers
  const paragraphs = transcriptPanel.querySelectorAll('div.rc-Paragraph');
  
  if (paragraphs.length === 0) {
    console.warn('[Coursera Summary] No transcript paragraphs found');
    return [];
  }
  
  console.log(`[Coursera Summary] Found ${paragraphs.length} transcript paragraphs`);
  
  const transcriptItems = [];
  let index = 0;
  
  paragraphs.forEach((paragraph) => {
    // Get timestamp from button.timestamp
    const timestampBtn = paragraph.querySelector('button.timestamp');
    let timestamp = '';
    
    if (timestampBtn) {
      // Get visible timestamp text (not the sr-only content)
      const timestampText = timestampBtn.textContent.trim();
      // Extract just the time part (e.g., "0:04" from "0:04")
      const timeMatch = timestampText.match(/\d{1,2}:\d{2}(:\d{2})?/);
      if (timeMatch) {
        timestamp = timeMatch[0];
      }
    }
    
    // Get all phrase spans
    const phrases = paragraph.querySelectorAll('span.rc-Phrase');
    let paragraphText = '';
    
    phrases.forEach((phrase) => {
      // Get text from the visible span (css-4s48ix)
      const textSpan = phrase.querySelector('span.css-4s48ix, span[aria-hidden="true"]');
      if (textSpan) {
        // Get text content and clean up
        let text = textSpan.textContent.trim();
        // Remove nbsp and extra spaces
        text = text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
        paragraphText += text + ' ';
      } else {
        // Fallback to phrase's own text
        let text = phrase.textContent.trim();
        text = text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
        paragraphText += text + ' ';
      }
    });
    
    paragraphText = paragraphText.trim();
    
    if (paragraphText) {
      transcriptItems.push({
        index: index++,
        timestamp: timestamp || formatSecondsToTimestamp(index * 30), // Estimate if no timestamp
        text: paragraphText,
        start: timestamp ? timestampToSeconds(timestamp) : String(index * 30)
      });
    }
  });
  
  console.log(`[Coursera Summary] Parsed ${transcriptItems.length} transcript items`);
  
  return transcriptItems;
}

/**
 * Get formatted transcript from Coursera DOM
 * @param {string} format - Format type: 'plain', 'markdown', or 'raw'
 * @returns {Promise<string|Array>} Transcript in requested format
 */
async function getCourseraTranscriptFromDom(format = 'plain') {
  const items = await getRawCourseraTranscriptFromDom();
  
  if (items.length === 0) {
    return format === 'raw' ? [] : '';
  }
  
  if (format === 'raw') {
    return items;
  }
  
  if (format === 'markdown') {
    return items.map(item => `**[${item.timestamp}]** ${item.text}`).join('\n');
  }
  
  // Plain format with timestamps
  if (format === 'plain') {
    return items.map(item => `(${item.timestamp}) ${item.text}`).join('\n');
  }
  
  // Text only - no timestamps
  return items.map(item => item.text).join(' ');
}

// ==========================================
// DATACAMP TRANSCRIPT SCRAPING FUNCTIONS
// ==========================================

/**
 * Get raw transcript data from DataCamp's DOM
 * DataCamp displays transcript in div[data-trackid="transcript-slide"] elements
 * Each slide has a time element and paragraph text
 * 
 * Supports two UI versions:
 * 1. Old UI: Transcript in .side-panel-container-dynamic-transcript panel
 * 2. New AI Coach UI: Transcript slides may be anywhere on the page
 * 
 * @returns {Promise<Array>} Array of transcript items with timestamp and text
 */
async function getRawDataCampTranscriptFromDom() {
  console.log('[DataCamp Summary] Scraping transcript from DataCamp DOM...');
  
  // Wait for potential lazy loading
  await sleep(300);
  
  let slides = [];
  let uiVersion = 'unknown';
  
  // Strategy 1: Try old UI with transcript panel
  const transcriptPanel = document.querySelector('.side-panel-container-dynamic-transcript');
  
  if (transcriptPanel) {
    slides = transcriptPanel.querySelectorAll('div[data-trackid="transcript-slide"]');
    if (slides.length > 0) {
      uiVersion = 'old-panel';
      console.log('[DataCamp Summary] Found transcript panel (old UI)');
    }
  }
  
  // Strategy 2: Fallback - search for transcript slides in new AI Coach UI containers
  if (slides.length === 0) {
    console.log('[DataCamp Summary] Old UI panel not found or empty, trying new AI Coach UI selectors...');
    
    // New AI Coach UI: slides are in specific containers
    const newUIContainerSelectors = [
      'div.css-107awck',  // Main transcript container in new UI
      'div.css-1333q64',  // Parent container
      'div.css-k9a8yh',   // Outer container
    ];
    
    for (const containerSelector of newUIContainerSelectors) {
      const container = document.querySelector(containerSelector);
      if (container) {
        slides = container.querySelectorAll('div[data-trackid="transcript-slide"]');
        if (slides.length > 0) {
          uiVersion = 'new-ai-coach-container';
          console.log(`[DataCamp Summary] Found slides in new AI Coach container: ${containerSelector}`);
          break;
        }
      }
    }
    
    // If still not found, search entire document
    if (slides.length === 0) {
      slides = document.querySelectorAll('div[data-trackid="transcript-slide"]');
      if (slides.length > 0) {
        uiVersion = 'new-ai-coach-global';
        console.log('[DataCamp Summary] Found transcript slides using global search');
      }
    }
  }
  
  // Strategy 3: Last resort - look for any scrollable transcript container patterns
  if (slides.length === 0) {
    console.log('[DataCamp Summary] Trying alternative selectors...');
    
    // Try to find any container that might have transcript content
    const alternativeSelectors = [
      '[class*="transcript"] div[data-trackid]',
      '[class*="Transcript"] div[data-trackid]',
      '[role="tabpanel"] div[data-trackid="transcript-slide"]',
      '[data-cy*="transcript"] div[data-trackid]',
    ];
    
    for (const selector of alternativeSelectors) {
      slides = document.querySelectorAll(selector);
      if (slides.length > 0) {
        uiVersion = 'alternative';
        console.log(`[DataCamp Summary] Found slides with selector: ${selector}`);
        break;
      }
    }
  }
  
  if (slides.length === 0) {
    console.warn('[DataCamp Summary] No transcript slides found in any UI version');
    return [];
  }
  
  console.log(`[DataCamp Summary] Found ${slides.length} transcript slides (UI: ${uiVersion})`);
  
  const transcriptItems = [];
  let index = 0;
  
  slides.forEach((slide) => {
    // Get timestamp from time element
    // Multiple selector patterns for different UI versions
    // Format: "00:00 - 00:20" or just "00:00" -> extract "00:00"
    const timeElement = slide.querySelector('time, [class*="time"], [class*="timestamp"]');
    let timestamp = '';
    
    if (timeElement) {
      const timeText = timeElement.textContent.trim();
      // Extract start time (before the dash if present, or the whole time)
      const timeMatch = timeText.match(/^(\d{1,2}:\d{2})/);
      if (timeMatch) {
        timestamp = timeMatch[1];
      }
    }
    
    // Get text content from paragraph
    // Multiple selector patterns for different UI versions
    const textElement = slide.querySelector('p, [class*="text"], [class*="content"]');
    let text = '';
    
    if (textElement) {
      text = textElement.textContent.trim();
      // Clean up whitespace
      text = text.replace(/\s+/g, ' ').trim();
    }
    
    // Fallback: if no p element found, try to get text from slide directly
    // (excluding time and title elements)
    if (!text) {
      const slideClone = slide.cloneNode(true);
      // Remove time and title elements from clone
      slideClone.querySelectorAll('time, h1, h2, h3, h4, h5, h6').forEach(el => el.remove());
      text = slideClone.textContent.trim().replace(/\s+/g, ' ');
    }
    
    // Get slide title (optional)
    const titleElement = slide.querySelector('h1, h2, h3, h4, h5, h6');
    let title = '';
    if (titleElement) {
      title = titleElement.textContent.trim();
    }
    
    if (text) {
      transcriptItems.push({
        index: index++,
        timestamp: timestamp || formatSecondsToTimestamp(index * 30),
        title: title,
        text: title ? `[${title}] ${text}` : text,
        start: timestamp ? timestampToSeconds(timestamp) : String(index * 30)
      });
    }
  });
  
  console.log(`[DataCamp Summary] Parsed ${transcriptItems.length} transcript items`);
  
  return transcriptItems;
}

/**
 * Get formatted transcript from DataCamp DOM
 * @param {string} format - Format type: 'plain', 'markdown', or 'raw'
 * @returns {Promise<string|Array>} Transcript in requested format
 */
async function getDataCampTranscriptFromDom(format = 'plain') {
  const items = await getRawDataCampTranscriptFromDom();
  
  if (items.length === 0) {
    return format === 'raw' ? [] : '';
  }
  
  if (format === 'raw') {
    return items;
  }
  
  if (format === 'markdown') {
    return items.map(item => `**[${item.timestamp}]** ${item.text}`).join('\n\n');
  }
  
  // Plain format with timestamps
  if (format === 'plain') {
    return items.map(item => `(${item.timestamp}) ${item.text}`).join('\n\n');
  }
  
  // Text only - no timestamps
  return items.map(item => item.text).join(' ');
}

// Export to window for content scripts
if (typeof window !== 'undefined') {
  window.TranscriptUtils = {
    // Legacy API (for compatibility with youtube.js)
    getLangOptionsWithLink,
    getTranscript,
    getRawTranscript,
    getFormattedTranscript,
    
    // New simplified API for YouTube
    getTranscriptFromDom,
    isTranscriptSidebarOpen,
    
    // Udemy-specific API
    getUdemyTranscriptFromDom,
    getRawUdemyTranscriptFromDom,
    isUdemyTranscriptOpen,
    
    // Coursera-specific API
    getCourseraTranscriptFromDom,
    getRawCourseraTranscriptFromDom,
    
    // DataCamp-specific API
    getDataCampTranscriptFromDom,
    getRawDataCampTranscriptFromDom
  };
}
