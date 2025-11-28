```
import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { Search, Copy, Plus, Terminal, Download, ArrowLeft, Loader2, Check } from 'lucide-react';
import { usePromptStore } from '../store/usePromptStore';
import { useDomainDetector } from '../hooks/useDomainDetector';
import { PromptEngine } from '../lib/PromptEngine';
import type { Prompt } from '../lib/storage';

type View = 'main' | 'github_import' | 'create_prompt';

export const CommandPalette = () => {
    const { prompts, loadPrompts, addPrompt } = usePromptStore();
    const { domain, url } = useDomainDetector();
    const [search, setSearch] = useState('');
    const [view, setView] = useState<View>('main');
    const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    
    // Import state
    const [fetchedPrompts, setFetchedPrompts] = useState<Prompt[]>([]);
    const [isLoadingImport, setIsLoadingImport] = useState(false);
    const [importedIds, setImportedIds] = useState<Set<string>>(new Set());

    // Create prompt state
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

    // Seed data if empty (for demo purposes)
    useEffect(() => {
        if (prompts.length === 0) {
            addPrompt({
                id: '1',
                title: 'Summarize Page',
                content: 'Summarize the following content from {{url}}:\n\n{{selection}}',
                tags: ['general', 'summary'],
                target_domains: [],
                created_at: Date.now(),
            });
            addPrompt({
                id: '2',
                title: 'LinkedIn Connection Request',
                content: 'Hi {{selection}}, I saw your profile and...',
                tags: ['professional', 'linkedin'],
                target_domains: ['linkedin.com'],
                created_at: Date.now(),
            });
        }
    }, [prompts.length, addPrompt]);

    const filteredPrompts = prompts.filter((prompt) => {
        // If prompt has target domains, only show if we are on that domain
        if (prompt.target_domains && prompt.target_domains.length > 0) {
            if (!domain) return false;
            return prompt.target_domains.some(d => domain.includes(d));
        }
        return true;
    });

    const handleSelect = async (promptId: string) => {
        const prompt = prompts.find(p => p.id === promptId);
        if (!prompt) return;

        try {
            // Get context
            let selection = '';
            try {
                if (typeof chrome !== 'undefined' && chrome.scripting) {
                    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (tab.id) {
                        const result = await chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            func: () => window.getSelection()?.toString() || ''
                        });
                        selection = result[0].result || '';
                    }
                }
            } catch (e) {
                console.warn('Failed to get selection', e);
            }

            const context = {
                selection: selection,
                url: url || '',
                clipboard: '', // TODO: Implement clipboard reading
            };

            const parsedContent = await PromptEngine.parse(prompt.content, context);

            await navigator.clipboard.writeText(parsedContent);

            setFeedback({ message: 'Copied to clipboard!', type: 'success' });

            // Delay closing so user sees the success message
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

    return (
        <div className="h-full w-full bg-background flex items-start justify-center p-4 relative">
            {feedback && (
                <div className={`absolute top - 2 left - 1 / 2 transform - translate - x - 1 / 2 z - 50 px - 4 py - 2 rounded - md shadow - lg text - sm font - medium animate -in fade -in slide -in -from - top - 2 ${
    feedback.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
} `}>
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
                                {domain && (
                                    <Command.Group heading={`Context: ${ domain } `}>
                                        {filteredPrompts.map((prompt) => (
                                            <Command.Item
                                                key={prompt.id}
                                                value={prompt.title}
                                                onSelect={() => handleSelect(prompt.id)}
                                                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                            >
                                                <Terminal className="mr-2 h-4 w-4" />
                                                <span>{prompt.title}</span>
                                                <span className="ml-auto text-xs text-muted-foreground">
                                                    {prompt.tags.join(', ')}
                                                </span>
                                            </Command.Item>
                                        ))}
                                    </Command.Group>
                                )}

                                <Command.Group heading="General">
                                    {prompts.filter(p => !p.target_domains || p.target_domains.length === 0).map((prompt) => (
                                        <Command.Item
                                            key={prompt.id}
                                            value={prompt.title}
                                            onSelect={() => handleSelect(prompt.id)}
                                            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
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
                                        className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        <span>Create New Prompt</span>
                                    </Command.Item>
                                    <Command.Item
                                        onSelect={handleImportView}
                                        className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        <span>Import GitHub Prompts</span>
                                    </Command.Item>
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
                                                    onSelect={() => handleImportItem(prompt)}
                                                    disabled={isImported}
                                                    className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
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
```
