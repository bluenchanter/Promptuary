chrome.runtime.onInstalled.addListener(() => {
    console.log('Promptuary installed');
    updateContextMenu();
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.prompts) {
        updateContextMenu();
    }
});

function updateContextMenu() {
    chrome.contextMenus.removeAll(() => {
        // Root Item
        chrome.contextMenus.create({
            id: "promptuary-root",
            title: "Promptuary",
            contexts: ["selection", "editable"]
        });

        // Save Selection
        chrome.contextMenus.create({
            id: "promptuary-save-selection",
            parentId: "promptuary-root",
            title: "Save selection as New Prompt",
            contexts: ["selection"]
        });

        // Paste Prompt Submenu
        chrome.contextMenus.create({
            id: "promptuary-paste-root",
            parentId: "promptuary-root",
            title: "Paste Prompt",
            contexts: ["editable"]
        });

        // Fetch prompts and add them
        chrome.storage.local.get(['prompts'], (result) => {
            const prompts = result.prompts || [];
            if (prompts.length === 0) {
                chrome.contextMenus.create({
                    id: "promptuary-no-prompts",
                    parentId: "promptuary-paste-root",
                    title: "No prompts available",
                    contexts: ["editable"],
                    enabled: false
                });
            } else {
                prompts.forEach(prompt => {
                    chrome.contextMenus.create({
                        id: `paste-prompt-${prompt.id}`,
                        parentId: "promptuary-paste-root",
                        title: prompt.title,
                        contexts: ["editable"]
                    });
                });
            }
        });
    });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "promptuary-save-selection") {
        const selection = info.selectionText;
        if (selection) {
            chrome.storage.local.set({ draft_selection: selection }, () => {
                showNotification(tab, "Selection saved to draft");
            });
        }
    } else if (info.menuItemId.startsWith("paste-prompt-")) {
        const promptId = info.menuItemId.replace("paste-prompt-", "");
        chrome.storage.local.get(['prompts'], (result) => {
            const prompts = result.prompts || [];
            const prompt = prompts.find(p => p.id === promptId);
            if (prompt) {
                // We need to parse variables here too, but for now let's just paste raw content
                // or simple parsing if possible. Since we are in background, we can't easily access DOM for selection.
                // Let's just paste the content.
                // TODO: Implement full parsing in background if needed.
                insertText(tab, prompt.content);
            }
        });
    }
});

function isRestrictedUrl(url) {
    if (!url) return true; // If we can't see the URL, assume it's restricted
    const restrictedSchemes = ['chrome:', 'edge:', 'brave:', 'about:', 'file:', 'chrome-extension:', 'moz-extension:', 'view-source:'];
    if (restrictedSchemes.some(scheme => url.startsWith(scheme))) return true;
    if (url.includes('chrome.google.com/webstore')) return true;
    if (url.includes('microsoftedge.microsoft.com/addons')) return true;
    return false;
}

function showNotification(tab, message) {
    if (!tab || !tab.id || isRestrictedUrl(tab.url)) {
        return;
    }

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (msg) => {
            const div = document.createElement('div');
            div.textContent = `Promptuary: ${msg}`;
            div.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #09090b;
                color: #fafafa;
                padding: 12px 20px;
                border-radius: 8px;
                z-index: 2147483647;
                font-family: sans-serif;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                border: 1px solid rgba(255,255,255,0.1);
                animation: promptuary-fade-in 0.3s ease-out;
                pointer-events: none;
            `;
            document.body.appendChild(div);

            if (!document.getElementById('promptuary-styles')) {
                const style = document.createElement('style');
                style.id = 'promptuary-styles';
                style.textContent = `
                    @keyframes promptuary-fade-in {
                        from { opacity: 0; transform: translateY(-10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `;
                document.head.appendChild(style);
            }

            setTimeout(() => {
                div.style.transition = "opacity 0.5s";
                div.style.opacity = "0";
                setTimeout(() => div.remove(), 500);
            }, 2000);
        },
        args: [message]
    }).catch(err => console.log("Script injection failed (likely restricted page):", err));
}

function insertText(tab, text) {
    if (!tab || !tab.id || isRestrictedUrl(tab.url)) {
        return;
    }

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (textToInsert) => {
            const activeElement = document.activeElement;
            if (activeElement) {
                if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
                    const start = activeElement.selectionStart;
                    const end = activeElement.selectionEnd;
                    const val = activeElement.value;
                    activeElement.value = val.substring(0, start) + textToInsert + val.substring(end);
                    activeElement.selectionStart = activeElement.selectionEnd = start + textToInsert.length;
                    activeElement.dispatchEvent(new Event('input', { bubbles: true }));
                } else if (activeElement.isContentEditable) {
                    // Simple content editable handling
                    document.execCommand('insertText', false, textToInsert);
                }
            }
        },
        args: [text]
    }).catch(err => console.log("Script injection failed:", err));
}
