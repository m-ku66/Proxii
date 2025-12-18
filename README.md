# Proxii

An open-source, local-first AI chat application built with Electron. Proxii provides a professional desktop experience for interacting with 300+ AI models through OpenRouter's API, with an emphasis on user control, data privacy, and a polished interface.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Electron](https://img.shields.io/badge/Electron-38.0.0-47848F)
![React](https://img.shields.io/badge/React-19.1.1-61DAFB)

## 🎯 Overview

Proxii emerged from frustration with existing LLM interfaces on Windows. It's built to be the AI chat application you actually want to use—fast, local, and respectful of your data. Your conversations are saved locally to your filesystem, giving you complete control over your data without browser storage limitations.

### Key Features

#### 🤖 **Multi-Model Support**
- Access 300+ AI models through OpenRouter (OpenAI, Anthropic, Google, DeepSeek, and more)
- Dynamic model pricing with local caching
- Custom model collections tailored to your needs
- Extended thinking support (Claude, o1, Gemini reasoning modes)

#### 💬 **Professional Chat Interface**
- Real-time streaming responses with thinking token visualization
- Rich markdown rendering with syntax highlighting
- LaTeX math support (KaTeX)
- Code blocks with language detection and copy functionality
- Live markdown editor with instant formatting preview

#### 📎 **Multimodal File Support**
- Upload images, PDFs, audio, and video files
- Smart compression for optimal API payload sizes
- Multiple file attachments per message (up to 5)
- Preview thumbnails for attached files

#### ⚙️ **Advanced Features**
- **Message Management**: Resend, regenerate, edit, or delete messages
- **Stop Generation**: Abort streaming responses mid-generation
- **Context Control**: Configurable conversation history limits
- **Conversation Management**: Star favorites, rename, export to JSON
- **Auto-Save**: Every message is saved locally in real-time
- **Accessibility**: Theme customization and other features coming soon

#### 🎨 **UI/UX**
- Custom dark and light themes
- Smooth animations with Motion
- Accessible Shadcn UI components
- Collapsible sidebar navigation

## 🚀 Quick Start

### Prerequisites
- **Node.js** 16+ 
- **npm** or **yarn**
- **OpenRouter API Key** ([Get one here](https://openrouter.ai/keys))

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/proxii.git
   cd proxii
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development mode:**
   ```bash
   npm start
   ```

The application will launch with hot reloading enabled for both the main process and renderer.

### First-Time Setup

1. Launch Proxii and navigate to **Settings**
2. Add your **OpenRouter API Key**
3. Click "Load Models" to fetch available models
4. Add your preferred models to your collection
5. Start chatting!

## 📁 Project Structure

```
proxii/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # Shadcn UI components
│   │   ├── screens/        # Main app screens (Home, Chats, Settings, etc.)
│   │   ├── message/        # Message-related components
│   │   └── ...             # Other reusable components
│   ├── stores/             # Zustand state management
│   │   ├── chatStore.ts    # Chat and message state
│   │   ├── modelStore.ts   # Model management and pricing
│   │   ├── settingsStore.ts # User settings and preferences
│   │   └── uiStore.ts      # UI state (theme, navigation, modals)
│   ├── services/           # External API services
│   │   └── apiService.ts   # OpenRouter API integration
│   ├── utils/              # Utility functions
│   │   ├── fileUtils.ts    # File handling and compression
│   │   ├── modelPricing.ts # Pricing cache management
│   │   └── messageUtils.ts # Message formatting and sanitization
│   ├── types/              # TypeScript type definitions
│   ├── main.ts             # Electron main process
│   ├── preload.ts          # Preload script for IPC
│   ├── renderer.tsx        # React application entry
│   └── index.css           # Global styles and theme variables
├── forge.config.ts         # Electron Forge configuration
└── package.json            # Project metadata and dependencies
```

### Data Storage

Conversations are automatically saved to:
- **Windows**: `C:\Users\<username>\Documents\Proxii\conversations\`
- **macOS**: `~/Documents/Proxii/conversations/`
- **Linux**: `~/Documents/Proxii/conversations/`

Each conversation is stored as a JSON file with its assets in a dedicated folder.

## 🛠️ Tech Stack

### Core Technologies
- **Electron 38.0.0** - Cross-platform desktop framework
- **React 19.1.1** - UI library with modern JSX transform
- **TypeScript 5.7.2** - Type-safe development
- **Vite 7.1.5** - Fast build tool with HMR
- **TailwindCSS 3.4.17** - Utility-first CSS framework

### State & UI
- **Zustand 5.0.8** - Lightweight state management
- **Motion 12.23.12** - Animation library
- **Shadcn UI** - Accessible component library
- **ReactMarkdown** - Markdown rendering
- **KaTeX** - Math rendering
- **React Syntax Highlighter** - Code syntax highlighting

### Development Tools
- **Vitest** - Unit testing framework
- **ESLint** - Code linting
- **Electron Forge** - Build and distribution

## 💻 Available Scripts

### Development
```bash
npm start          # Start development server with hot reloading
npm run lint       # Run ESLint code analysis
```

### Testing
```bash
npm test           # Run tests in watch mode
npm run test:run   # Run tests once
npm run test:ui    # Open Vitest UI interface
```

### Production
```bash
npm run package    # Package the application for current platform
npm run make       # Create distributables (installers, etc.)
npm run publish    # Publish to configured distribution channels
```

## ⚙️ Configuration

### Theme Customization

Proxii uses CSS custom properties for theming. Edit `src/index.css` to customize colors:

```css
:root {
  --background: 0 0% 100%;           /* Main background */
  --foreground: 0 0% 3.9%;           /* Primary text */
  --muted: 0 0% 92%;                 /* Subtle backgrounds */
  --muted-foreground: 0 0% 30%;      /* Secondary text */
  --accent: 0 0% 95%;                /* Hover states */
  --border: 0 0% 80%;                /* Borders */
  /* ... more colors */
}
```

Colors use HSL format: `hue saturation% lightness%`

### Context Management

Control conversation context in Settings → Prompting:
- **Max Context Messages**: Number of messages sent to API (default: 20)
- **Messages With Images**: How many recent messages include images (default: 5)

Older messages keep text but strip images to reduce payload size.

### System Prompt

Add a global system prompt in Settings → Prompting that prepends to every conversation.

## 🎨 Features in Detail

### Extended Thinking

Proxii supports extended reasoning modes for compatible models:
- **Claude**: Extended thinking up to 10k tokens
- **OpenAI o1**: Reasoning effort levels (low, medium, high)
- **Gemini**: Reasoning tokens up to 8k

Enable in the input settings popover when using compatible models.

### File Attachments

Supported file types:
- **Images**: PNG, JPG, JPEG, GIF, WebP
- **Documents**: PDF
- **Audio**: MP3, WAV, M4A, AAC, FLAC
- **Video**: MP4, WebM, MOV

Files are automatically compressed and base64-encoded for API transmission.

### Message Actions

Every message has contextual actions:
- **User Messages**: Resend, Edit, Copy, Delete
- **AI Messages**: Regenerate, Edit, Copy, Delete
- **Streaming Messages**: Stop Generation (abort mid-response)

### Conversation Management

- **Star conversations** to mark favorites
- **Rename** conversations for better organization
- **Export to JSON** for backup or analysis
- **Multi-select delete** for bulk cleanup
- Automatic sorting by most recent update

## 🏗️ Building for Production

### Package for Current Platform
```bash
npm run package
```
Creates a packaged application in the `out/` directory.

### Create Installers
```bash
npm run make
```
Generates platform-specific installers:
- **Windows**: Squirrel installer
- **macOS**: ZIP archive
- **Linux**: .deb and .rpm packages

Configure target platforms in `forge.config.ts`.

## 🤝 Contributing

Contributions are welcome! Proxii is still in early development (v0.1.0).

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Electron Forge](https://www.electronforge.io/)
- UI components from [Shadcn UI](https://ui.shadcn.com/)
- Powered by [OpenRouter](https://openrouter.ai/)
- Inspired by the need for better desktop AI interfaces

## 📮 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/proxii/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/proxii/discussions)

---

**Note**: Proxii is a work in progress. This is version 0.1.0 with core functionality complete. Future updates will bring additional features, integrations, and improvements.