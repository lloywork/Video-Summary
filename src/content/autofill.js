// Auto-fill script for Gemini, Grok and ChatGPT
// This script runs on AI chat pages and auto-fills the pending prompt

(async function() {
  'use strict';

  console.log('[Video Summary] Auto-fill script loaded on:', window.location.hostname);

  // Check for pending prompt and source
  const result = await chrome.storage.local.get(['pendingPrompt', 'pendingSource', 'autoFillEnabled', 'aiMode', 'serviceSettings']);
  const pendingPrompt = result.pendingPrompt;
  const pendingSource = result.pendingSource || 'youtube'; // Default to youtube for backward compat

  if (!pendingPrompt) {
    console.log('[Video Summary] No pending prompt found');
    return;
  }

  // Determine if auto-submit should happen.
  // STRICT ISOLATION: Custom mode NEVER reads global autoFillEnabled.
  let shouldAutoSubmit = true; // Default to true
  
  if (result.aiMode === 'custom') {
    // Per-Service Mode: check service-specific setting ONLY
    const serviceConfig = result.serviceSettings?.[pendingSource];
    if (serviceConfig && typeof serviceConfig.autoSubmit === 'boolean') {
      shouldAutoSubmit = serviceConfig.autoSubmit;
    } else {
      // No service config found — use hardcoded default, NOT global
      shouldAutoSubmit = true;
    }
  } else {
    // Global Mode: use global autoFillEnabled
    if (result.autoFillEnabled === false) {
      console.log('[Video Summary] Auto-fill is disabled in global settings. Prompt is in clipboard, paste manually.');
      await chrome.storage.local.remove(['pendingPrompt', 'pendingSource']);
      return;
    }
    shouldAutoSubmit = true;
  }

  console.log(`[Video Summary] Found pending prompt from "${pendingSource}", shouldAutoSubmit: ${shouldAutoSubmit}`);

  // Detect which platform we're on
  const isGemini = window.location.hostname.includes('gemini.google.com');
  const isGrok = window.location.hostname.includes('grok.com');
  const isChatGPT = window.location.hostname.includes('chatgpt.com');
  const isClaude = window.location.hostname.includes('claude.ai');

  if (isGemini) {
    await autoFillGemini(pendingPrompt, shouldAutoSubmit);
  } else if (isGrok) {
    await autoFillGrok(pendingPrompt, shouldAutoSubmit);
  } else if (isChatGPT) {
    await autoFillChatGPT(pendingPrompt, shouldAutoSubmit);
  } else if (isClaude) {
    await autoFillClaude(pendingPrompt, shouldAutoSubmit);
  }

})();

/**
 * Auto-fill prompt into Gemini
 * Gemini uses a rich text editor with contenteditable
 * @param {string} prompt - The prompt to fill
 * @param {boolean} shouldAutoSubmit - Whether to auto-submit after filling
 */
async function autoFillGemini(prompt, shouldAutoSubmit = true) {
  console.log('[Video Summary] Attempting Gemini auto-fill...');

  // Gemini selectors (may need updating if Google changes the UI)
  const selectors = [
    'div.ql-editor[contenteditable="true"]',           // Quill editor
    'div[contenteditable="true"].ql-editor',           // Alternative
    'rich-textarea div[contenteditable="true"]',       // Rich textarea component
    'div[aria-label*="prompt"]',                       // Aria label based
    'textarea[aria-label*="prompt"]',                  // Textarea fallback
    '.input-area div[contenteditable="true"]',         // Input area
    'div[role="textbox"]',                             // Role-based selector
    'p[data-placeholder]'                              // Placeholder paragraph
  ];

  const inputElement = await waitForElement(selectors, 10000);

  if (!inputElement) {
    console.error('[Video Summary] Gemini input element not found');
    showNotification('Could not auto-fill. Please paste (Ctrl+V) manually.', 'warning');
    return;
  }

  try {
    // Focus the element
    inputElement.focus();
    await sleep(100);

    // Try multiple insertion methods
    let success = false;

    // Method 1: Direct innerHTML for contenteditable
    if (inputElement.getAttribute('contenteditable') === 'true') {
      // For rich text editors, we need to properly insert HTML
      const escapedPrompt = escapeHtml(prompt);
      const formattedContent = escapedPrompt.replace(/\n/g, '<br>');
      
      // Clear existing content and insert
      inputElement.innerHTML = `<p>${formattedContent}</p>`;
      
      // Trigger input event
      inputElement.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: prompt
      }));
      
      success = true;
    }

    // Method 2: execCommand (legacy but works in some cases)
    if (!success) {
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, prompt);
      success = true;
    }

    if (success) {
      console.log('[Video Summary] Gemini auto-fill successful!');
      // Clear the pending prompt and source
      await chrome.storage.local.remove(['pendingPrompt', 'pendingSource']);
      
      // Only auto-submit if shouldAutoSubmit is true
      if (shouldAutoSubmit) {
        await sleep(500);
        const submitted = await autoSubmitGemini();
        
        if (submitted) {
          showNotification('✅ Prompt sent! AI is generating response...', 'success');
        } else {
          showNotification('✅ Prompt filled! Click send or press Enter.', 'success');
        }
      } else {
        showNotification('✅ Prompt filled! Review and click send when ready.', 'success');
      }
    }

  } catch (error) {
    console.error('[Video Summary] Gemini auto-fill error:', error);
    showNotification('Auto-fill failed. Please paste (Ctrl+V) manually.', 'warning');
  }
}

/**
 * Auto-fill prompt into Grok
 * Grok uses a textarea or contenteditable div
 * @param {string} prompt - The prompt to fill
 * @param {boolean} shouldAutoSubmit - Whether to auto-submit after filling
 */
async function autoFillGrok(prompt, shouldAutoSubmit = true) {
  console.log('[Video Summary] Attempting Grok auto-fill...');

  // Grok selectors
  const selectors = [
    'textarea[placeholder*="Ask"]',                    // Main textarea
    'textarea[placeholder*="anything"]',               // Alternative placeholder
    'textarea',                                        // Generic textarea
    'div[contenteditable="true"]',                     // Contenteditable div
    'div[role="textbox"]',                             // Role-based
    '[data-testid="chat-input"]',                      // Test ID based
    '.chat-input textarea',                            // Class-based
    'form textarea'                                    // Form textarea
  ];

  const inputElement = await waitForElement(selectors, 10000);

  if (!inputElement) {
    console.error('[Video Summary] Grok input element not found');
    showNotification('Could not auto-fill. Please paste (Ctrl+V) manually.', 'warning');
    return;
  }

  try {
    // Focus the element
    inputElement.focus();
    await sleep(100);

    // Check if it's a textarea or contenteditable
    if (inputElement.tagName === 'TEXTAREA') {
      // Direct value assignment for textarea
      inputElement.value = prompt;
      
      // Trigger events to notify React/Vue
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));
      
    } else if (inputElement.getAttribute('contenteditable') === 'true') {
      // For contenteditable
      inputElement.innerText = prompt;
      inputElement.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: prompt
      }));
    }

    console.log('[Video Summary] Grok auto-fill successful!');
    
    // Clear the pending prompt and source
    await chrome.storage.local.remove(['pendingPrompt', 'pendingSource']);
    
    // Only auto-submit if shouldAutoSubmit is true
    if (shouldAutoSubmit) {
      await sleep(500);
      const submitted = await autoSubmitGrok();
      
      if (submitted) {
        showNotification('✅ Prompt sent! AI is generating response...', 'success');
      } else {
        showNotification('✅ Prompt filled! Click send or press Enter.', 'success');
      }
    } else {
      showNotification('✅ Prompt filled! Review and click send when ready.', 'success');
    }

  } catch (error) {
    console.error('[Video Summary] Grok auto-fill error:', error);
    showNotification('Auto-fill failed. Please paste (Ctrl+V) manually.', 'warning');
  }
}

/**
 * Wait for any of the given selectors to appear
 */
function waitForElement(selectors, timeout = 10000) {
  return new Promise((resolve) => {
    // Check if element already exists
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log('[YouTube Summary] Found element with selector:', selector);
        return resolve(element);
      }
    }

    // Set up observer
    const observer = new MutationObserver(() => {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          console.log('[YouTube Summary] Found element with selector:', selector);
          observer.disconnect();
          return resolve(element);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Timeout
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

/**
 * Auto-submit prompt in Gemini by clicking the send button
 * @returns {Promise<boolean>} True if submit was successful
 */
async function autoSubmitGemini() {
  console.log('[YouTube Summary] Attempting Gemini auto-submit...');
  
  // Wait for UI to be ready
  await sleep(500);
  
  // Method 1: Find Gemini send button by mat-icon with send icon
  // Target: <mat-icon fonticon="send" data-mat-icon-name="send" class="send-button-icon">
  const matIconSelectors = [
    'mat-icon[fonticon="send"]',
    'mat-icon[data-mat-icon-name="send"]',
    'mat-icon.send-button-icon',
    '.send-button-icon'
  ];
  
  for (const selector of matIconSelectors) {
    const icon = document.querySelector(selector);
    if (icon) {
      console.log('[YouTube Summary] Found Gemini send icon:', selector);
      // Click the icon itself or its parent button
      const parentButton = icon.closest('button');
      if (parentButton) {
        console.log('[YouTube Summary] Clicking parent button of send icon');
        parentButton.click();
        return true;
      } else {
        // Click the icon directly
        icon.click();
        return true;
      }
    }
  }
  
  // Method 2: Find button containing send icon
  const allButtons = document.querySelectorAll('button');
  for (const btn of allButtons) {
    const hasMatIcon = btn.querySelector('mat-icon[fonticon="send"], mat-icon[data-mat-icon-name="send"]');
    if (hasMatIcon && !btn.disabled) {
      console.log('[YouTube Summary] Found button with mat-icon send');
      btn.click();
      return true;
    }
    
    // Check aria-label
    const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
    if ((ariaLabel.includes('send') || ariaLabel.includes('gửi')) && !btn.disabled) {
      console.log('[YouTube Summary] Found send button by aria-label:', ariaLabel);
      btn.click();
      return true;
    }
  }
  
  // Method 3: Try clicking any element with send-button class
  const sendBtnElements = document.querySelectorAll('[class*="send-button"], [class*="send_button"]');
  for (const el of sendBtnElements) {
    console.log('[YouTube Summary] Clicking send-button element');
    el.click();
    return true;
  }
  
  console.log('[YouTube Summary] Could not find Gemini send button');
  return false;
}

/**
 * Auto-submit prompt in Grok by clicking the send button
 * @returns {Promise<boolean>} True if submit was successful
 */
async function autoSubmitGrok() {
  console.log('[YouTube Summary] Attempting Grok auto-submit...');
  
  // Wait for UI to be ready
  await sleep(500);
  
  // Method 1: Find Grok send button by type="submit" and aria-label containing submit/send/gửi
  // Target: <button type="submit" aria-label="Submit">
  const submitButtons = document.querySelectorAll('button[type="submit"]');
  for (const btn of submitButtons) {
    const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
    // Check for 'submit', 'send', 'gửi', or empty aria-label
    if (ariaLabel.includes('submit') || ariaLabel.includes('gửi') || ariaLabel.includes('send') || ariaLabel === '') {
      console.log('[YouTube Summary] Found Grok submit button with aria-label:', ariaLabel || '(empty)');
      btn.click();
      return true;
    }
  }
  
  // Method 2: Find button with specific aria-label="Submit" (case-insensitive)
  const submitByAria = document.querySelector('button[aria-label="Submit"], button[aria-label="submit"]');
  if (submitByAria) {
    console.log('[YouTube Summary] Found Grok submit button by aria-label selector');
    submitByAria.click();
    return true;
  }
  
  // Method 3: Find button with arrow SVG icon (Grok's send icon has path with "M5 11L12 4...")
  const allButtons = document.querySelectorAll('button');
  for (const btn of allButtons) {
    const svg = btn.querySelector('svg');
    if (svg) {
      const path = svg.querySelector('path');
      if (path) {
        const d = path.getAttribute('d') || '';
        // Grok send button SVG path: "M5 11L12 4M12 4L19 11M12 4V21"
        if (d.includes('M5 11') || d.includes('L12 4') || d.includes('V21')) {
          console.log('[YouTube Summary] Found Grok send button by SVG arrow path');
          btn.click();
          return true;
        }
      }
    }
    
    // Check aria-label contains submit/send/gửi
    const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
    if ((ariaLabel.includes('submit') || ariaLabel.includes('gửi') || ariaLabel.includes('send')) && !btn.disabled) {
      console.log('[YouTube Summary] Found send button by aria-label:', ariaLabel);
      btn.click();
      return true;
    }
  }
  
  // Method 4: Find button with rounded-full class containing SVG and type="submit"
  const roundedButtons = document.querySelectorAll('button.rounded-full, button[class*="rounded-full"]');
  for (const btn of roundedButtons) {
    if (btn.querySelector('svg') && btn.getAttribute('type') === 'submit') {
      console.log('[YouTube Summary] Found rounded submit button with SVG');
      btn.click();
      return true;
    }
  }
  
  // Method 5: Find button inside form with SVG icon
  const forms = document.querySelectorAll('form');
  for (const form of forms) {
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn && submitBtn.querySelector('svg')) {
      console.log('[YouTube Summary] Found submit button inside form');
      submitBtn.click();
      return true;
    }
  }
  
  console.log('[YouTube Summary] Could not find Grok send button');
  return false;
}

/**
 * Auto-fill prompt into ChatGPT
 * ChatGPT uses a ProseMirror editor with contenteditable
 * @param {string} prompt - The prompt to fill
 * @param {boolean} shouldAutoSubmit - Whether to auto-submit after filling
 */
async function autoFillChatGPT(prompt, shouldAutoSubmit = true) {
  console.log('[Video Summary] Attempting ChatGPT auto-fill...');

  // ChatGPT selectors - ProseMirror based editor
  const selectors = [
    '#prompt-textarea',                                  // Main ProseMirror editor by ID
    'div[contenteditable="true"].ProseMirror',           // ProseMirror class
    'div[id="prompt-textarea"][contenteditable="true"]', // Combined selector
    'div[contenteditable="true"][data-virtualkeyboard]', // With virtual keyboard attr
    'form div[contenteditable="true"]',                  // Inside form
    'div[role="textbox"]',                               // Role-based fallback
  ];

  const inputElement = await waitForElement(selectors, 10000);

  if (!inputElement) {
    console.error('[Video Summary] ChatGPT input element not found');
    showNotification('Could not auto-fill. Please paste (Ctrl+V) manually.', 'warning');
    return;
  }

  try {
    // Focus the element
    inputElement.focus();
    await sleep(100);

    // ChatGPT uses ProseMirror - we need to set content properly
    if (inputElement.classList.contains('ProseMirror') || inputElement.id === 'prompt-textarea') {
      // Clear existing content
      inputElement.innerHTML = '';
      
      // Create a paragraph for ProseMirror
      const p = document.createElement('p');
      p.textContent = prompt;
      inputElement.appendChild(p);
      
      // Trigger input event to notify React
      inputElement.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: prompt
      }));
      
      console.log('[Video Summary] ChatGPT auto-fill successful (ProseMirror)!');
    } else if (inputElement.getAttribute('contenteditable') === 'true') {
      // Generic contenteditable fallback
      inputElement.innerText = prompt;
      inputElement.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: prompt
      }));
    }

    // Clear the pending prompt and source
    await chrome.storage.local.remove(['pendingPrompt', 'pendingSource']);
    
    // Only auto-submit if shouldAutoSubmit is true
    if (shouldAutoSubmit) {
      await sleep(500);
      const submitted = await autoSubmitChatGPT();
      
      if (submitted) {
        showNotification('✅ Prompt sent! AI is generating response...', 'success');
      } else {
        showNotification('✅ Prompt filled! Click send or press Enter.', 'success');
      }
    } else {
      showNotification('✅ Prompt filled! Review and click send when ready.', 'success');
    }

  } catch (error) {
    console.error('[Video Summary] ChatGPT auto-fill error:', error);
    showNotification('Auto-fill failed. Please paste (Ctrl+V) manually.', 'warning');
  }
}

/**
 * Auto-submit prompt in ChatGPT by clicking the send button
 * @returns {Promise<boolean>} True if submit was successful
 */
async function autoSubmitChatGPT() {
  console.log('[YouTube Summary] Attempting ChatGPT auto-submit...');
  
  // Wait for UI to be ready
  await sleep(500);
  
  // Method 1: Find by ID (most reliable)
  // Target: <button id="composer-submit-button" ...>
  const submitById = document.querySelector('#composer-submit-button');
  if (submitById && !submitById.disabled) {
    console.log('[YouTube Summary] Found ChatGPT submit button by ID');
    submitById.click();
    return true;
  }
  
  // Method 2: Find by data-testid
  // Target: <button data-testid="send-button" ...>
  const submitByTestId = document.querySelector('button[data-testid="send-button"]');
  if (submitByTestId && !submitByTestId.disabled) {
    console.log('[YouTube Summary] Found ChatGPT submit button by data-testid');
    submitByTestId.click();
    return true;
  }
  
  // Method 3: Find by aria-label
  const submitByAriaLabel = document.querySelector('button[aria-label="Send prompt"]');
  if (submitByAriaLabel && !submitByAriaLabel.disabled) {
    console.log('[YouTube Summary] Found ChatGPT submit button by aria-label');
    submitByAriaLabel.click();
    return true;
  }
  
  // Method 4: Find by class containing "composer-submit"
  const submitByClass = document.querySelector('button[class*="composer-submit"]');
  if (submitByClass && !submitByClass.disabled) {
    console.log('[YouTube Summary] Found ChatGPT submit button by class');
    submitByClass.click();
    return true;
  }
  
  // Method 5: Find button with SVG inside form
  const forms = document.querySelectorAll('form');
  for (const form of forms) {
    const buttons = form.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.querySelector('svg') && !btn.disabled) {
        const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
        if (ariaLabel.includes('send') || ariaLabel.includes('gửi') || ariaLabel.includes('submit')) {
          console.log('[YouTube Summary] Found ChatGPT submit button in form');
          btn.click();
          return true;
        }
      }
    }
  }
  
  console.log('[YouTube Summary] Could not find ChatGPT send button');
  return false;
}

/**
 * Auto-fill prompt into Claude
 * Claude uses a ProseMirror-like contenteditable div
 * @param {string} prompt - The prompt to fill
 * @param {boolean} shouldAutoSubmit - Whether to auto-submit after filling
 */
async function autoFillClaude(prompt, shouldAutoSubmit = true) {
  console.log('[Video Summary] Attempting Claude auto-fill...');

  // Claude selectors - contenteditable div with specific attributes
  const selectors = [
    'div[contenteditable="true"].ProseMirror',           // ProseMirror editor
    'div[contenteditable="true"][data-placeholder]',     // With placeholder
    'div.ProseMirror[contenteditable="true"]',           // Alternative order
    'fieldset div[contenteditable="true"]',              // Inside fieldset
    'div[role="textbox"]',                               // Role-based
    'div[contenteditable="true"]',                       // Generic fallback
  ];

  const inputElement = await waitForElement(selectors, 10000);

  if (!inputElement) {
    console.error('[Video Summary] Claude input element not found');
    showNotification('Could not auto-fill. Please paste (Ctrl+V) manually.', 'warning');
    return;
  }

  try {
    // Focus the element
    inputElement.focus();
    await sleep(100);

    // Claude uses ProseMirror - similar to ChatGPT
    if (inputElement.classList.contains('ProseMirror') || inputElement.getAttribute('contenteditable') === 'true') {
      // Clear existing content
      inputElement.innerHTML = '';
      
      // Create a paragraph for ProseMirror
      const p = document.createElement('p');
      p.textContent = prompt;
      inputElement.appendChild(p);
      
      // Trigger input event to notify React/Vue
      inputElement.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: prompt
      }));
      
      console.log('[Video Summary] Claude auto-fill successful!');
    }

    // Clear the pending prompt and source
    await chrome.storage.local.remove(['pendingPrompt', 'pendingSource']);
    
    // Only auto-submit if shouldAutoSubmit is true
    if (shouldAutoSubmit) {
      await sleep(500);
      const submitted = await autoSubmitClaude();
      
      if (submitted) {
        showNotification('✅ Prompt sent! AI is generating response...', 'success');
      } else {
        showNotification('✅ Prompt filled! Click send or press Enter.', 'success');
      }
    } else {
      showNotification('✅ Prompt filled! Review and click send when ready.', 'success');
    }

  } catch (error) {
    console.error('[Video Summary] Claude auto-fill error:', error);
    showNotification('Auto-fill failed. Please paste (Ctrl+V) manually.', 'warning');
  }
}

/**
 * Auto-submit prompt in Claude by clicking the send button
 * @returns {Promise<boolean>} True if submit was successful
 */
async function autoSubmitClaude() {
  console.log('[YouTube Summary] Attempting Claude auto-submit...');
  
  // Wait for UI to be ready
  await sleep(500);
  
  // Method 1: Find by aria-label containing "Send"
  const submitByAriaLabel = document.querySelector('button[aria-label*="Send"]');
  if (submitByAriaLabel && !submitByAriaLabel.disabled) {
    console.log('[YouTube Summary] Found Claude submit button by aria-label');
    submitByAriaLabel.click();
    return true;
  }
  
  // Method 2: Find button with specific data attributes
  const submitByDataAttr = document.querySelector('button[data-testid="send-button"]');
  if (submitByDataAttr && !submitByDataAttr.disabled) {
    console.log('[YouTube Summary] Found Claude submit button by data-testid');
    submitByDataAttr.click();
    return true;
  }
  
  // Method 3: Find button inside fieldset with SVG (Claude's send button pattern)
  const fieldsetButtons = document.querySelectorAll('fieldset button');
  for (const btn of fieldsetButtons) {
    if (btn.querySelector('svg') && !btn.disabled) {
      const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
      // Check for send-related aria-label or position (usually last button)
      if (ariaLabel.includes('send') || ariaLabel.includes('gửi') || ariaLabel === '') {
        console.log('[YouTube Summary] Found Claude submit button in fieldset');
        btn.click();
        return true;
      }
    }
  }
  
  // Method 4: Find any button with SVG that looks like a send button
  const allButtons = document.querySelectorAll('button');
  for (const btn of allButtons) {
    const svg = btn.querySelector('svg');
    if (svg && !btn.disabled) {
      const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
      if (ariaLabel.includes('send') || ariaLabel.includes('gửi')) {
        console.log('[YouTube Summary] Found send button by aria-label:', ariaLabel);
        btn.click();
        return true;
      }
    }
  }
  
  console.log('[YouTube Summary] Could not find Claude send button');
  return false;
}

/**
 * Escape HTML entities
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Show a notification toast
 */
function showNotification(message, type = 'info') {
  // Remove existing notification
  const existing = document.getElementById('yt-summary-notification');
  if (existing) existing.remove();

  // Create notification element
  const notification = document.createElement('div');
  notification.id = 'yt-summary-notification';
  notification.innerHTML = message;
  
  // Styles
  const colors = {
    success: { bg: '#0d3a1a', border: '#4caf50', text: '#4caf50' },
    warning: { bg: '#3a2d0d', border: '#ff9800', text: '#ff9800' },
    info: { bg: '#1a3a52', border: '#3ea6ff', text: '#3ea6ff' }
  };
  
  const color = colors[type] || colors.info;
  
  Object.assign(notification.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    padding: '12px 20px',
    borderRadius: '8px',
    background: color.bg,
    color: color.text,
    border: `2px solid ${color.border}`,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '14px',
    fontWeight: '500',
    zIndex: '999999',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    animation: 'slideIn 0.3s ease'
  });

  // Add animation styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(notification);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}
