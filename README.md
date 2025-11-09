# Electron Boilerplate

A modern, production-ready Electron template with React, TypeScript, TailwindCSS, and comprehensive development tooling.

## Features

### Core Technologies
- **Electron**: Cross-platform desktop application framework
- **React 19**: Modern React with automatic JSX transform
- **TypeScript**: Type-safe development with strict configuration
- **TailwindCSS v3**: Utility-first CSS framework with PostCSS pipeline
- **Vite**: Fast build tool with hot module replacement

### State Management & UI
- **Zustand**: Lightweight state management solution
- **Motion**: Modern animation library (formerly Framer Motion)
- **Shadcn UI**: Accessible, unstyled UI components

### Development Tools
- **Vitest**: Fast unit testing framework
- **Testing Library**: React component testing utilities
- **ESLint**: Code linting with TypeScript support
- **Electron Forge**: Build, package, and distribution tools

## Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. **Clone this repository:**
   ```bash
   git clone <repository-url>
   cd electron-boilerplate
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development:**
   ```bash
   npm start
   ```

The Electron app will launch with hot reloading enabled for both the main process and renderer.

## Project Structure

```
electron-boilerplate/
├── src/
│   ├── main.ts              # Electron main process
│   ├── preload.ts           # Preload script for security
│   ├── renderer.tsx         # React application entry
│   ├── index.css           # TailwindCSS imports
│   └── test/
│       └── setup.ts        # Test configuration
├── forge.config.ts         # Electron Forge configuration
├── vite.main.config.ts     # Vite config for main process
├── vite.preload.config.ts  # Vite config for preload script
├── vite.renderer.config.ts # Vite config for renderer process
├── vitest.config.ts        # Test configuration
├── tailwind.config.js      # TailwindCSS configuration
├── postcss.config.js       # PostCSS configuration
├── tsconfig.json          # TypeScript configuration
└── index.html             # Renderer HTML template
```

## Available Scripts

### Development
- `npm start` - Start development server with hot reloading
- `npm run lint` - Run ESLint code analysis

### Testing
- `npm test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run test:ui` - Open Vitest UI interface

### Production
- `npm run package` - Package the application for current platform
- `npm run make` - Create distributables (installers, etc.)
- `npm run publish` - Publish to configured distribution channels

## Development Workflow

### Adding New Dependencies

For renderer process (React components):
```bash
npm install <package-name>
```

For main process (Node.js/Electron APIs):
```bash
npm install <package-name>
```

### Creating Components

Components should be placed in `src/components/` (create this directory as needed):

```typescript
// src/components/Button.tsx
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({ children, onClick }) => {
  return (
    <button 
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      onClick={onClick}
    >
      {children}
    </button>
  );
};
```

### State Management with Zustand

```typescript
// src/stores/appStore.ts
import { create } from 'zustand';

interface AppState {
  count: number;
  increment: () => void;
  decrement: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));
```

### Testing Components

```typescript
// src/components/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

test('button calls onClick when clicked', () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Click me</Button>);
  
  fireEvent.click(screen.getByText('Click me'));
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

## Configuration Details

### TailwindCSS
The TailwindCSS configuration is set up to scan all source files for class usage. Customize the theme in `tailwind.config.js`:

```javascript
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}", "./index.html"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#your-color',
          secondary: '#your-color',
        }
      }
    },
  },
  plugins: [],
}
```

### TypeScript
Strict TypeScript configuration is enabled. Key settings:
- `strict: true` - Enable all strict type checking
- `jsx: "react-jsx"` - Modern JSX transform
- `moduleResolution: "bundler"` - Vite-compatible module resolution

### Electron Security
The preload script provides a secure bridge between main and renderer processes. Customize in `src/preload.ts` to expose specific APIs to the renderer.

## Building for Production

### Package Application
```bash
npm run package
```
Creates a packaged application in the `out/` directory.

### Create Distributables
```bash
npm run make
```
Creates platform-specific installers and distributables.

### Platform-Specific Builds
Configure target platforms in `forge.config.ts`:

```typescript
makers: [
  new MakerSquirrel({}),           // Windows installer
  new MakerZIP({}, ['darwin']),    // macOS zip
  new MakerDeb({}),               // Linux .deb
  new MakerRpm({})                // Linux .rpm
]
```

## Using as a Template

This repository is designed to be used as a template for new Electron projects:

1. **Use GitHub template feature** (if this is a GitHub repository)
2. **Or clone and customize:**
   ```bash
   git clone <this-repo-url> my-new-app
   cd my-new-app
   rm -rf .git
   git init
   # Update package.json name, description, etc.
   npm install
   ```

3. **Customize for your project:**
   - Update `package.json` metadata
   - Modify the window title in `index.html`
   - Replace the demo content in `src/renderer.tsx`
   - Add your application logic

## Common Issues

### Vite Version Compatibility
If you encounter TailwindCSS compatibility issues, ensure Vite version matches TailwindCSS requirements. This template uses stable versions that are known to work together.

### TypeScript Errors
Make sure all `.tsx` files contain JSX and `.ts` files contain only TypeScript. The build system expects this file extension convention.

### Testing Setup
If tests fail to run, ensure `jsdom` is installed and `vitest.config.ts` is properly configured with the jsdom environment.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Tech Stack Versions

- Electron: 38.0.0
- React: 19.1.1
- TypeScript: 4.5.4
- TailwindCSS: 3.4.17
- Vite: 7.1.5
- Vitest: 3.2.4
- Zustand: 5.0.8
- Motion: 12.23.12

*This boilerplate is still being worked on and developed so some of these instructions may change or be slightly innacurate!*