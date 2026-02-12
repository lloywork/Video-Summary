// Udemy Video Player Control Bar Integration
// Injects a summary button into the Udemy video player controls

(async function () {
  "use strict";

  // Constants
  const BUTTON_ID = "udemy_ai_summary_btn";

  // Selectors - Udemy specific
  const SELECTORS = {
    // Control bar (where we inject the button)
    controlBar:
      '.shaka-control-bar--control-bar--gXZ1u[data-purpose="video-controls"]',
    controlBarFallback: '[data-purpose="video-controls"]',

    // Transcript toggle button
    transcriptToggle: 'button[data-purpose="transcript-toggle"]',

    // Settings button (inject before this)
    settingsButton: 'button[data-purpose="settings-button"]',

    // Fullscreen button (inject before this as fallback)
    fullscreenButton:
      '[aria-label*="Toàn màn hình"], [aria-label*="Fullscreen"], [aria-label*="full screen"]',

    // Video element
    videoElement: "video",

    // Transcript panel content (will be determined after opening)
    transcriptPanel: '[data-purpose="transcript-panel"], [class*="transcript"]',
    transcriptCues:
      '[data-purpose="transcript-cue-container"] p, [class*="transcript-cue"], [class*="cue-text"]',
  };

  // AI Sparkle Icon SVG - matching Udemy's icon style (medium size)
  const ICON_SVG = `
    <svg height="24" width="24" viewBox="0 0 24 24" fill="currentColor" class="ud-icon ud-icon-medium">
      <path d="M12 2L13.09 8.26L18 6L15.74 10.91L22 12L15.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L8.26 13.09L2 12L8.26 10.91L6 6L10.91 8.26L12 2Z"/>
    </svg>
  `;

  // Wait for page to load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  async function init() {
    console.log("[Udemy Summary] Initializing...");

    // Check if button should be shown
    const settings = await window.StorageUtils.getSettings();
    if (!settings.showButton) {
      console.log("[Udemy Summary] Summary button is disabled in settings");
      return;
    }

    // Initial button insertion with delay for player to load
    setTimeout(attemptButtonInsertion, 2000);

    // Re-insert button on navigation (Udemy SPA)
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        if (isUdemyVideoPage()) {
          console.log("[Udemy Summary] URL changed, re-inserting button...");
          setTimeout(attemptButtonInsertion, 2000);
        }
      }

      // Also check if button was removed (player re-render)
      if (isUdemyVideoPage() && !document.getElementById(BUTTON_ID)) {
        attemptButtonInsertion();
      }
    }).observe(document.body, { subtree: true, childList: true });
  }

  /**
   * Check if current page is a Udemy video/lecture page
   */
  function isUdemyVideoPage() {
    return (
      window.location.pathname.includes("/learn/") ||
      window.location.pathname.includes("/lecture/") ||
      document.querySelector("video") !== null
    );
  }

  /**
   * Attempt to insert button with retries
   */
  function attemptButtonInsertion() {
    console.log("[Udemy Summary] Attempting button insertion...");

    // Check if button already exists
    if (document.getElementById(BUTTON_ID)) {
      console.log("[Udemy Summary] Button already exists");
      return;
    }

    // Check if we're on a video page
    if (!isUdemyVideoPage()) {
      console.log("[Udemy Summary] Not on a video page");
      return;
    }

    // Find control bar
    const controlBar =
      document.querySelector(SELECTORS.controlBar) ||
      document.querySelector(SELECTORS.controlBarFallback);

    if (controlBar) {
      // Strategy 1: Insert BEFORE transcript toggle button (to the left of it)
      const transcriptBtn = controlBar.querySelector(SELECTORS.transcriptToggle);
      if (transcriptBtn) {
        const transcriptWrapper = transcriptBtn.closest(".popper-module--popper--mM5Ie");
        if (transcriptWrapper && transcriptWrapper.parentNode) {
          console.log(
            "[Udemy Summary] Found transcript button, inserting before it..."
          );
          const buttonWrapper = createButtonWrapper();
          // Insert BEFORE the transcript wrapper (to the left)
          transcriptWrapper.parentNode.insertBefore(
            buttonWrapper,
            transcriptWrapper
          );
          console.log(
            "[Udemy Summary] ✅ Button inserted successfully (before Transcript)"
          );
          return;
        }
      }

      // Strategy 2: Insert before captions/subtitles button
      const captionsBtn = controlBar.querySelector('button[data-purpose="captions-dropdown-button"]');
      if (captionsBtn) {
        const captionsWrapper = captionsBtn.closest(".popper-module--popper--mM5Ie");
        if (captionsWrapper && captionsWrapper.parentNode) {
          console.log(
            "[Udemy Summary] Found captions button, inserting before it..."
          );
          const buttonWrapper = createButtonWrapper();
          captionsWrapper.parentNode.insertBefore(buttonWrapper, captionsWrapper);
          console.log(
            "[Udemy Summary] ✅ Button inserted successfully (before Captions)"
          );
          return;
        }
      }

      // Strategy 3: Insert before settings button
      const settingsBtn = controlBar.querySelector(SELECTORS.settingsButton);
      if (settingsBtn) {
        const settingsWrapper = settingsBtn.closest(".popper-module--popper--mM5Ie");
        if (settingsWrapper && settingsWrapper.parentNode) {
          console.log(
            "[Udemy Summary] Found settings button, inserting before it..."
          );
          const buttonWrapper = createButtonWrapper();
          settingsWrapper.parentNode.insertBefore(buttonWrapper, settingsWrapper);
          console.log(
            "[Udemy Summary] ✅ Button inserted successfully (before Settings)"
          );
          return;
        }
      }

      // Strategy 4: Append to control bar
      console.log("[Udemy Summary] Appending to control bar...");
      const buttonWrapper = createButtonWrapper();
      controlBar.appendChild(buttonWrapper);
      console.log(
        "[Udemy Summary] ✅ Button inserted successfully (appended to control bar)"
      );
      return;
    }

    console.log("[Udemy Summary] ❌ Could not find control bar, retrying...");

    // Retry after delay
    setTimeout(attemptButtonInsertion, 1000);
  }

  /**
   * Create a wrapper div matching Udemy's popper structure
   */
  function createButtonWrapper() {
    const wrapper = document.createElement("div");
    wrapper.className = "popper-module--popper--mM5Ie";
    wrapper.appendChild(createButton());
    return wrapper;
  }

  /**
   * Create the summary button element matching Udemy's button style
   */
  function createButton() {
    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    // Use Udemy's button classes
    button.className =
      "ud-btn ud-btn-small ud-btn-ghost ud-btn-text-sm control-bar-dropdown--trigger--FnmP- control-bar-dropdown--trigger-dark--ZK26r control-bar-dropdown--trigger-small--ogRJ4";
    button.title = "AI Summary";
    button.setAttribute("aria-label", "AI Summary - Tóm tắt bài giảng");
    button.innerHTML = ICON_SVG;
    button.tabIndex = 0;

    // Click handler
    button.addEventListener("click", handleSummaryClick);

    return button;
  }

  /**
   * Pause the Udemy video by clicking the play/pause button
   */
  function pauseVideo() {
    // Method 1: Check video element state and click play button if playing
    const video = document.querySelector(SELECTORS.videoElement);
    const playButton = document.querySelector('button[data-purpose="play-button"]');
    
    if (video && !video.paused) {
      // Video is playing, try to pause it
      
      // Try clicking the play/pause button first (more reliable on Udemy)
      if (playButton) {
        console.log("[Udemy Summary] ⏸️ Clicking play button to pause video...");
        playButton.click();
        return true;
      }
      
      // Fallback: try direct video.pause()
      try {
        video.pause();
        console.log("[Udemy Summary] ⏸️ Video paused via API");
        return true;
      } catch (e) {
        console.log("[Udemy Summary] Could not pause via API:", e);
      }
    }
    
    // Method 2: Check play button icon - if it shows "pause" icon, video is playing
    if (playButton) {
      const svg = playButton.querySelector('svg');
      const useElement = playButton.querySelector('use');
      const ariaLabel = svg?.getAttribute('aria-label') || '';
      const iconHref = useElement?.getAttribute('xlink:href') || '';
      
      // If icon is "pause" or aria-label indicates pause, video is playing
      const isPlaying = iconHref.includes('pause') || 
                        ariaLabel.toLowerCase().includes('pause') ||
                        ariaLabel.toLowerCase().includes('tạm dừng');
      
      if (isPlaying) {
        console.log("[Udemy Summary] ⏸️ Video detected as playing, clicking pause...");
        playButton.click();
        return true;
      }
    }
    
    console.log("[Udemy Summary] Video already paused or not found");
    return false;
  }

  /**
   * Check if transcript sidebar is open
   */
  function isTranscriptOpen() {
    const transcriptBtn = document.querySelector(SELECTORS.transcriptToggle);
    if (transcriptBtn) {
      return transcriptBtn.getAttribute("aria-expanded") === "true";
    }
    return false;
  }

  /**
   * Handle summary button click
   */
  async function handleSummaryClick(e) {
    e.preventDefault();
    e.stopPropagation();

    const btn = e.currentTarget;

    // 🔴 Step 0: Pause video immediately
    pauseVideo();

    try {
      // Show loading state (spin animation on icon)
      btn.disabled = true;
      const svgIcon = btn.querySelector("svg");
      if (svgIcon) {
        svgIcon.style.animation = "spin 1s linear infinite";
      }
      addSpinKeyframes();

      // Auto-open transcript if not already open
      if (!isTranscriptOpen()) {
        showPlayerNotification("🔄 Opening transcript...", "info");

        const opened = await autoOpenTranscript();
        if (!opened) {
          showPlayerNotification("❌ Could not open transcript", "error");
          btn.disabled = false;
          const svg = btn.querySelector("svg");
          if (svg) svg.style.animation = "";
          return;
        }

        // Wait for transcript to fully load
        await sleep(1500);
      }

      // Get video info
      const videoTitle = getVideoTitle();
      const videoUrl = getVideoUrl();

      // Get settings
      const settings = await window.StorageUtils.getSettings();

      // Get transcript from DOM using Udemy-specific function
      const transcript = await window.TranscriptUtils.getUdemyTranscriptFromDom(
        settings.copyFormat
      );

      if (!transcript || transcript.trim() === "") {
        showPlayerNotification("❌ Transcript is empty or not found", "error");
        btn.disabled = false;
        const svg2 = btn.querySelector("svg");
        if (svg2) svg2.style.animation = "";
        return;
      }

      // Truncate if too long
      const finalTranscript = window.PromptUtils.truncateText(transcript);

      // Get prompt for Udemy (from Prompt Library)
      const promptTemplate = await window.StorageUtils.getPromptForService('udemy');
      
      // Generate prompt
      const prompt = window.PromptUtils.generatePrompt(promptTemplate, {
        title: videoTitle,
        url: videoUrl,
        transcript: finalTranscript,
      });

      // Copy to clipboard (backup)
      await window.ClipboardUtils.copyToClipboard(prompt);

      // Determine whether to open AI tab based on mode
      let shouldOpenTab = true;
      if (settings.aiMode === 'custom') {
        // Custom Mode: check service-specific autoSubmit ONLY
        shouldOpenTab = settings.serviceSettings?.udemy?.autoSubmit ?? true;
      } else {
        // Global Mode: check global autoFillEnabled
        shouldOpenTab = settings.autoFillEnabled !== false;
      }

      if (shouldOpenTab) {
        // Save prompt and source to storage for auto-fill
        await chrome.storage.local.set({ 
          pendingPrompt: prompt,
          pendingSource: 'udemy'
        });
        console.log("[Udemy Summary] Saved pendingPrompt and pendingSource to storage");

        showPlayerNotification("✅ Opening AI...", "success");

        // Reset button and open AI service
        setTimeout(() => {
          openAIService(settings);
          btn.disabled = false;
          const svg3 = btn.querySelector("svg");
          if (svg3) svg3.style.animation = "";
        }, 500);
      } else {
        // Auto-submit disabled — only copy to clipboard, do NOT open tab
        showPlayerNotification("✅ Copied! Paste (Ctrl+V) into AI chat", "success");
        btn.disabled = false;
        const svg3 = btn.querySelector("svg");
        if (svg3) svg3.style.animation = "";
      }
    } catch (error) {
      console.error("[Udemy Summary] Error:", error);
      showPlayerNotification("❌ Error: " + error.message, "error");
      btn.disabled = false;
      const svg4 = btn.querySelector("svg");
      if (svg4) svg4.style.animation = "";
    }
  }

  /**
   * Automatically open the transcript sidebar
   * @returns {Promise<boolean>} True if transcript was opened successfully
   */
  async function autoOpenTranscript() {
    console.log("[Udemy Summary] Auto-opening transcript...");

    try {
      const transcriptBtn = document.querySelector(SELECTORS.transcriptToggle);

      if (transcriptBtn) {
        console.log("[Udemy Summary] Found transcript button, clicking...");
        transcriptBtn.click();

        // Wait and verify transcript opened
        await sleep(1000);

        if (isTranscriptOpen()) {
          console.log("[Udemy Summary] ✅ Transcript opened successfully!");
          return true;
        }

        // Retry once
        console.log("[Udemy Summary] Transcript not detected, retrying...");
        transcriptBtn.click();
        await sleep(1500);

        return isTranscriptOpen();
      }

      console.log("[Udemy Summary] ❌ Transcript button not found");
      return false;
    } catch (error) {
      console.error("[Udemy Summary] Error opening transcript:", error);
      return false;
    }
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds to wait
   */
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Open AI service based on settings
   * Supports both global and per-service (custom) modes
   */
  function openAIService(settings) {
    let url = "";
    
    // Determine which model to use based on aiMode
    let model;
    if (settings.aiMode === 'custom' && settings.serviceSettings) {
      // New format: { model: 'chatgpt', promptId: 'xxx' }
      const serviceSetting = settings.serviceSettings.udemy;
      model = (typeof serviceSetting === 'string') ? serviceSetting : (serviceSetting?.model || 'chatgpt');
    } else {
      model = settings.selectedModel || 'chatgpt';
    }

    if (model === "chatgpt") {
      url = settings.chatgptUrl || "https://chatgpt.com/";
    } else if (model === "grok") {
      url = settings.grokUrl || "https://grok.com/";
    } else if (model === "gemini") {
      url = settings.geminiUrl || "https://gemini.google.com/app";
    } else if (model === "claude") {
      url = settings.claudeUrl || "https://claude.ai/new";
    }

    if (url) {
      window.open(url, "_blank");
    }
  }

  /**
   * Show notification near the player
   */
  function showPlayerNotification(message, type = "info") {
    // Remove existing notification
    const existing = document.getElementById(
      "udemy-summary-player-notification"
    );
    if (existing) existing.remove();

    // Create notification
    const notification = document.createElement("div");
    notification.id = "udemy-summary-player-notification";
    notification.textContent = message;

    // Colors based on type
    const colors = {
      success: { bg: "rgba(76, 175, 80, 0.95)", text: "#fff" },
      warning: { bg: "rgba(255, 152, 0, 0.95)", text: "#fff" },
      error: { bg: "rgba(244, 67, 54, 0.95)", text: "#fff" },
      info: { bg: "rgba(163, 30, 211, 0.95)", text: "#fff" }, // Udemy purple
    };

    const color = colors[type] || colors.info;

    notification.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      border-radius: 8px;
      background: ${color.bg};
      color: ${color.text};
      font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Roboto', 'Segoe UI', sans-serif;
      font-size: 14px;
      font-weight: 600;
      z-index: 999999;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      animation: fadeInUp 0.3s ease;
      pointer-events: none;
    `;

    // Add animation keyframes
    addNotificationKeyframes();

    document.body.appendChild(notification);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = "fadeOutDown 0.3s ease forwards";
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Add notification animation keyframes
   */
  function addNotificationKeyframes() {
    if (document.getElementById("udemy-summary-notification-styles")) return;

    const style = document.createElement("style");
    style.id = "udemy-summary-notification-styles";
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

  /**
   * Add spin animation keyframes
   */
  function addSpinKeyframes() {
    if (document.getElementById("udemy-summary-spin-styles")) return;

    const style = document.createElement("style");
    style.id = "udemy-summary-spin-styles";
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Get video/lecture title from page
   */
  function getVideoTitle() {
    // Try multiple selectors for Udemy's title
    const selectors = [
      '[data-purpose="course-header-title"]',
      'h1[class*="clp-lead__title"]',
      '[class*="ud-heading-xl"]',
      '[data-purpose="lead-title"]',
      "h1",
      "title",
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }

    // Fallback to page title
    return document.title.replace(" | Udemy", "").replace(" - Udemy", "");
  }

  /**
   * Get video URL
   */
  function getVideoUrl() {
    return window.location.href.split("?")[0];
  }
})();
