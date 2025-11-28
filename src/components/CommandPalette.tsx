import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { Search, Copy, Plus, Terminal } from 'lucide-react';
import { usePromptStore } from '../store/usePromptStore';
import { useDomainDetector } from '../hooks/useDomainDetector';
import { PromptEngine } from '../lib/PromptEngine';

export const CommandPalette = () => {
    const { prompts, loadPrompts, addPrompt } = usePromptStore();
    const { domain, url } = useDomainDetector();
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadPrompts();
    }, [loadPrompts]);

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
                // In a real extension, we'd use scripting API to get selection from active tab
                // For now, we'll try to read from clipboard as a fallback or mock it
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

            // Copy to clipboard
            await navigator.clipboard.writeText(parsedContent);

            // Visual feedback (could be a toast)
            console.log('Copied to clipboard:', parsedContent);

            // Close window if in extension
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                window.close();
            }
        } catch (error) {
            console.error('Execution failed:', error);
        }
    };

    return (
        <div className="h-full w-full bg-background flex items-start justify-center p-4">
            <Command className="rounded-xl border shadow-md w-full h-full bg-background overflow-hidden flex flex-col">
                <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <Command.Input
                        placeholder="Type a command or search prompts..."
                        value={search}
                        onValueChange={setSearch}
                        className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>
                <Command.List className="flex-1 overflow-y-auto overflow-x-hidden p-2">
                    <Command.Empty>No results found.</Command.Empty>

                    {domain && (
                        <Command.Group heading={`Context: ${domain}`}>
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
                            onSelect={() => console.log('Create new prompt')}
                            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            <span>Create New Prompt</span>
                        </Command.Item>
                    </Command.Group>
                </Command.List>
            </Command>
        </div>
    );
};
