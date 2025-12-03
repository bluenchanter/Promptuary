# Promptuary

Promptuary is a context-aware prompt library and execution engine designed to streamline your workflow with AI tools. It allows you to store, organize, and quickly execute prompts directly from your browser.

## Features

### 1. Context-Aware Prompt Execution
Promptuary can dynamically insert context from your active browser tab into your prompts.
*   **{{selection}}**: Automatically replaced with the text you have currently selected on the page.
*   **{{url}}**: Automatically replaced with the current page's URL.

### 2. Smart Command Palette
Access your library through a sleek, keyboard-centric command palette.
*   **Search**: Instantly filter your prompts by title.
*   **Quick Copy**: Clicking a prompt parses the variables and copies the result to your clipboard, ready to paste into ChatGPT, Claude, or Gemini.

### 3. Prompt Management
*   **Create**: Easily add new prompts with a dedicated editor.
*   **Edit**: Modify existing prompts to refine your workflows.
*   **Delete**: Remove prompts you no longer need.
*   **Drafts**: Right-click any text on a webpage and select "Save selection as New Prompt" to start a new draft instantly.

### 4. GitHub Import
*   **Awesome Prompts**: Import popular prompts directly from the "Awesome ChatGPT Prompts" repository with a single click.

### 5. Premium Dark Mode Interface
*   Designed with a modern, glassmorphic aesthetic.
*   Features smooth animations and a refined color palette for a comfortable user experience.

## Installation

1.  Clone or download this repository.
2.  Open Chrome and navigate to `chrome://extensions`.
3.  Enable "Developer mode" in the top right corner.
4.  Click "Load unpacked" and select the project directory.

## Usage

1.  **Open the Extension**: Click the Promptuary icon in your browser toolbar or use the keyboard shortcut (if configured).
2.  **Select a Prompt**: Type to search and click to copy.
3.  **Create Custom Prompts**: Click "Create New Prompt" to build your own. Use the variable chips to insert dynamic placeholders.
4.  **Context Menu**: Right-click selected text on any page -> Promptuary -> Save selection as New Prompt.

## Privacy

Promptuary stores all your prompts locally in your browser (`chrome.storage.local`). No data is sent to external servers unless you explicitly use the Import feature to fetch public prompts from GitHub.
