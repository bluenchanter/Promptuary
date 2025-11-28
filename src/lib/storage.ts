export interface Prompt {
    id: string;
    title: string;
    content: string;
    tags: string[];
    target_domains: string[];
    created_at: number;
}

const STORAGE_KEY = 'promptuary_prompts';

export class StorageService {
    static async getPrompts(): Promise<Prompt[]> {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            const result = await chrome.storage.local.get(STORAGE_KEY);
            return (result[STORAGE_KEY] as Prompt[]) || [];
        } else {
            // Fallback for local dev
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        }
    }

    static async savePrompts(prompts: Prompt[]): Promise<void> {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            await chrome.storage.local.set({ [STORAGE_KEY]: prompts });
        } else {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
        }
    }

    static async addPrompt(prompt: Prompt): Promise<void> {
        const prompts = await this.getPrompts();
        prompts.push(prompt);
        await this.savePrompts(prompts);
    }

    static async updatePrompt(updatedPrompt: Prompt): Promise<void> {
        const prompts = await this.getPrompts();
        const index = prompts.findIndex(p => p.id === updatedPrompt.id);
        if (index !== -1) {
            prompts[index] = updatedPrompt;
            await this.savePrompts(prompts);
        }
    }

    static async deletePrompt(id: string): Promise<void> {
        const prompts = await this.getPrompts();
        const filtered = prompts.filter(p => p.id !== id);
        await this.savePrompts(filtered);
    }
}
