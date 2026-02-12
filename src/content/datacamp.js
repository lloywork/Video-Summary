// DataCamp Video Player Control Bar Integration
// Injects a summary button into the DataCamp video player controls

(async function () {
  "use strict";

  // Constants
  const BUTTON_ID = "datacamp_ai_summary_btn";

  // Selectors - DataCamp specific (video.js based player)
  const SELECTORS = {
    // Control bar (where we inject the button)
    controlBar: ".vjs-control-bar",
    
    // Play/Pause button
    playControl: ".vjs-play-control",
    
    // Download button (insert BEFORE this - to the LEFT)
    downloadControl: ".vjs-download-control",
    
    // Playback rate button (fallback insert point)
    playbackRate: ".vjs-playback-rate",
    
    // Video element
    videoElement: "video",
    
    // Transcript button (OLD UI)
    transcriptButton: 'button[data-testid="dynamic-transcript-button"]',
    
    // Transcript panel (OLD UI)
    transcriptPanel: ".side-panel-container-dynamic-transcript",
    
    // Transcript slides
    transcriptSlide: 'div[data-trackid="transcript-slide"]',
    
    // Timestamp element
    timestampElement: "time",
    
    // Text content element
    textElement: "p",
    
    // NEW AI Coach UI selectors
    aiCoachToggle: '[data-waffles-component="toggle-button"]',
    transcriptTabButton: 'button[aria-label="Transcript"]',
    aiCoachTabButton: 'button[aria-label="AI Coach"]',
    transcriptContainer: 'div.css-107awck, div.css-1333q64',
  };

  // AI Sparkle Icon SVG - matching DataCamp's icon style
  const ICON_SVG = `
    <svg height="16" width="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
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
    console.log("[DataCamp Summary] Initializing...");

    // Check if button should be shown
    const settings = await window.StorageUtils.getSettings();
    if (!settings.showButton) {
      console.log("[DataCamp Summary] Summary button is disabled in settings");
      return;
    }

    // Initial button insertion with delay for player to load
    setTimeout(attemptButtonInsertion, 2000);

    // Re-insert button on navigation (DataCamp SPA)
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        if (isDataCampVideoPage()) {
          console.log("[DataCamp Summary] URL changed, re-inserting button...");
          setTimeout(attemptButtonInsertion, 2000);
        }
      }

      // Also check if button was removed (player re-render)
      if (isDataCampVideoPage() && !document.getElementById(BUTTON_ID)) {
        attemptButtonInsertion();
      }
    }).observe(document.body, { subtree: true, childList: true });
  }

  /**
   * Check if current page is a DataCamp VIDEO page with transcript
   * Only returns true for video exercises, not for coding/quiz exercises
   */
  function isDataCampVideoPage() {
    // Must be on a course or learn path
    const isCoursePage = window.location.pathname.includes("/courses/") ||
                         window.location.pathname.includes("/learn/");
    
    if (!isCoursePage) {
      return false;
    }
    
    // Check for indicators of a VIDEO exercise (has transcript)
    const hasTranscriptButton = document.querySelector(SELECTORS.transcriptButton) !== null;
    const hasTranscriptTab = document.querySelector(SELECTORS.transcriptTabButton) !== null;
    const hasTranscriptSlides = document.querySelectorAll(SELECTORS.transcriptSlide).length > 0;
    const hasVideoIframe = document.querySelector('iframe[src*="projector.datacamp.com"]') !== null;
    const hasVideoExerciseClass = document.querySelector(".video-exercise") !== null;
    
    // Must have at least one indicator of video/transcript content
    const isVideoPage = hasTranscriptButton || hasTranscriptTab || hasTranscriptSlides || 
                        hasVideoIframe || hasVideoExerciseClass;
    
    if (!isVideoPage) {
      console.log("[DataCamp Summary] Not a video page (no transcript indicators found)");
    }
    
    return isVideoPage;
  }

  /**
   * Attempt to insert button with retries
   * NOTE: DataCamp video player is in an iframe (projector.datacamp.com)
   * so we cannot access the control bar. Instead, we inject the button
   * next to the "Show Transcript" button on the main page.
   */
  function attemptButtonInsertion() {
    console.log("[DataCamp Summary] Attempting button insertion...");

    // Check if button already exists
    if (document.getElementById(BUTTON_ID)) {
      console.log("[DataCamp Summary] Button already exists");
      return;
    }

    // Check if we're on a video page
    if (!isDataCampVideoPage()) {
      console.log("[DataCamp Summary] Not on a video page");
      return;
    }

    // Strategy 1: NEW AI Coach UI - Insert next to "Got it!" button
    const gotItButton = document.querySelector('button[data-cy="submit-button"]');
    if (gotItButton) {
      const gotItContainer = gotItButton.closest('.css-99rcup') || gotItButton.parentNode;
      if (gotItContainer && gotItContainer.parentNode) {
        console.log("[DataCamp Summary] Found 'Got it!' button (AI Coach UI), inserting next to it...");
        const buttonWrapper = createAICoachButton();
        gotItContainer.parentNode.insertBefore(buttonWrapper, gotItContainer.nextSibling);
        console.log("[DataCamp Summary] ✅ Button inserted successfully (next to Got it! button)");
        return;
      }
    }

    // Strategy 2: Insert next to the "Show Transcript" button (OLD UI)
    const transcriptBtn = document.querySelector(SELECTORS.transcriptButton);
    if (transcriptBtn) {
      const transcriptWrapper = transcriptBtn.closest(".css-ww6sjh");
      if (transcriptWrapper && transcriptWrapper.parentNode) {
        console.log("[DataCamp Summary] Found transcript button, inserting next to it...");
        const buttonWrapper = createButtonWrapper();
        transcriptWrapper.parentNode.insertBefore(buttonWrapper, transcriptWrapper.nextSibling);
        console.log("[DataCamp Summary] ✅ Button inserted successfully (next to Transcript button)");
        return;
      }
      
      // Fallback: insert after transcript button directly
      if (transcriptBtn.parentNode) {
        console.log("[DataCamp Summary] Inserting after transcript button...");
        const button = createButton();
        transcriptBtn.parentNode.insertBefore(button, transcriptBtn.nextSibling);
        console.log("[DataCamp Summary] ✅ Button inserted successfully (after Transcript button)");
        return;
      }
    }

    // Strategy 3: Insert into the video controls area (css-f11twg)
    const controlsArea = document.querySelector(".css-f11twg");
    if (controlsArea) {
      console.log("[DataCamp Summary] Found controls area, inserting button...");
      const buttonWrapper = createButtonWrapper();
      // Insert at the beginning of the controls area
      controlsArea.insertBefore(buttonWrapper, controlsArea.firstChild);
      console.log("[DataCamp Summary] ✅ Button inserted successfully (in controls area)");
      return;
    }

    // Strategy 4: Insert into video header
    const videoHeader = document.querySelector(".video-exercise header, .video-container header");
    if (videoHeader) {
      console.log("[DataCamp Summary] Found video header, inserting button...");
      const button = createButton();
      button.style.marginLeft = "12px";
      videoHeader.querySelector("div")?.appendChild(button);
      console.log("[DataCamp Summary] ✅ Button inserted successfully (in header)");
      return;
    }

    // Strategy 5: Insert as floating button near video
    const videoContainer = document.querySelector(".video-exercise, .video-container");
    if (videoContainer) {
      console.log("[DataCamp Summary] Creating floating button...");
      const button = createFloatingButton();
      videoContainer.appendChild(button);
      console.log("[DataCamp Summary] ✅ Floating button created");
      return;
    }

    console.log("[DataCamp Summary] ❌ Could not find insertion point, retrying...");

    // Retry after delay (max 10 retries)
    if (!attemptButtonInsertion.retryCount) {
      attemptButtonInsertion.retryCount = 0;
    }
    attemptButtonInsertion.retryCount++;
    
    if (attemptButtonInsertion.retryCount < 10) {
      setTimeout(attemptButtonInsertion, 1000);
    } else {
      console.log("[DataCamp Summary] Max retries reached, giving up");
      attemptButtonInsertion.retryCount = 0;
    }
  }

  /**
   * Create a wrapper div for the button
   */
  function createButtonWrapper() {
    const wrapper = document.createElement("div");
    wrapper.className = "css-ww6sjh datacamp-ai-summary-wrapper";
    wrapper.style.cssText = "display: inline-flex; margin-left: 8px;";
    wrapper.appendChild(createButton());
    return wrapper;
  }

  /**
   * Create AI Summary button for the NEW AI Coach UI
   * Styled to match the "Got it!" button
   */
  function createAICoachButton() {
    const wrapper = document.createElement("div");
    // Use same wrapper class as "Got it!" button for consistent sizing
    wrapper.className = "css-1vr7vmn datacamp-ai-summary-wrapper";
    wrapper.style.cssText = "margin-left: 8px;";
    
    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    // Use same button class as "Got it!" button for consistent sizing
    button.className = "css-pib74g datacamp-ai-summary-btn";
    button.setAttribute("aria-label", "AI Summary");
    button.title = "AI Summary - Generate AI summary of this lesson";
    
    // Create inner structure matching "Got it!" button
    button.innerHTML = `
      <span class="css-m8cbsc" style="display: flex; align-items: center; gap: 6px;">
        <svg height="14" width="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L13.09 8.26L18 6L15.74 10.91L22 12L15.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L8.26 13.09L2 12L8.26 10.91L6 6L10.91 8.26L12 2Z"/>
        </svg>
        AI Summary
      </span>
    `;

    // Click handler
    button.addEventListener("click", handleSummaryClick);
    
    wrapper.appendChild(button);
    return wrapper;
  }

  /**
   * Create a floating button for fallback
   */
  function createFloatingButton() {
    const button = createButton();
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
      <svg height="16" width="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L13.09 8.26L18 6L15.74 10.91L22 12L15.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L8.26 13.09L2 12L8.26 10.91L6 6L10.91 8.26L12 2Z"/>
      </svg>
      <span>AI Summary</span>
    `;
    return button;
  }

  /**
   * Create the summary button element matching DataCamp's button style
   * (Similar to the "Show Transcript" button)
   */
  function createButton() {
    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    // Use DataCamp's native button classes (same as Show Transcript button)
    button.className = "css-fxdk7l datacamp-ai-summary-btn";
    button.setAttribute("data-waffles-component", "button");
    button.setAttribute("aria-label", "AI Summary");
    button.title = "AI Summary - Generate AI summary of this lesson";
    
    // Create inner structure matching DataCamp buttons
    button.innerHTML = `
      <span class="css-61bni1" style="display: flex; align-items: center; gap: 6px;">
        <svg height="16" width="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L13.09 8.26L18 6L15.74 10.91L22 12L15.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L8.26 13.09L2 12L8.26 10.91L6 6L10.91 8.26L12 2Z"/>
        </svg>
        AI Summary
      </span>
    `;

    // Click handler
    button.addEventListener("click", handleSummaryClick);

    return button;
  }

  /**
   * Pause the DataCamp video
   * NOTE: Video is inside an iframe (projector.datacamp.com), so we cannot
   * directly control it due to cross-origin restrictions.
   * We'll try to communicate via postMessage or just skip pausing.
   */
  function pauseVideo() {
    console.log("[DataCamp Summary] Attempting to pause video...");
    
    // Try to find the iframe and send a pause message
    const iframe = document.querySelector('iframe[src*="projector.datacamp.com"]');
    if (iframe && iframe.contentWindow) {
      try {
        // Try to send pause command to iframe (may not work due to cross-origin)
        iframe.contentWindow.postMessage({ action: 'pause' }, '*');
        console.log("[DataCamp Summary] Sent pause message to iframe");
      } catch (e) {
        console.log("[DataCamp Summary] Could not send message to iframe:", e);
      }
    }
    
    // Note: Due to cross-origin restrictions, we cannot directly control
    // the video inside the iframe. The video will continue playing.
    // Users can manually pause if needed.
    console.log("[DataCamp Summary] ⚠️ Video in iframe - manual pause may be needed");
    return false;
  }

  /**
   * Check if we're in the NEW AI Coach toggle UI
   */
  function isNewAICoachUI() {
    return document.querySelector(SELECTORS.aiCoachToggle) !== null;
  }

  /**
   * Check if Transcript tab is active in new AI Coach UI
   */
  function isTranscriptTabActive() {
    const transcriptBtn = document.querySelector(SELECTORS.transcriptTabButton);
    if (transcriptBtn) {
      // Check if parent li has aria-current="true"
      const parentLi = transcriptBtn.closest('li');
      return parentLi && parentLi.getAttribute('aria-current') === 'true';
    }
    return false;
  }

  /**
   * Click on Transcript tab in new AI Coach UI
   */
  async function clickTranscriptTab() {
    console.log("[DataCamp Summary] Clicking Transcript tab in new UI...");
    
    const transcriptBtn = document.querySelector(SELECTORS.transcriptTabButton);
    if (transcriptBtn) {
      transcriptBtn.click();
      await sleep(500);
      
      // Verify it's now active
      if (isTranscriptTabActive()) {
        console.log("[DataCamp Summary] ✅ Transcript tab activated");
        return true;
      }
      
      // Retry once
      transcriptBtn.click();
      await sleep(500);
      return isTranscriptTabActive();
    }
    
    console.log("[DataCamp Summary] ❌ Transcript tab button not found");
    return false;
  }

  /**
   * Check if transcript slides are visible
   */
  function hasTranscriptSlides() {
    const slides = document.querySelectorAll(SELECTORS.transcriptSlide);
    return slides.length > 0;
  }

  /**
   * Check if transcript panel is visible (OLD UI)
   */
  function isTranscriptOpen() {
    // For new AI Coach UI
    if (isNewAICoachUI()) {
      return isTranscriptTabActive() && hasTranscriptSlides();
    }
    
    // For old UI
    const panel = document.querySelector(SELECTORS.transcriptPanel);
    return panel !== null && panel.offsetHeight > 0;
  }

  /**
   * Open transcript panel if not already open
   * Handles both OLD UI and NEW AI Coach UI
   */
  async function autoOpenTranscript() {
    console.log("[DataCamp Summary] Checking transcript panel...");

    // Check if NEW AI Coach UI
    if (isNewAICoachUI()) {
      console.log("[DataCamp Summary] Detected new AI Coach UI");
      
      // Check if Transcript tab is already active
      if (isTranscriptTabActive()) {
        console.log("[DataCamp Summary] Transcript tab already active");
        // Wait a bit for slides to load
        await sleep(300);
        if (hasTranscriptSlides()) {
          console.log("[DataCamp Summary] ✅ Transcript slides found");
          return true;
        }
      }
      
      // Click on Transcript tab
      const clicked = await clickTranscriptTab();
      if (clicked) {
        // Wait for content to load
        await sleep(500);
        if (hasTranscriptSlides()) {
          console.log("[DataCamp Summary] ✅ Transcript opened in new UI");
          return true;
        }
      }
      
      console.log("[DataCamp Summary] ❌ Could not open transcript in new UI");
      return false;
    }

    // OLD UI logic
    if (isTranscriptOpen()) {
      console.log("[DataCamp Summary] Transcript already open (old UI)");
      return true;
    }

    const transcriptBtn = document.querySelector(SELECTORS.transcriptButton);
    if (transcriptBtn) {
      console.log("[DataCamp Summary] Clicking transcript button (old UI)...");
      transcriptBtn.click();

      // Wait for panel to open
      await sleep(1000);

      if (isTranscriptOpen()) {
        console.log("[DataCamp Summary] ✅ Transcript opened successfully (old UI)");
        return true;
      }

      // Retry once
      transcriptBtn.click();
      await sleep(1500);
      return isTranscriptOpen();
    }

    console.log("[DataCamp Summary] ❌ Transcript button not found");
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
      // Show loading state
      btn.disabled = true;
      btn.classList.add("loading");
      const svgIcon = btn.querySelector("svg");
      if (svgIcon) {
        svgIcon.style.animation = "spin 1s linear infinite";
      }
      addSpinKeyframes();

      showPlayerNotification("🔄 Getting transcript...", "info");

      // Auto-open transcript if not already open
      if (!isTranscriptOpen()) {
        const opened = await autoOpenTranscript();
        if (!opened) {
          showPlayerNotification("❌ Could not open transcript", "error");
          btn.disabled = false;
          btn.classList.remove("loading");
          const svg = btn.querySelector("svg");
          if (svg) svg.style.animation = "";
          return;
        }
        // Wait for content to load
        await sleep(1000);
      }

      // Get video info
      const videoTitle = getVideoTitle();
      const videoUrl = getVideoUrl();

      // Get settings
      const settings = await window.StorageUtils.getSettings();

      // Get transcript from DOM using DataCamp-specific function
      const transcript = await window.TranscriptUtils.getDataCampTranscriptFromDom(
        settings.copyFormat
      );

      if (!transcript || transcript.trim() === "") {
        showPlayerNotification("❌ Transcript is empty or not found", "error");
        btn.disabled = false;
        btn.classList.remove("loading");
        const svg2 = btn.querySelector("svg");
        if (svg2) svg2.style.animation = "";
        return;
      }

      // Truncate if too long
      const finalTranscript = window.PromptUtils.truncateText(transcript);

      // Get prompt for DataCamp (from Prompt Library)
      const promptTemplate = await window.StorageUtils.getPromptForService('datacamp');
      
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
        shouldOpenTab = settings.serviceSettings?.datacamp?.autoSubmit ?? true;
      } else {
        // Global Mode: check global autoFillEnabled
        shouldOpenTab = settings.autoFillEnabled !== false;
      }

      if (shouldOpenTab) {
        // Save prompt and source to storage for auto-fill
        await chrome.storage.local.set({ 
          pendingPrompt: prompt,
          pendingSource: 'datacamp'
        });
        console.log("[DataCamp Summary] Saved pendingPrompt and pendingSource to storage");

        showPlayerNotification("✅ Opening AI...", "success");

        // Reset button and open AI service
        setTimeout(() => {
          openAIService(settings);
          btn.disabled = false;
          btn.classList.remove("loading");
          const svg3 = btn.querySelector("svg");
          if (svg3) svg3.style.animation = "";
        }, 500);
      } else {
        // Auto-submit disabled — only copy to clipboard, do NOT open tab
        showPlayerNotification("✅ Copied! Paste (Ctrl+V) into AI chat", "success");
        btn.disabled = false;
        btn.classList.remove("loading");
        const svg3 = btn.querySelector("svg");
        if (svg3) svg3.style.animation = "";
      }
    } catch (error) {
      console.error("[DataCamp Summary] Error:", error);
      showPlayerNotification("❌ Error: " + error.message, "error");
      btn.disabled = false;
      btn.classList.remove("loading");
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
      const serviceSetting = settings.serviceSettings.datacamp;
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
    const existing = document.getElementById("datacamp-summary-player-notification");
    if (existing) existing.remove();

    // Create notification
    const notification = document.createElement("div");
    notification.id = "datacamp-summary-player-notification";
    notification.textContent = message;

    // Colors based on type (DataCamp green theme)
    const colors = {
      success: { bg: "rgba(76, 175, 80, 0.95)", text: "#fff" },
      warning: { bg: "rgba(255, 152, 0, 0.95)", text: "#fff" },
      error: { bg: "rgba(244, 67, 54, 0.95)", text: "#fff" },
      info: { bg: "rgba(3, 239, 98, 0.95)", text: "#05192d" }, // DataCamp green
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
      font-family: 'Lato', sans-serif;
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
    if (document.getElementById("datacamp-summary-notification-styles")) return;

    const style = document.createElement("style");
    style.id = "datacamp-summary-notification-styles";
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
    if (document.getElementById("datacamp-summary-spin-styles")) return;

    const style = document.createElement("style");
    style.id = "datacamp-summary-spin-styles";
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Get video/lesson title from page
   */
  function getVideoTitle() {
    // Try multiple selectors for DataCamp's title
    const selectors = [
      'h1[data-cy="exercise-title"]',
      'h1.css-1qgaovm',
      '[data-cy="lesson-title"]',
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
    return document.title.replace(" | DataCamp", "").replace(" - DataCamp", "");
  }

  /**
   * Get video URL
   */
  function getVideoUrl() {
    return window.location.href.split("?")[0];
  }
})();
