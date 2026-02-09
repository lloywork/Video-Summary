// Options page script - Advanced Prompt Management

// ========================================
// DEFAULT SETTINGS (Synced with storage.js)
// ========================================
const DEFAULT_PROMPT_CONTENT = `Please summarize the following video:

Title: {{Title}}
URL: {{URL}}

Transcript:
{{Transcript}}

Provide a concise summary with key points.`;

const DEFAULT_SETTINGS = {
  aiMode: 'global',
  selectedModel: 'chatgpt',
  serviceSettings: {
    youtube: { model: 'chatgpt', promptId: 'default', autoSubmit: true },
    udemy: { model: 'chatgpt', promptId: 'default', autoSubmit: true },
    coursera: { model: 'chatgpt', promptId: 'default', autoSubmit: true },
    datacamp: { model: 'chatgpt', promptId: 'default', autoSubmit: true }
  },
  prompts: [
    {
      id: 'default',
      name: 'Default Summary',
      description: 'Standard summary template',
      content: DEFAULT_PROMPT_CONTENT
    }
  ],
  geminiUrl: 'https://gemini.google.com/app',
  theme: 'auto',
  copyFormat: 'markdown',
  showButton: true,
  autoFillEnabled: true
};

// ========================================
// STATE
// ========================================
let currentSettings = null;
let selectedPromptId = null;

// ========================================
// DOM ELEMENTS
// ========================================
let form, saveBtn, saveStatus;
let globalModeSection, customModeSection;
let selectedModelSelect, globalPromptSelect, geminiUrlGroup, themeSelect;
let youtubeModelSelect, udemyModelSelect, courseraModelSelect, datacampModelSelect;
let youtubePromptSelect, udemyPromptSelect, courseraPromptSelect, datacampPromptSelect;

// Library elements
let promptList, editorPlaceholder, editorForm;
let promptNameInput, promptDescInput, promptContentInput;
let newPromptBtn, savePromptBtn, duplicatePromptBtn, deletePromptBtn;
let promptSaveStatus;

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', init);

async function init() {
  // Get DOM elements - Configuration Tab
  form = document.getElementById('settingsForm');
  saveBtn = document.getElementById('saveBtn');
  saveStatus = document.getElementById('saveStatus');
  
  globalModeSection = document.getElementById('globalModeSection');
  customModeSection = document.getElementById('customModeSection');
  
  selectedModelSelect = document.getElementById('selectedModel');
  globalPromptSelect = document.getElementById('globalPrompt');
  geminiUrlGroup = document.getElementById('geminiUrlGroup');
  themeSelect = document.getElementById('theme');
  
  youtubeModelSelect = document.getElementById('youtubeModel');
  udemyModelSelect = document.getElementById('udemyModel');
  courseraModelSelect = document.getElementById('courseraModel');
  datacampModelSelect = document.getElementById('datacampModel');
  
  youtubePromptSelect = document.getElementById('youtubePrompt');
  udemyPromptSelect = document.getElementById('udemyPrompt');
  courseraPromptSelect = document.getElementById('courseraPrompt');
  datacampPromptSelect = document.getElementById('datacampPrompt');

  // Get DOM elements - Library Tab
  promptList = document.getElementById('promptList');
  editorPlaceholder = document.getElementById('editorPlaceholder');
  editorForm = document.getElementById('editorForm');
  
  promptNameInput = document.getElementById('promptName');
  promptDescInput = document.getElementById('promptDescription');
  promptContentInput = document.getElementById('promptContent');
  
  newPromptBtn = document.getElementById('newPromptBtn');
  savePromptBtn = document.getElementById('savePromptBtn');
  duplicatePromptBtn = document.getElementById('duplicatePromptBtn');
  deletePromptBtn = document.getElementById('deletePromptBtn');
  promptSaveStatus = document.getElementById('promptSaveStatus');

  // Load settings
  await loadSettings();

  // Setup event listeners
  setupTabNavigation();
  setupConfigurationEvents();
  setupLibraryEvents();

  // Initial UI updates
  updateModeUI();
  updateGeminiUrlVisibility();
  applyTheme(themeSelect.value);
  renderPromptList();
  populatePromptSelects();

  console.log('[Options] Initialized with settings:', currentSettings);
}

// ========================================
// SETTINGS LOADING
// ========================================
async function loadSettings() {
  try {
    currentSettings = await chrome.storage.local.get(null);
    
    // Merge with defaults if missing fields
    currentSettings = { ...DEFAULT_SETTINGS, ...currentSettings };
    
    // Ensure prompts array exists
    if (!currentSettings.prompts || currentSettings.prompts.length === 0) {
      currentSettings.prompts = DEFAULT_SETTINGS.prompts;
    }

    // Populate Configuration Tab
    populateConfigurationForm();
    
  } catch (error) {
    console.error('Error loading settings:', error);
    currentSettings = { ...DEFAULT_SETTINGS };
  }
}

function populateConfigurationForm() {
  // AI Mode
  const aiModeRadio = document.querySelector(`input[name="aiMode"][value="${currentSettings.aiMode || 'global'}"]`);
  if (aiModeRadio) aiModeRadio.checked = true;

  // Global model
  selectedModelSelect.value = currentSettings.selectedModel || 'chatgpt';
  document.getElementById('geminiUrl').value = currentSettings.geminiUrl || '';
  themeSelect.value = currentSettings.theme || 'auto';

  // Per-service settings (new format: { model, promptId, autoSubmit })
  const services = ['youtube', 'udemy', 'coursera', 'datacamp'];
  services.forEach(service => {
    const setting = currentSettings.serviceSettings?.[service];
    const modelSelect = document.getElementById(`${service}Model`);
    const autoSubmitCheckbox = document.getElementById(`${service}AutoSubmit`);
    
    if (modelSelect) {
      // Handle both old format (string) and new format (object)
      const model = (typeof setting === 'string') ? setting : (setting?.model || 'chatgpt');
      modelSelect.value = model;
    }
    
    if (autoSubmitCheckbox) {
      // Default to global autoFillEnabled if not set
      const autoSubmit = (typeof setting === 'object' && setting?.autoSubmit !== undefined) 
        ? setting.autoSubmit 
        : (currentSettings.autoFillEnabled !== false);
      autoSubmitCheckbox.checked = autoSubmit;
    }
  });

  // Copy format
  const copyFormatRadio = document.querySelector(`input[name="copyFormat"][value="${currentSettings.copyFormat}"]`);
  if (copyFormatRadio) copyFormatRadio.checked = true;

  // Checkboxes
  document.getElementById('showButton').checked = currentSettings.showButton !== false;
  document.getElementById('autoFillEnabled').checked = currentSettings.autoFillEnabled !== false;
}

// ========================================
// TAB NAVIGATION
// ========================================
function setupTabNavigation() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      
      // Update buttons
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update content
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(`tab-${tabId}`).classList.add('active');
    });
  });
}

// ========================================
// CONFIGURATION TAB EVENTS
// ========================================
function setupConfigurationEvents() {
  // AI Mode radio change
  document.querySelectorAll('input[name="aiMode"]').forEach(radio => {
    radio.addEventListener('change', () => {
      updateModeUI();
      updateGeminiUrlVisibility();
    });
  });

  // Model changes (for Gemini URL visibility)
  [selectedModelSelect, youtubeModelSelect, udemyModelSelect, courseraModelSelect, datacampModelSelect].forEach(select => {
    if (select) {
      select.addEventListener('change', updateGeminiUrlVisibility);
    }
  });

  // Theme change
  themeSelect.addEventListener('change', () => {
    applyTheme(themeSelect.value);
  });

  // Form submit
  form.addEventListener('submit', handleConfigSave);
}

function updateModeUI() {
  const selectedMode = document.querySelector('input[name="aiMode"]:checked')?.value || 'global';
  const autoFillGroup = document.getElementById('autoFillGroup');
  
  if (selectedMode === 'global') {
    globalModeSection.classList.remove('hidden');
    customModeSection.classList.add('hidden');
    // Show global auto-fill checkbox in global mode
    if (autoFillGroup) autoFillGroup.classList.remove('hidden');
  } else {
    globalModeSection.classList.add('hidden');
    customModeSection.classList.remove('hidden');
    // Hide global auto-fill checkbox in per-service mode (per-service has its own toggles)
    if (autoFillGroup) autoFillGroup.classList.add('hidden');
  }
}

function updateGeminiUrlVisibility() {
  const selectedMode = document.querySelector('input[name="aiMode"]:checked')?.value || 'global';
  let showGeminiUrl = false;
  
  if (selectedMode === 'global') {
    showGeminiUrl = selectedModelSelect.value === 'gemini';
  } else {
    showGeminiUrl = 
      youtubeModelSelect?.value === 'gemini' ||
      udemyModelSelect?.value === 'gemini' ||
      courseraModelSelect?.value === 'gemini' ||
      datacampModelSelect?.value === 'gemini';
  }
  
  if (showGeminiUrl) {
    geminiUrlGroup.classList.remove('hidden');
  } else {
    geminiUrlGroup.classList.add('hidden');
  }
}

function applyTheme(theme) {
  document.body.className = `theme-${theme}`;
}

async function handleConfigSave(e) {
  e.preventDefault();
  
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const formData = new FormData(form);
    const aiMode = formData.get('aiMode') || 'global';
    
    // Build service settings with new format (including autoSubmit)
    const services = ['youtube', 'udemy', 'coursera', 'datacamp'];
    const serviceSettings = {};
    
    services.forEach(service => {
      const model = formData.get(`${service}Model`) || 'chatgpt';
      const promptId = formData.get(`${service}Prompt`) || 'default';
      const autoSubmit = formData.get(`${service}AutoSubmit`) === 'on';
      serviceSettings[service] = { model, promptId, autoSubmit };
    });

    const settings = {
      aiMode,
      selectedModel: formData.get('selectedModel'),
      globalPromptId: formData.get('globalPrompt') || 'default',
      serviceSettings,
      prompts: currentSettings.prompts, // Preserve prompts
      geminiUrl: formData.get('geminiUrl') || DEFAULT_SETTINGS.geminiUrl,
      theme: formData.get('theme'),
      copyFormat: formData.get('copyFormat'),
      showButton: formData.get('showButton') === 'on',
      autoFillEnabled: formData.get('autoFillEnabled') === 'on'
    };

    await chrome.storage.local.set(settings);
    currentSettings = settings;
    
    showStatus(saveStatus, '✅ Settings saved!', 'success');
    
    setTimeout(() => {
      resetSaveButton();
      hideStatus(saveStatus);
    }, 2000);

  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus(saveStatus, '❌ Error saving', 'error');
    resetSaveButton();
  }
}

function resetSaveButton() {
  saveBtn.disabled = false;
  saveBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16L21 8V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M17 21V13H7V21M7 3V8H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    Save Settings
  `;
}

// ========================================
// PROMPT LIBRARY EVENTS
// ========================================
function setupLibraryEvents() {
  // New prompt button
  newPromptBtn.addEventListener('click', createNewPrompt);
  
  // Save prompt button
  savePromptBtn.addEventListener('click', saveCurrentPrompt);
  
  // Duplicate button
  duplicatePromptBtn.addEventListener('click', duplicatePrompt);
  
  // Delete button
  deletePromptBtn.addEventListener('click', deletePrompt);
  
  // Variable insert buttons
  document.querySelectorAll('.var-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const variable = btn.dataset.var;
      insertVariable(variable);
    });
  });
}

function renderPromptList() {
  promptList.innerHTML = '';
  
  currentSettings.prompts.forEach(prompt => {
    const li = document.createElement('li');
    li.className = 'prompt-list-item';
    if (prompt.id === selectedPromptId) {
      li.classList.add('active');
    }
    li.dataset.id = prompt.id;
    li.innerHTML = `
      <svg class="prompt-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      ${prompt.name}
    `;
    li.addEventListener('click', () => selectPrompt(prompt.id));
    promptList.appendChild(li);
  });
}

function selectPrompt(id) {
  selectedPromptId = id;
  const prompt = currentSettings.prompts.find(p => p.id === id);
  
  if (!prompt) return;
  
  // Update list UI
  document.querySelectorAll('.prompt-list-item').forEach(item => {
    item.classList.toggle('active', item.dataset.id === id);
  });
  
  // Show editor
  editorPlaceholder.classList.add('hidden');
  editorForm.classList.remove('hidden');
  
  // Populate editor
  promptNameInput.value = prompt.name || '';
  promptDescInput.value = prompt.description || '';
  promptContentInput.value = prompt.content || '';
}

function createNewPrompt() {
  const newId = generateId();
  const newPrompt = {
    id: newId,
    name: 'New Prompt',
    description: '',
    content: DEFAULT_PROMPT_CONTENT
  };
  
  currentSettings.prompts.push(newPrompt);
  renderPromptList();
  selectPrompt(newId);
  populatePromptSelects();
  
  // Focus on name input
  promptNameInput.focus();
  promptNameInput.select();
}

async function saveCurrentPrompt() {
  if (!selectedPromptId) return;
  
  const prompt = currentSettings.prompts.find(p => p.id === selectedPromptId);
  if (!prompt) return;
  
  // Validate
  const name = promptNameInput.value.trim();
  if (!name) {
    showStatus(promptSaveStatus, '❌ Name is required', 'error');
    return;
  }
  
  const content = promptContentInput.value.trim();
  if (!content) {
    showStatus(promptSaveStatus, '❌ Content is required', 'error');
    return;
  }
  
  // Update prompt
  prompt.name = name;
  prompt.description = promptDescInput.value.trim();
  prompt.content = content;
  
  // Save to storage
  try {
    await chrome.storage.local.set({ prompts: currentSettings.prompts });
    showStatus(promptSaveStatus, '✅ Prompt saved!', 'success');
    renderPromptList();
    populatePromptSelects();
    
    setTimeout(() => hideStatus(promptSaveStatus), 2000);
  } catch (error) {
    console.error('Error saving prompt:', error);
    showStatus(promptSaveStatus, '❌ Error saving', 'error');
  }
}

function duplicatePrompt() {
  if (!selectedPromptId) return;
  
  const original = currentSettings.prompts.find(p => p.id === selectedPromptId);
  if (!original) return;
  
  const newId = generateId();
  const duplicate = {
    id: newId,
    name: `${original.name} (Copy)`,
    description: original.description,
    content: original.content
  };
  
  currentSettings.prompts.push(duplicate);
  renderPromptList();
  selectPrompt(newId);
  populatePromptSelects();
}

async function deletePrompt() {
  if (!selectedPromptId) return;
  
  // Prevent deleting if only one prompt exists
  if (currentSettings.prompts.length <= 1) {
    showStatus(promptSaveStatus, '❌ Cannot delete the only prompt', 'error');
    setTimeout(() => hideStatus(promptSaveStatus), 2000);
    return;
  }
  
  // Confirm deletion
  const prompt = currentSettings.prompts.find(p => p.id === selectedPromptId);
  if (!confirm(`Delete "${prompt.name}"?`)) return;
  
  // Remove from array
  currentSettings.prompts = currentSettings.prompts.filter(p => p.id !== selectedPromptId);
  
  // Update any service mappings that used this prompt
  const services = ['youtube', 'udemy', 'coursera', 'datacamp'];
  services.forEach(service => {
    if (currentSettings.serviceSettings[service]?.promptId === selectedPromptId) {
      currentSettings.serviceSettings[service].promptId = 'default';
    }
  });
  
  // Save
  try {
    await chrome.storage.local.set({
      prompts: currentSettings.prompts,
      serviceSettings: currentSettings.serviceSettings
    });
    
    // Reset UI
    selectedPromptId = null;
    editorForm.classList.add('hidden');
    editorPlaceholder.classList.remove('hidden');
    renderPromptList();
    populatePromptSelects();
    
  } catch (error) {
    console.error('Error deleting prompt:', error);
    showStatus(promptSaveStatus, '❌ Error deleting', 'error');
  }
}

function insertVariable(variable) {
  const textarea = promptContentInput;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  
  textarea.value = text.substring(0, start) + variable + text.substring(end);
  textarea.focus();
  textarea.setSelectionRange(start + variable.length, start + variable.length);
}

// ========================================
// PROMPT SELECTS (For Global and Per-Service Mapping)
// ========================================
function populatePromptSelects() {
  // Populate Global Prompt Select
  if (globalPromptSelect) {
    const currentGlobalPromptId = currentSettings.globalPromptId || 'default';
    globalPromptSelect.innerHTML = '';
    
    currentSettings.prompts.forEach(prompt => {
      const option = document.createElement('option');
      option.value = prompt.id;
      option.textContent = prompt.name;
      if (prompt.id === currentGlobalPromptId) {
        option.selected = true;
      }
      globalPromptSelect.appendChild(option);
    });
  }
  
  // Populate Per-Service Prompt Selects
  const selects = [youtubePromptSelect, udemyPromptSelect, courseraPromptSelect, datacampPromptSelect];
  const services = ['youtube', 'udemy', 'coursera', 'datacamp'];
  
  selects.forEach((select, index) => {
    if (!select) return;
    
    const service = services[index];
    const currentPromptId = currentSettings.serviceSettings?.[service]?.promptId || 'default';
    
    // Clear and repopulate
    select.innerHTML = '';
    
    currentSettings.prompts.forEach(prompt => {
      const option = document.createElement('option');
      option.value = prompt.id;
      option.textContent = prompt.name;
      if (prompt.id === currentPromptId) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  });
}

// ========================================
// UTILITIES
// ========================================
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function showStatus(element, message, type) {
  element.textContent = message;
  element.className = `save-status show ${type}`;
}

function hideStatus(element) {
  element.classList.remove('show');
  setTimeout(() => {
    element.textContent = '';
    element.className = 'save-status';
  }, 300);
}
