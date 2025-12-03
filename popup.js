// State
let prompts = [];
let currentView = 'main';

// DOM Elements
const app = document.getElementById('app');
const searchInput = document.getElementById('search-input');
const searchContainer = document.getElementById('search-container');
const headerActions = document.getElementById('header-actions');
const headerTitle = document.getElementById('header-title');
const backButton = document.getElementById('back-button');
const toast = document.getElementById('toast');

const viewMain = document.getElementById('view-main');
const viewCreate = document.getElementById('view-create');
const viewImport = document.getElementById('view-import');

const promptList = document.getElementById('prompt-list');
const importList = document.getElementById('import-list');
const importLoading = document.getElementById('import-loading');

const btnCreateView = document.getElementById('btn-create-view');
const btnImportView = document.getElementById('btn-import-view');
const btnClearAll = document.getElementById('btn-clear-all');
const btnSave = document.getElementById('btn-save');

const inputTitle = document.getElementById('prompt-title');
const inputContent = document.getElementById('prompt-content');

// --- Storage Service ---
const StorageService = {
    async getPrompts() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['prompts'], (result) => {
                resolve(result.prompts || []);
            });
        });
    },
    async savePrompts(newPrompts) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ prompts: newPrompts }, () => {
                prompts = newPrompts;
                resolve();
            });
        });
    },
    async addPrompt(prompt) {
        const current = await this.getPrompts();
        const updated = [prompt, ...current];
        await this.savePrompts(updated);
    },
    async clearPrompts() {
        await this.savePrompts([]);
    },
    async isSeeded() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['seeded'], (result) => {
                resolve(result.seeded === true);
            });
        });
    },
    async setSeeded() {
        return new Promise((resolve) => {
            chrome.storage.local.set({ seeded: true }, resolve);
        });
    }
};

// --- Prompt Engine ---
const PromptEngine = {
    async parse(content) {
        let result = content;

        // Get active tab info
        let selection = '';
        let url = '';

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.url) {
                url = tab.url;

                // Execute script to get selection
                if (!url.startsWith('chrome://') && !url.startsWith('edge://')) {
                    const injection = await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => window.getSelection().toString()
                    });
                    if (injection && injection[0]) {
                        selection = injection[0].result || '';
                    }
                }
            }
        } catch (e) {
            console.error('Failed to get context:', e);
        }

        result = result.replace(/{{selection}}/g, selection);
        result = result.replace(/{{url}}/g, url);

        return result;
    }
};

// --- UI Functions ---

function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function switchView(view) {
    currentView = view;

    // Hide all views
    viewMain.classList.add('hidden');
    viewCreate.classList.add('hidden');
    viewImport.classList.add('hidden');

    // Reset Header
    if (view === 'main') {
        searchContainer.classList.remove('hidden');
        headerActions.classList.add('hidden');
        viewMain.classList.remove('hidden');
        searchInput.focus();
        renderPromptList();
    } else {
        searchContainer.classList.add('hidden');
        headerActions.classList.remove('hidden');

        if (view === 'create') {
            headerTitle.textContent = 'Create New Prompt';
            viewCreate.classList.remove('hidden');
            viewCreate.classList.add('animate-slide-up');
            inputTitle.focus();
        } else if (view === 'import') {
            headerTitle.textContent = 'Import from GitHub';
            viewImport.classList.remove('hidden');
            loadGitHubPrompts();
        }
    }
}

function renderPromptList() {
    const filter = searchInput.value.toLowerCase();
    const filtered = prompts.filter(p => p.title.toLowerCase().includes(filter));

    promptList.innerHTML = '';

    if (filtered.length === 0 && filter) {
        promptList.innerHTML = '<div class="list-item" style="justify-content:center; color:var(--muted-foreground); cursor:default;">No results found.</div>';
        return;
    }

    filtered.forEach(prompt => {
        const el = document.createElement('div');
        el.className = 'list-item';
        el.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>${prompt.title}</span>
        `;
        el.onclick = () => handlePromptSelect(prompt);
        promptList.appendChild(el);
    });
}

async function handlePromptSelect(prompt) {
    try {
        const parsed = await PromptEngine.parse(prompt.content);
        await navigator.clipboard.writeText(parsed);
        showToast('Copied to clipboard!');
        setTimeout(() => window.close(), 1000);
    } catch (e) {
        console.error(e);
        showToast('Failed to copy.', 'error');
    }
}

async function handleSavePrompt() {
    const title = inputTitle.value.trim();
    const content = inputContent.value.trim();

    if (!title || !content) {
        showToast('Please fill in all fields.', 'error');
        return;
    }

    const newPrompt = {
        id: Date.now().toString(),
        title,
        content,
        created_at: Date.now()
    };

    await StorageService.addPrompt(newPrompt);
    showToast('Prompt saved!');

    // Reset form
    inputTitle.value = '';
    inputContent.value = '';

    switchView('main');
}

async function loadGitHubPrompts() {
    importList.innerHTML = '';
    importLoading.classList.remove('hidden');

    try {
        const response = await fetch('https://raw.githubusercontent.com/f/awesome-chatgpt-prompts/main/prompts.csv');
        const text = await response.text();

        // Simple CSV parser
        const lines = text.split('\n').slice(1); // Skip header
        const fetchedPrompts = lines.map(line => {
            // Handle CSV quotes roughly
            const parts = line.split('","');
            if (parts.length >= 2) {
                return {
                    title: parts[0].replace(/^"/, ''),
                    content: parts[1].replace(/"$/, '')
                };
            }
            return null;
        }).filter(p => p);

        importLoading.classList.add('hidden');

        fetchedPrompts.forEach(p => {
            const el = document.createElement('div');
            el.className = 'list-item';
            el.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                <span>${p.title}</span>
            `;
            el.onclick = async () => {
                await StorageService.addPrompt({
                    id: Date.now().toString() + Math.random(),
                    title: p.title,
                    content: p.content,
                    created_at: Date.now()
                });
                showToast(`Imported "${p.title}"`);
                el.style.opacity = '0.5';
                el.style.pointerEvents = 'none';
            };
            importList.appendChild(el);
        });

    } catch (e) {
        console.error(e);
        importLoading.classList.add('hidden');
        showToast('Failed to fetch prompts.', 'error');
    }
}

// --- Initialization ---

async function init() {
    // Check seeding
    const seeded = await StorageService.isSeeded();
    prompts = await StorageService.getPrompts();

    if (!seeded && prompts.length === 0) {
        const demos = [
            {
                id: 'demo-1',
                title: 'Summarize Page',
                content: 'Please summarize the following content from {{url}}:\n\n{{selection}}',
                created_at: Date.now()
            },
            {
                id: 'demo-2',
                title: 'Explain Like I\'m 5',
                content: 'Explain this concept in simple terms:\n\n{{selection}}',
                created_at: Date.now()
            }
        ];
        await StorageService.savePrompts(demos);
        await StorageService.setSeeded();
        prompts = demos;
    }

    renderPromptList();
}

// --- Event Listeners ---

searchInput.addEventListener('input', renderPromptList);

btnCreateView.addEventListener('click', () => switchView('create'));
btnImportView.addEventListener('click', () => switchView('import'));
backButton.addEventListener('click', () => switchView('main'));

btnSave.addEventListener('click', handleSavePrompt);

btnClearAll.addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete all prompts?')) {
        await StorageService.clearPrompts();
        prompts = [];
        renderPromptList();
        showToast('All prompts cleared.');
    }
});

// Chips
document.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
        const text = btn.dataset.insert;
        const start = inputContent.selectionStart;
        const end = inputContent.selectionEnd;
        const val = inputContent.value;
        inputContent.value = val.substring(0, start) + text + val.substring(end);
        inputContent.focus();
        inputContent.selectionStart = inputContent.selectionEnd = start + text.length;
    });
});

// Start
init();
