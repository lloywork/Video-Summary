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

## 🚀 Installation

Since this is a personal developer extension, you need to load it manually:

1.  Download or clone this repository to your computer.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Toggle **Developer mode** on (top right corner).
4.  Click **Load unpacked**.
5.  Select the folder containing this extension.

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
