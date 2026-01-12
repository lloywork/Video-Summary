# Video Summary
A powerful Chrome Extension that generates comprehensive summaries for videos on **YouTube, Udemy, Coursera, and DataCamp** using your favorite AI models (ChatGPT, Gemini, or Grok).

Extension supports multiple learning platforms, per-site AI configuration, auto-fill capabilities, and enhanced transcript extraction.

## ✨ Key Features
* **Multi-Platform Support**: Works seamlessly on:
    * 📺 **YouTube**
    * 🎓 **Udemy**
    * 📘 **Coursera**
    * 📊 **DataCamp** (Supports both Classic & AI Coach UI)

* **Multiple AI Models**: Choose between **ChatGPT**, **Google Gemini**, or **xAI Grok**.

* **Smart Auto-Fill**: Automatically opens your chosen AI, pastes the prompt, and prepares it for submission.

* **Flexible Configuration**:
    * **Global Mode**: Use one AI model for everything.
    * **Per-Service Mode**: Assign different AIs for different sites (e.g., Gemini for YouTube, ChatGPT for Udemy).

* **Custom Prompts**: Fully customizable prompt templates with variables.

* **Privacy Focused**: Runs 100% locally in your browser. No external servers.

## 🚀 Installation
Since this is a personal developer extension, you need to load it manually:

1.  Download or clone this repository to your computer.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Toggle **Developer mode** on (top right corner).
4.  Click **Load unpacked**.
5.  Select the folder containing this extension.

## ⚙️ Configuration
Right-click the extension icon and select **Options** to configure:

* **AI Models**: Switch between Global or Custom (Per-Service) modes.

* **Gemini URL**: If using Gemini, you can specify your account index (e.g., `/u/1/app`).

* **Theme**: Light, Dark, or Auto (System).

* **Copy Format**: Choose between Markdown (bold timestamps) or Plain Text.

* **Show Button**: Toggle the visibility of the summary button inside video players.

### Custom Prompt Template
You can customize how the extension talks to the AI using these variables:
* `{{Title}}` - The video title.
* `{{URL}}` - The video link.
* `{{Transcript}}` - The extracted video transcript.

**Recommend Prompt:**
```text

# Task Instructions: Please follow these steps to process the provided content:

## Step 1: Role Selection

Based on the title and transcript, select the most appropriate expert role (e.g., Economist, Tech Specialist, Financial Editor, etc.) to conduct this summary. Begin your response by stating: "As a [Role Name], I will summarize this content..."

## Step 2: Web Search for Additional Context

- Perform an online search to find in-depth information, highlights, or community discussions related to this topic from reputable knowledge-sharing platforms.

- Only incorporate search findings if they directly clarify or add practical value to the core content.

- Constraint: Do not use exact match search keywords (do not wrap keywords in quotation marks).

## Step 3: Summarization

Summarize the content into key bullet points:

- Determine the number of bullet points based on the depth and length of the provided content.

- Mandatory: Every bullet point must include its corresponding timestamp from the transcript (Format: [MM:SS]).

- If information from the web search is used, provide the specific source URL immediately following that point.



# Input

```

Title: {{Title}}

URL: {{URL}}

Transcript:

{{Transcript}}

```
