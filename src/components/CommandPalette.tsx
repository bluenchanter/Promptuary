import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { Search, Copy, Plus, Download, ArrowLeft, Loader2, Check, Trash2 } from 'lucide-react';
import { usePromptStore } from '../store/usePromptStore';
import { PromptEngine } from '../lib/PromptEngine';
import type { Prompt } from '../lib/storage';

type View = 'main' | 'github_import' | 'create_prompt';

export const CommandPalette = () => {
    const { prompts, loadPrompts, addPrompt, clearAllPrompts } = usePromptStore();
    const [search, setSearch] = useState('');
    const [view, setView] = useState<View>('main');
    const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const [fetchedPrompts, setFetchedPrompts] = useState<Prompt[]>([]);
    const [isLoadingImport, setIsLoadingImport] = useState(false);
    const [importedIds, setImportedIds] = useState<Set<string>>(new Set());

    const [newPromptTitle, setNewPromptTitle] = useState('');
    const [newPromptContent, setNewPromptContent] = useState('');

    useEffect(() => {
        loadPrompts();
    }, [loadPrompts]);

    useEffect(() => {
        if (feedback) {
            const timer = setTimeout(() => setFeedback(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [feedback]);

    // Seed demo prompts ONCE - persist this check across popup sessions
    useEffect(() => {
        const seedDemoPrompts = async () => {
            // Check if we've already seeded using chrome.storage
            const SEEDED_KEY = 'promptuary_demo_seeded';
            let hasSeeded = false;

            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                const result = await chrome.storage.local.get(SEEDED_KEY);
                hasSeeded = result[SEEDED_KEY] === true;
            } else {
                hasSeeded = localStorage.getItem(SEEDED_KEY) === 'true';
            }

            // If already seeded, don't seed again
            if (hasSeeded) return;

            // Check if demo prompts already exist in the current prompts list
            const hasDemoPrompts = prompts.some(p => p.id.startsWith('demo-'));
            if (hasDemoPrompts) {
                // Mark as seeded if demo prompts exist
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    await chrome.storage.local.set({ [SEEDED_KEY]: true });
                } else {
                    localStorage.setItem(SEEDED_KEY, 'true');
                }
                return;
            }

            // If prompts exist but no demo prompts, user must have cleared demos - don't re-seed
            if (prompts.length > 0) return;

            // Seed the demo prompts
            await addPrompt({
                id: 'demo-1',
                title: 'Summarize Page',
                content: 'Please summarize the following content from {{url}}:\n\n{{selection}}',
                tags: ['general', 'summary'],
                target_domains: [],
                created_at: Date.now(),
            });
            await addPrompt({
                id: 'demo-2',
                title: 'Explain Like I\'m 5',
                content: 'Explain this concept in simple terms:\n\n{{selection}}',
                tags: ['general', 'learning'],
                target_domains: [],
                created_at: Date.now(),
            });

            // Mark as seeded
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                await chrome.storage.local.set({ [SEEDED_KEY]: true });
            } else {
                localStorage.setItem(SEEDED_KEY, 'true');
            }
        };

        seedDemoPrompts();
    }, [prompts, addPrompt]);

    const handleSelect = async (promptId: string) => {
        console.log('Prompt selected:', promptId);
        const prompt = prompts.find(p => p.id === promptId);
        if (!prompt) {
            console.error('Prompt not found:', promptId);
            return;
        }

        try {
            let selection = '';
            let url = '';

            try {
                if (typeof chrome !== 'undefined' && chrome.scripting) {
                    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (tab.id && tab.url) {
                        url = tab.url;

                        const isRestrictedUrl = url.startsWith('chrome://') ||
                            url.startsWith('chrome-extension://') ||
                            url.startsWith('edge://') ||
                            url.startsWith('about:');

                        if (!isRestrictedUrl) {
                            const result = await chrome.scripting.executeScript({
                                target: { tabId: tab.id },
                                func: () => window.getSelection()?.toString() || ''
                            });
                            selection = result[0].result || '';
                        }
                    }
                }
            } catch (e) {
                console.debug('Could not access page content:', e);
            }

            const context = {
                selection,
                url,
                clipboard: '',
            };

            const parsedContent = await PromptEngine.parse(prompt.content, context);
            await navigator.clipboard.writeText(parsedContent);
            console.log('Copied to clipboard:', parsedContent);

            setFeedback({ message: 'Copied to clipboard!', type: 'success' });

            setTimeout(() => {
                if (typeof chrome !== 'undefined' && chrome.runtime) {
                    window.close();
                }
            }, 1000);

        } catch (error) {
            console.error('Execution failed:', error);
            setFeedback({ message: 'Failed to copy prompt.', type: 'error' });
        }
    };

    const handleImportView = async () => {
        setView('github_import');
        setIsLoadingImport(true);
        try {
            const { GitHubService } = await import('../lib/githubService');
            const prompts = await GitHubService.fetchAwesomePrompts();
            setFetchedPrompts(prompts);
        } catch (error) {
            console.error('Failed to fetch prompts', error);
            setFeedback({ message: 'Failed to fetch GitHub prompts.', type: 'error' });
        } finally {
            setIsLoadingImport(false);
        }
    };

    const handleImportItem = async (prompt: Prompt) => {
        console.log('Importing prompt:', prompt.title);
        await addPrompt(prompt);
        setImportedIds(prev => new Set(prev).add(prompt.id));
        setFeedback({ message: `Imported "${prompt.title}"`, type: 'success' });
    };

    const handleCreatePrompt = async () => {
        if (!newPromptTitle || !newPromptContent) {
            setFeedback({ message: 'Please fill in all fields.', type: 'error' });
            return;
        }

        await addPrompt({
            id: Date.now().toString(),
            title: newPromptTitle,
            content: newPromptContent,
            tags: ['custom'],
            target_domains: [],
            created_at: Date.now(),
        });

        setFeedback({ message: 'Prompt created!', type: 'success' });
        setNewPromptTitle('');
        setNewPromptContent('');
        setView('main');
    };

    const handleClearAll = async () => {
        if (window.confirm('Are you sure you want to delete all prompts? This cannot be undone.')) {
            await clearAllPrompts();
            // Reset the seeded flag so demo prompts can be re-seeded if needed
            const SEEDED_KEY = 'promptuary_demo_seeded';
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                await chrome.storage.local.set({ [SEEDED_KEY]: false });
            } else {
                localStorage.setItem(SEEDED_KEY, 'false');
            }
            setFeedback({ message: 'All prompts cleared!', type: 'success' });
        }
    };

    return (
        <div className="h-full w-full bg-background flex items-start justify-center p-4 relative">
            {feedback && (
                <div className={`absolute top-2 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-md shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-2 ${feedback.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {feedback.message}
                </div>
            )}

            <Command className="rounded-xl border shadow-md w-full h-full bg-background overflow-hidden flex flex-col">
                <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
                    {view === 'main' ? (
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    ) : (
                        <ArrowLeft
                            className="mr-2 h-4 w-4 shrink-0 cursor-pointer hover:opacity-70"
                            onClick={() => setView('main')}
                        />
                    )}
                    {view !== 'create_prompt' && (
                        <Command.Input
                            placeholder={view === 'main' ? "Type a command or search prompts..." : "Search GitHub prompts..."}
                            value={search}
                            onValueChange={setSearch}
                            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    )}
                    {view === 'create_prompt' && (
                        <div className="flex h-11 w-full items-center text-sm font-medium text-muted-foreground">
                            Create New Prompt
                        </div>
                    )}
                </div>

                {view === 'create_prompt' ? (
                    <div className="p-4 flex flex-col gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Title</label>
                            <input
                                className="w-full border rounded-md p-2 text-sm bg-transparent"
                                placeholder="e.g., Summarize Email"
                                value={newPromptTitle}
                                onChange={(e) => setNewPromptTitle(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Content</label>
                            <textarea
                                className="w-full border rounded-md p-2 text-sm bg-transparent h-32 resize-none"
                                placeholder="Use {{selection}} for selected text, {{url}} for current URL."
                                value={newPromptContent}
                                onChange={(e) => setNewPromptContent(e.target.value)}
                            />
                        </div>
                        <button
                            className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                            onClick={handleCreatePrompt}
                        >
                            Save Prompt
                        </button>
                    </div>
                ) : (
                    <Command.List className="flex-1 overflow-y-auto overflow-x-hidden p-2">
                        <Command.Empty>No results found.</Command.Empty>

                        {view === 'main' ? (
                            <>
                                <Command.Group heading="General">
                                    {prompts.map((prompt) => (
                                        <Command.Item
                                            key={prompt.id}
                                            value={prompt.title}
                                            onSelect={() => handleSelect(prompt.id)}
                                            className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                        >
                                            <Copy className="mr-2 h-4 w-4" />
                                            <span>{prompt.title}</span>
                                        </Command.Item>
                                    ))}
                                </Command.Group>

                                <Command.Separator className="-mx-1 h-px bg-border" />

                                <Command.Group heading="Actions">
                                    <Command.Item
                                        onSelect={() => setView('create_prompt')}
                                        className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        <span>Create New Prompt</span>
                                    </Command.Item>
                                    <Command.Item
                                        onSelect={handleImportView}
                                        className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        <span>Import GitHub Prompts</span>
                                    </Command.Item>
                                    {prompts.length > 0 && (
                                        <Command.Item
                                            onSelect={handleClearAll}
                                            className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent text-red-500"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            <span>Clear All Prompts</span>
                                        </Command.Item>
                                    )}
                                </Command.Group>
                            </>
                        ) : (
                            <>
                                {isLoadingImport ? (
                                    <div className="flex items-center justify-center py-6 text-muted-foreground">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Loading prompts...
                                    </div>
                                ) : (
                                    <Command.Group heading="Available Prompts">
                                        {fetchedPrompts.map((prompt) => {
                                            const isImported = importedIds.has(prompt.id) || prompts.some(p => p.title === prompt.title && p.content === prompt.content);
                                            return (
                                                <Command.Item
                                                    key={prompt.id}
                                                    value={prompt.title}
                                                    onSelect={() => !isImported && handleImportItem(prompt)}
                                                    className={`relative flex select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none ${isImported
                                                        ? 'cursor-not-allowed opacity-50'
                                                        : 'cursor-pointer hover:bg-accent hover:text-accent-foreground'
                                                        }`}
                                                >
                                                    {isImported ? (
                                                        <Check className="mr-2 h-4 w-4 text-green-500" />
                                                    ) : (
                                                        <Download className="mr-2 h-4 w-4 opacity-50" />
                                                    )}
                                                    <span>{prompt.title}</span>
                                                    {isImported && <span className="ml-auto text-xs text-green-500">Imported</span>}
                                                </Command.Item>
                                            );
                                        })}
                                    </Command.Group>
                                )}
                            </>
                        )}
                    </Command.List>
                )}
            </Command>
        </div>
    );
};
