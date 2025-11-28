import { create } from 'zustand';
import { StorageService } from '../lib/storage';
import type { Prompt } from '../lib/storage';

interface PromptState {
    prompts: Prompt[];
    isLoading: boolean;
    loadPrompts: () => Promise<void>;
    addPrompt: (prompt: Prompt) => Promise<void>;
    deletePrompt: (id: string) => Promise<void>;
}

export const usePromptStore = create<PromptState>((set) => ({
    prompts: [],
    isLoading: true,
    loadPrompts: async () => {
        set({ isLoading: true });
        try {
            const prompts = await StorageService.getPrompts();
            set({ prompts, isLoading: false });
        } catch (error) {
            console.error('Failed to load prompts:', error);
            set({ isLoading: false });
        }
    },
    addPrompt: async (prompt) => {
        await StorageService.addPrompt(prompt);
        set((state) => ({ prompts: [...state.prompts, prompt] }));
    },
    deletePrompt: async (id) => {
        await StorageService.deletePrompt(id);
        set((state) => ({ prompts: state.prompts.filter((p) => p.id !== id) }));
    },
}));
