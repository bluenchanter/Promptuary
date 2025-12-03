# Promptuary

**Promptuary** is a sophisticated, context-aware prompt library and execution engine designed as a Chrome Extension. It helps you manage, organize, and execute AI prompts efficiently, directly from your browser.

## Features

*   **Context-Awareness**: Automatically detects the current website domain and prioritizes prompts relevant to that context (e.g., showing LinkedIn-specific prompts when on linkedin.com).
*   **Dynamic Variables**: Supports magic variables in prompts:
    *   `{{selection}}`: Replaced with the currently selected text on the active tab.
    *   `{{url}}`: Replaced with the current page URL.
    *   `{{clipboard}}`: (Planned) Replaced with clipboard content.
*   **Command Palette Interface**: Fast, keyboard-first navigation using a command palette style interface (powered by `cmdk`).
*   **GitHub Import**: Easily import popular prompts from the "Awesome ChatGPT Prompts" repository directly into your library.
*   **Local & Sync Storage**: Persists your prompts using Chrome's storage API for synchronization across devices (or local storage for development).
*   **Custom Prompts**: Create and manage your own custom prompts with tags and target domains.

## Tech Stack

*   **Frontend**: React 19, TypeScript
*   **Build Tool**: Vite
*   **Extension Framework**: CRXJS (Vite Plugin for Chrome Extensions)
*   **Manifest Version**: 3 (fully compliant with Chrome Web Store standards)
*   **Styling**: TailwindCSS 4
*   **State Management**: Zustand
*   **UI Components**: CMDK (Command Palette), Lucide React (Icons)

## Installation & Development

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd Promptuary
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run in development mode**
    ```bash
    npm run dev
    ```
    This will start the Vite dev server.

4.  **Build for production**
    ```bash
    npm run build
    ```
    This creates a `dist` folder containing the unpacked extension.

5.  **Load into Chrome**
    *   Open Chrome and navigate to `chrome://extensions/`.
    *   Enable **Developer mode** (top right toggle).
    *   Click **Load unpacked**.
    *   Select the `dist` folder generated in the previous step.

## Usage

1.  **Open the Extension**: Click the Promptuary icon in your browser toolbar (or use a keyboard shortcut if configured).
2.  **Search/Select**: Type to search for a prompt or browse the list.
    *   **Context Prompts**: Prompts relevant to the current site appear at the top.
    *   **General Prompts**: Other prompts appear below.
3.  **Execute**: Click a prompt (or press Enter).
    *   If the prompt contains `{{selection}}`, make sure you have text selected on the page first.
    *   The processed prompt is automatically copied to your clipboard.
4.  **Import**: Use the "Import GitHub Prompts" action to browse and add prompts from the community.
5.  **Create**: Use the "Create New Prompt" action to add your own custom templates.

## Project Structure

*   `src/background.ts`: Service worker for the extension.
*   `src/content.ts`: Content script for interacting with web pages.
*   `src/components/`: React components (e.g., `CommandPalette`).
*   `src/store/`: Zustand state management (`usePromptStore`).
*   `src/lib/`: Utility libraries (`PromptEngine`, `StorageService`, `GitHubService`).
*   `src/hooks/`: Custom React hooks (`useDomainDetector`).
*   `manifest.json`: Chrome Extension manifest configuration.
*   `public/icons/`: Extension icons (16x16, 48x48, 128x128 PNG files).

## Chrome Compatibility

This extension is fully compliant with Chrome Manifest V3 standards and includes:

*   ✅ Proper extension icons (16x16, 48x48, 128x128)
*   ✅ Manifest V3 service worker implementation
*   ✅ Minimal and appropriate permissions (storage, activeTab, scripting)
*   ✅ Content Security Policy compliant (no inline scripts or eval)
*   ✅ Async/await pattern for all Chrome APIs
*   ✅ Proper error handling for restricted URLs (chrome://, edge://, etc.)
*   ✅ Clipboard API using standard navigator.clipboard.writeText()

The extension has been tested and built to meet all Chrome Web Store requirements.

## License

[MIT](LICENSE)
