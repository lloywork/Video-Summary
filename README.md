# Video Summary

A powerful Chrome Extension that generates comprehensive summaries for videos on **YouTube, Udemy, Coursera, and DataCamp** using your favorite AI models (ChatGPT, Gemini, Claude or Grok).

Extension supports multiple learning platforms, specialized prompt management, auto-fill capabilities, and enhanced transcript extraction.

## ✨ Key Features

- **Multi-Platform Support**: Works seamlessly on:
  - 📺 **YouTube**
  - 🎓 **Udemy**
  - 📘 **Coursera**
  - 📊 **DataCamp** (Supports both Classic & AI Coach UI)

- **Multiple AI Models**: Choose between **ChatGPT**, **Google Gemini**, **Claude** or **xAI Grok**.

- **📚 Prompt Library**: Create and manage multiple prompt templates. Switch between different styles (Summarization, Q&A, Translation, etc.) easily.

- **Smart Auto-Fill**: Automatically opens your chosen AI, pastes the prompt, and prepares it for submission.

- **Flexible Configuration**:
  - **Global Mode**: Use one AI model and one prompt template for everything.
  - **Per-Service Mode**: Assign different AIs and different prompt templates for different sites (e.g., Gemini with a Q&A prompt for YouTube, ChatGPT with a Summary prompt for Udemy).

- **Premium UI**: Modern, tabbed options interface running in a standalone window for a better user experience.

- **Privacy Focused**: Runs 100% locally in your browser. No external servers.

## 🚀 Installation & Development

This extension now uses a modular architecture and requires a build step.

### For Users (Fast)

1. Download the latest version from [Releases](https://github.com/lloywork/Video-Summary/releases).
2. Extract the ZIP file.
3. Open Chrome and navigate to `chrome://extensions/`.
4. Toggle **Developer mode** on.
5. Click **Load unpacked** and select the **`Video Summary Extension`** folder.

### For Developers (Build from Source)

1. Clone this repository.
2. Ensure you have [Node.js](https://nodejs.org/) installed.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Build the extension:
   ```bash
   npm run build
   ```
   (Or use `npm run dev` for automatic rebuilding during development).
5. Load the extension in Chrome from the **`Video Summary Extension`** folder.

## 🏗️ Architecture (V2)

The project has been refactored into a modular, inheritance-based system:

- **`src/core/`**: Shared classes like `BasePlatform`, `Notification`, and `AIBridge`.
- **`src/platforms/`**: Platform-specific adapters (YouTube, Udemy, etc.).
- **Webpack**: Bundles the modular components into standalone scripts for performance and reliability.

## ⚙️ Configuration

The extension features a rich settings dashboard. Right-click the extension icon and select **Options** (or just click the extension icon) to open it.

### 🛠️ Configuration Tab

- **AI Configuration Mode**: Switch between **Global** or **Custom (Per-Service)** modes.
- **Per-Service Mapping**: Fine-tune which AI model and which prompt template to use for each platform.
- **Gemini URL**: If using Gemini, you can specify your account index (e.g., `/u/1/app`).
- **General Settings**:
  - **Theme**: Light, Dark, or Auto (System).
  - **Copy Format**: Markdown (bold timestamps) or Plain Text.
  - **Show Button**: Toggle the visibility of the summary button inside video players.
  - **Auto-Fill**: Toggle the automatic submission of prompts to AI chats.

### 📚 Prompt Library Tab

Create your own templates using dynamic variables.

- **Dynamic Variables**:
  - `{{Title}}` - The video title.
  - `{{URL}}` - The video link.
  - `{{Transcript}}` - The extracted video transcript.

- **Editor Features**:
  - Create, Duplicate, and Delete prompts.
  - Test different styles (e.g., "Deep Technical Summary", "5-Year Old Explanation").
  - Quick-insert buttons for variables.

---

**Developed for Advanced Agentic Coding by Google DeepMind team.**
