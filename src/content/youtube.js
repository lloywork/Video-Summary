// YouTube Player Control Bar Integration
// Injects a summary button into the video player controls

(async function () {
  "use strict";

  // Constants
  const BUTTON_ID = "yt_ai_summary_btn";

  // Selectors - YouTube uses nested structure
  const SELECTORS = {
    // Primary targets (in order of preference)
    settingsButton: ".ytp-settings-button",
    subtitlesButton: ".ytp-subtitles-button",
    rightControlsLeft: ".ytp-right-controls-left",
    rightControls: ".ytp-right-controls",
    chromeControls: ".ytp-chrome-controls",
  };

  // AI Sparkle Icon SVG - matching YouTube's native button style (24x24)
  const ICON_SVG = `
    <svg height="24" width="24" viewBox="0 0 24 24" fill="white">
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
    console.log("[YouTube Summary] Initializing...");

    // Check if button should be shown
    const settings = await window.StorageUtils.getSettings();
    if (!settings.showButton) {
      console.log("[YouTube Summary] Summary button is disabled in settings");
      return;
    }

    // Initial button insertion with delay for player to load
    setTimeout(attemptButtonInsertion, 2000);

    // Re-insert button on navigation (YouTube SPA)
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        if (url.includes("/watch")) {
          console.log("[YouTube Summary] URL changed, re-inserting button...");
          setTimeout(attemptButtonInsertion, 2000);
        }
      }

      // Also check if button was removed (player re-render)
      if (url.includes("/watch") && !document.getElementById(BUTTON_ID)) {
        attemptButtonInsertion();
      }
    }).observe(document.body, { subtree: true, childList: true });
  }

  /**
   * Attempt to insert button with retries
   */
  function attemptButtonInsertion() {
    console.log("[YouTube Summary] Attempting button insertion...");

    // Check if button already exists
    if (document.getElementById(BUTTON_ID)) {
      console.log("[YouTube Summary] Button already exists");
      return;
    }

    // Check if we're on a video page
    const videoId = getVideoId();
    if (!videoId) {
      console.log("[YouTube Summary] Not on a video page");
      return;
    }

    // Strategy 1: Insert before Settings button (most reliable)
    const settingsBtn = document.querySelector(SELECTORS.settingsButton);
    if (settingsBtn && settingsBtn.parentNode) {
      console.log(
        "[YouTube Summary] Found settings button, inserting before it..."
      );
      const button = createButton();
      settingsBtn.parentNode.insertBefore(button, settingsBtn);
      console.log(
        "[YouTube Summary] ✅ Button inserted successfully (before Settings)"
      );
      return;
    }

    // Strategy 2: Insert before Subtitles button
    const subtitlesBtn = document.querySelector(SELECTORS.subtitlesButton);
    if (subtitlesBtn && subtitlesBtn.parentNode) {
      console.log(
        "[YouTube Summary] Found subtitles button, inserting before it..."
      );
      const button = createButton();
      subtitlesBtn.parentNode.insertBefore(button, subtitlesBtn);
      console.log(
        "[YouTube Summary] ✅ Button inserted successfully (before Subtitles)"
      );
      return;
    }

    // Strategy 3: Append to .ytp-right-controls-left
    const rightControlsLeft = document.querySelector(
      SELECTORS.rightControlsLeft
    );
    if (rightControlsLeft) {
      console.log("[YouTube Summary] Found right-controls-left, appending...");
      const button = createButton();
      rightControlsLeft.appendChild(button);
      console.log(
        "[YouTube Summary] ✅ Button inserted successfully (appended to left)"
      );
      return;
    }

    // Strategy 4: Append to .ytp-right-controls
    const rightControls = document.querySelector(SELECTORS.rightControls);
    if (rightControls) {
      console.log("[YouTube Summary] Found right-controls, prepending...");
      const button = createButton();
      rightControls.insertBefore(button, rightControls.firstChild);
      console.log(
        "[YouTube Summary] ✅ Button inserted successfully (prepended to right-controls)"
      );
      return;
    }

    console.log("[YouTube Summary] ❌ Could not find any suitable container");

    // Retry after delay
    setTimeout(attemptButtonInsertion, 1000);
  }

  /**
   * Create the summary button element
   */
  function createButton() {
    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.className = "ytp-button";
    button.title = "Summarize Video";
    button.setAttribute("aria-label", "Summarize Video");
    button.innerHTML = ICON_SVG;

    // Add custom styles - flex centering to match YouTube native buttons
    button.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.9;
      transition: opacity 0.2s ease, transform 0.2s ease;
    `;

    // Hover effects
    button.addEventListener("mouseenter", () => {
      button.style.opacity = "1";
      button.style.transform = "scale(1.1)";
    });

    button.addEventListener("mouseleave", () => {
      button.style.opacity = "0.9";
      button.style.transform = "scale(1)";
    });

    // Click handler
    button.addEventListener("click", handleSummaryClick);

    return button;
  }

  /**
   * Pause the YouTube video
   */
  function pauseVideo() {
    const video = document.querySelector("video.html5-main-video");
    if (video && !video.paused) {
      video.pause();
      console.log("[YouTube Summary] ⏸️ Video paused");
      return true;
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
      // Show loading state (spin animation on icon only)
      btn.disabled = true;
      const svgIcon = btn.querySelector("svg");
      if (svgIcon) {
        svgIcon.style.animation = "spin 1s linear infinite";
      }
      addSpinKeyframes();

      // Auto-open transcript if not already open
      if (!window.TranscriptUtils.isTranscriptSidebarOpen()) {
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
      const videoId = getVideoId();

      // Get settings
      const settings = await window.StorageUtils.getSettings();

      // Get transcript from DOM
      const langOptions = await window.TranscriptUtils.getLangOptionsWithLink(
        videoId
      );

      if (!langOptions || langOptions.length === 0) {
        showPlayerNotification("❌ Could not read transcript", "error");
        btn.disabled = false;
        const svg1 = btn.querySelector("svg");
        if (svg1) svg1.style.animation = "";
        return;
      }

      // Get formatted transcript
      const transcript = await window.TranscriptUtils.getFormattedTranscript(
        langOptions[0],
        videoId,
        settings.copyFormat
      );

      if (!transcript || transcript.trim() === "") {
        showPlayerNotification("❌ Transcript is empty", "error");
        btn.disabled = false;
        const svg2 = btn.querySelector("svg");
        if (svg2) svg2.style.animation = "";
        return;
      }

      // Truncate if too long
      const finalTranscript = window.PromptUtils.truncateText(transcript);

      // Generate prompt
      const prompt = window.PromptUtils.generatePrompt(settings.customPrompt, {
        title: videoTitle,
        url: videoUrl,
        transcript: finalTranscript,
      });

      // Copy to clipboard (backup)
      await window.ClipboardUtils.copyToClipboard(prompt);

      // Save prompt to storage for auto-fill
      await chrome.storage.local.set({ pendingPrompt: prompt });
      console.log("[YouTube Summary] Saved pendingPrompt to storage");

      showPlayerNotification("✅ Opening AI...", "success");

      // Reset button and open AI service
      setTimeout(() => {
        openAIService(settings);
        btn.disabled = false;
        const svg3 = btn.querySelector("svg");
        if (svg3) svg3.style.animation = "";
      }, 500);
    } catch (error) {
      console.error("[YouTube Summary] Error:", error);
      showPlayerNotification("❌ Error: " + error.message, "error");
      btn.disabled = false;
      const svg4 = btn.querySelector("svg");
      if (svg4) svg4.style.animation = "";
    }
  }

  /**
   * Automatically open the transcript sidebar
   * Steps: 1) Expand description, 2) Click "Show transcript" button
   * @returns {Promise<boolean>} True if transcript was opened successfully
   */
  async function autoOpenTranscript() {
    console.log("[YouTube Summary] Auto-opening transcript...");

    try {
      // Step 1: Expand description if collapsed (click "more" button)
      const moreBtn = document.querySelector(
        "#expand, tp-yt-paper-button#expand, ytd-text-inline-expander #expand"
      );
      if (moreBtn && moreBtn.offsetHeight > 0) {
        console.log(
          '[YouTube Summary] Clicking "more" button to expand description...'
        );
        moreBtn.click();
        await sleep(800);
      }

      // Step 2: Find and click "Show transcript" button (supports EN/VI)
      const transcriptBtn = findTranscriptButton();

      if (transcriptBtn) {
        console.log("[YouTube Summary] Found transcript button, clicking...");
        transcriptBtn.scrollIntoView({ behavior: "smooth", block: "center" });
        await sleep(300);
        transcriptBtn.click();

        // Wait and verify transcript opened
        await sleep(1000);

        if (window.TranscriptUtils.isTranscriptSidebarOpen()) {
          console.log("[YouTube Summary] ✅ Transcript opened successfully!");
          return true;
        }

        // Retry once
        console.log("[YouTube Summary] Transcript not detected, retrying...");
        transcriptBtn.click();
        await sleep(1500);

        return window.TranscriptUtils.isTranscriptSidebarOpen();
      }

      console.log("[YouTube Summary] ❌ Transcript button not found");
      return false;
    } catch (error) {
      console.error("[YouTube Summary] Error opening transcript:", error);
      return false;
    }
  }

  /**
   * Find the "Show transcript" button (supports multiple languages)
   * @returns {Element|null} The transcript button element
   */
  function findTranscriptButton() {
    // Method 1: Find by text content (EN/VI/other languages)
    const buttons = document.querySelectorAll("button");
    for (const btn of buttons) {
      const text = btn.textContent.toLowerCase();
      const ariaLabel = (btn.getAttribute("aria-label") || "").toLowerCase();

      if (
        text.includes("transcript") ||
        text.includes("chép lời") ||
        ariaLabel.includes("transcript") ||
        ariaLabel.includes("chép lời")
      ) {
        return btn;
      }
    }

    // Method 2: Find by specific YouTube component
    const transcriptSection = document.querySelector(
      "ytd-video-description-transcript-section-renderer"
    );
    if (transcriptSection) {
      const btn = transcriptSection.querySelector("button");
      if (btn) return btn;
    }

    return null;
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
      model = settings.serviceSettings.youtube || 'chatgpt';
    } else {
      model = settings.selectedModel || 'chatgpt';
    }

    if (model === "chatgpt") {
      url = "https://chatgpt.com/";
    } else if (model === "grok") {
      url = "https://grok.com/";
    } else if (model === "gemini") {
      url = settings.geminiUrl || "https://gemini.google.com/app";
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
    const existing = document.getElementById("yt-summary-player-notification");
    if (existing) existing.remove();

    // Create notification
    const notification = document.createElement("div");
    notification.id = "yt-summary-player-notification";
    notification.textContent = message;

    // Colors based on type
    const colors = {
      success: { bg: "rgba(76, 175, 80, 0.95)", text: "#fff" },
      warning: { bg: "rgba(255, 152, 0, 0.95)", text: "#fff" },
      error: { bg: "rgba(244, 67, 54, 0.95)", text: "#fff" },
      info: { bg: "rgba(33, 150, 243, 0.95)", text: "#fff" },
    };

    const color = colors[type] || colors.info;

    notification.style.cssText = `
      position: absolute;
      bottom: 60px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 20px;
      border-radius: 8px;
      background: ${color.bg};
      color: ${color.text};
      font-family: 'YouTube Sans', 'Roboto', sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      animation: fadeInUp 0.3s ease;
      pointer-events: none;
    `;

    // Add animation keyframes
    addNotificationKeyframes();

    // Insert into player
    const player = document.querySelector(".html5-video-player");
    if (player) {
      player.appendChild(notification);
    } else {
      document.body.appendChild(notification);
    }

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
    if (document.getElementById("yt-summary-notification-styles")) return;

    const style = document.createElement("style");
    style.id = "yt-summary-notification-styles";
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
    if (document.getElementById("yt-summary-spin-styles")) return;

    const style = document.createElement("style");
    style.id = "yt-summary-spin-styles";
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Get video ID from URL
   */
  function getVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("v");
  }

  /**
   * Get video title from page
   */
  function getVideoTitle() {
    const titleElement = document.querySelector(
      "h1.ytd-watch-metadata yt-formatted-string"
    );
    return titleElement
      ? titleElement.textContent.trim()
      : document.title.replace(" - YouTube", "");
  }

  /**
   * Get video URL
   */
  function getVideoUrl() {
    return window.location.href.split("&")[0];
  }
})();
