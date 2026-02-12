// Coursera Video Player Control Bar Integration
// Injects a summary button into the Coursera video player controls

(async function () {
  "use strict";

  // Constants
  const BUTTON_ID = "coursera_ai_summary_btn";

  // Selectors - Coursera specific
  const SELECTORS = {
    // Save note button (primary injection target - inject next to it)
    saveNoteButton: '#save-note-button',
    captureHighlightContainer: '.rc-CaptureHighlightButton',
    videoTitleArea: '.css-1as5hzi',
    
    // Play/Pause toggle button
    playToggle: 'button[data-testid="playToggle"]',
    
    // Video element
    videoElement: "video",
    
    // Transcript elements
    transcriptPanel: 'div[role="tabpanel"]',
    transcriptParagraph: "div.rc-Paragraph",
    timestampButton: "button.timestamp",
    phraseSpan: "span.rc-Phrase",
    phraseText: "span.css-4s48ix",
  };

  // AI Sparkle Icon SVG - matching Coursera's "Save note" icon style (16x16)
  const ICON_SVG = `
    <svg aria-hidden="true" fill="none" focusable="false" height="16" viewBox="0 0 24 24" width="16" class="css-1u8qly9">
      <path d="M12 2L13.09 8.26L18 6L15.74 10.91L22 12L15.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L8.26 13.09L2 12L8.26 10.91L6 6L10.91 8.26L12 2Z" fill="currentColor"/>
    </svg>
  `;

  // Wait for page to load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  async function init() {
    console.log("[Coursera Summary] Initializing...");

    // Check if button should be shown
    const settings = await window.StorageUtils.getSettings();
    if (!settings.showButton) {
      console.log("[Coursera Summary] Summary button is disabled in settings");
      return;
    }

    // Initial button insertion with delay for player to load
    setTimeout(attemptButtonInsertion, 2000);

    // Re-insert button on navigation (Coursera SPA)
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        if (isCourseraVideoPage()) {
          console.log("[Coursera Summary] URL changed, re-inserting button...");
          setTimeout(attemptButtonInsertion, 2000);
        }
      }

      // Also check if button was removed (player re-render)
      if (isCourseraVideoPage() && !document.getElementById(BUTTON_ID)) {
        attemptButtonInsertion();
      }
    }).observe(document.body, { subtree: true, childList: true });
  }

  /**
   * Check if current page is a Coursera video/lecture page
   */
  function isCourseraVideoPage() {
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
    console.log("[Coursera Summary] Attempting button insertion...");

    // Check if button already exists
    if (document.getElementById(BUTTON_ID)) {
      console.log("[Coursera Summary] Button already exists");
      return;
    }

    // Check if we're on a video page
    if (!isCourseraVideoPage()) {
      console.log("[Coursera Summary] Not on a video page");
      return;
    }

    // Goal: Insert the AI Summary button INSIDE the same container as "Save note"
    // so they sit side-by-side in the same inline layout.

    // Strategy 1: Find Save note button by ID, insert our button before it in its parent
    const saveNoteBtn = document.getElementById('save-note-button');
    if (saveNoteBtn && saveNoteBtn.parentNode) {
      console.log("[Coursera Summary] Found Save note button, inserting AI Summary before it (same container)...");
      const button = createButton();
      saveNoteBtn.parentNode.insertBefore(button, saveNoteBtn);
      console.log("[Coursera Summary] ✅ Button inserted successfully (inline, left of Save note)");
      return;
    }

    // Strategy 2: Find .rc-CaptureHighlightButton container and insert as first child
    const captureContainer = document.querySelector(SELECTORS.captureHighlightContainer);
    if (captureContainer) {
      console.log("[Coursera Summary] Found .rc-CaptureHighlightButton, inserting as first child...");
      const button = createButton();
      captureContainer.insertBefore(button, captureContainer.firstChild);
      console.log("[Coursera Summary] ✅ Button inserted successfully (first child of Save note container)");
      return;
    }

    // Save note button not yet rendered — retry
    console.log("[Coursera Summary] ❌ Could not find Save note button yet, retrying...");
    setTimeout(attemptButtonInsertion, 1000);
  }

  /**
   * Create the summary button element matching Coursera's "Save note" ghost button style
   */
  function createButton() {
    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    // Match Coursera's ghost button classes (same as Save note)
    button.className = "cds-131 cds-button-disableElevation cds-button-ghost css-2bhpsm";
    button.setAttribute("aria-disabled", "false");
    button.setAttribute("tabindex", "0");

    // Build inner structure to match Coursera's button pattern:
    // <span class="cds-button-label">
    //   <span class="cds-button-startIcon">SVG</span>
    //   AI Summary
    // </span>
    const labelSpan = document.createElement("span");
    labelSpan.className = "cds-button-label";

    const iconSpan = document.createElement("span");
    iconSpan.className = "cds-button-startIcon";
    iconSpan.innerHTML = ICON_SVG;

    labelSpan.appendChild(iconSpan);
    labelSpan.append("AI Summary");

    button.appendChild(labelSpan);

    // Click handler
    button.addEventListener("click", handleSummaryClick);

    return button;
  }

  /**
   * Pause the Coursera video
   */
  function pauseVideo() {
    // Method 1: Check video element state and click play button if playing
    const video = document.querySelector(SELECTORS.videoElement);
    const playButton = document.querySelector(SELECTORS.playToggle);

    if (video && !video.paused) {
      // Video is playing, try to pause it

      // Try clicking the play/pause button first (more reliable)
      if (playButton) {
        const ariaLabel = (playButton.getAttribute("aria-label") || "").toLowerCase();
        // If aria-label says "pause", video is playing
        if (ariaLabel.includes("pause") || ariaLabel.includes("tạm dừng")) {
          console.log("[Coursera Summary] ⏸️ Clicking pause button...");
          playButton.click();
          return true;
        }
      }

      // Fallback: try direct video.pause()
      try {
        video.pause();
        console.log("[Coursera Summary] ⏸️ Video paused via API");
        return true;
      } catch (e) {
        console.log("[Coursera Summary] Could not pause via API:", e);
      }
    }

    // Method 2: Check play button aria-label
    if (playButton) {
      const ariaLabel = (playButton.getAttribute("aria-label") || "").toLowerCase();
      if (ariaLabel.includes("pause") || ariaLabel.includes("tạm dừng")) {
        console.log("[Coursera Summary] ⏸️ Video detected as playing, clicking pause...");
        playButton.click();
        return true;
      }
    }

    console.log("[Coursera Summary] Video already paused or not found");
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

      showPlayerNotification("🔄 Getting transcript...", "info");

      // Get video info
      const videoTitle = getVideoTitle();
      const videoUrl = getVideoUrl();

      // Get settings
      const settings = await window.StorageUtils.getSettings();

      // Get transcript from DOM using Coursera-specific function
      const transcript = await window.TranscriptUtils.getCourseraTranscriptFromDom(
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

      // Get prompt for Coursera (from Prompt Library)
      const promptTemplate = await window.StorageUtils.getPromptForService('coursera');
      
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
        shouldOpenTab = settings.serviceSettings?.coursera?.autoSubmit ?? true;
      } else {
        // Global Mode: check global autoFillEnabled
        shouldOpenTab = settings.autoFillEnabled !== false;
      }

      if (shouldOpenTab) {
        // Save prompt and source to storage for auto-fill
        await chrome.storage.local.set({ 
          pendingPrompt: prompt,
          pendingSource: 'coursera'
        });
        console.log("[Coursera Summary] Saved pendingPrompt and pendingSource to storage");

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
      console.error("[Coursera Summary] Error:", error);
      showPlayerNotification("❌ Error: " + error.message, "error");
      btn.disabled = false;
      const svg4 = btn.querySelector("svg");
      if (svg4) svg4.style.animation = "";
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
      const serviceSetting = settings.serviceSettings.coursera;
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
    const existing = document.getElementById("coursera-summary-player-notification");
    if (existing) existing.remove();

    // Create notification
    const notification = document.createElement("div");
    notification.id = "coursera-summary-player-notification";
    notification.textContent = message;

    // Colors based on type (Coursera blue theme)
    const colors = {
      success: { bg: "rgba(76, 175, 80, 0.95)", text: "#fff" },
      warning: { bg: "rgba(255, 152, 0, 0.95)", text: "#fff" },
      error: { bg: "rgba(244, 67, 54, 0.95)", text: "#fff" },
      info: { bg: "rgba(0, 86, 210, 0.95)", text: "#fff" }, // Coursera blue
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
      font-family: 'Source Sans Pro', Arial, sans-serif;
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
    if (document.getElementById("coursera-summary-notification-styles")) return;

    const style = document.createElement("style");
    style.id = "coursera-summary-notification-styles";
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
    if (document.getElementById("coursera-summary-spin-styles")) return;

    const style = document.createElement("style");
    style.id = "coursera-summary-spin-styles";
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
    // Try multiple selectors for Coursera's title
    const selectors = [
      'h1[data-testid="item-name"]',
      'h1.cds-119',
      '[data-testid="rc-ItemName"] h1',
      'h1',
      'title'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }

    // Fallback to page title
    return document.title.replace(" | Coursera", "").replace(" - Coursera", "");
  }

  /**
   * Get video URL
   */
  function getVideoUrl() {
    return window.location.href.split("?")[0];
  }
})();
