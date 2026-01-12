# Video Summary

A lightweight Chrome Extension for summarizing YouTube videos with AI (Grok, Gemini). No build tools required - pure Vanilla JavaScript!

## 🚀 Quick Start

### Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer Mode** (top-right toggle)
3. Click **"Load unpacked"**
4. Select this folder
5. Done! 🎉

### First Use

1. Right-click the extension icon → **Options**
2. Choose your AI model (Grok or Gemini)
3. If using Gemini, set your account URL
4. Customize your prompt template (optional)
5. Save settings

## ✨ Features

- **AI Models**: Support for Grok and Gemini
- **Smart Routing**: Auto-opens selected AI service with copied prompt
- **Flexible Formats**: Copy as Markdown or Plain Text
- **Dark Mode**: Auto, Light, or Dark theme
- **Custom Prompts**: Full control over prompt templates
- **No Dependencies**: Pure JavaScript, no build step needed

## 📝 Usage

1. Open any YouTube video with captions
2. Click the **"Transcript & Summary"** button in the sidebar
3. Wait for the prompt to be copied
4. Your AI service opens automatically
5. Paste (Ctrl+V) and get your summary!

## 🎯 Template Variables

Use these in your custom prompt:

- `{{Title}}` - Video title
- `{{URL}}` - Video URL
- `{{Transcript}}` - Full transcript

## 🛠️ Tech Stack

- Manifest V3
- Vanilla JavaScript (ES6+)
- Chrome Storage API
- Native DOMParser (no jQuery)

## 📂 Project Structure

```
├── manifest.json          # Extension config
├── icons/                # Extension icons
├── src/
│   ├── options/         # Settings page
│   │   ├── options.html
│   │   ├── options.css
│   │   └── options.js
│   ├── content/         # YouTube integration
│   │   ├── youtube.js
│   │   ├── transcript.js
│   │   ├── prompt.js
│   │   └── style.css
│   └── utils/           # Helpers
│       ├── storage.js
│       └── clipboard.js
```

## 🔒 Privacy

- **100% Local**: All processing happens in your browser
- **No Tracking**: Zero analytics or telemetry
- **No Servers**: No backend, no data collection
- **Open Source**: Review the code yourself

## 📄 License

Personal use only. Based on YouTube Summary v1.0.4.

## 🤝 Contributing

This is a personal edition. Feel free to fork and customize for your own use!

---

Made with ❤️ for personal productivity
