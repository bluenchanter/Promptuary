import type { Prompt } from './storage';

const AWESOME_CHATGPT_PROMPTS_URL = 'https://raw.githubusercontent.com/f/awesome-chatgpt-prompts/main/prompts.csv';

export class GitHubService {
    static async fetchAwesomePrompts(): Promise<Prompt[]> {
        try {
            const response = await fetch(AWESOME_CHATGPT_PROMPTS_URL);
            if (!response.ok) {
                throw new Error('Failed to fetch prompts from GitHub');
            }
            const csvText = await response.text();
            return this.parseCsv(csvText);
        } catch (error) {
            console.error('Error fetching GitHub prompts:', error);
            throw error;
        }
    }

    private static parseCsv(csvText: string): Prompt[] {
        const lines = csvText.split('\n');
        const prompts: Prompt[] = [];

        // Simple CSV parser - assumes "act","prompt" structure
        // This is a basic implementation and might need robustness for complex CSVs
        // But for the specific repo, it usually follows a standard format.
        // We need to handle quoted strings properly.

        let currentLine = '';

        // Skip header
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Handle multi-line CSV rows
            currentLine += (currentLine ? '\n' : '') + line;

            // Check if quotes are balanced
            const quoteCount = (currentLine.match(/"/g) || []).length;
            if (quoteCount % 2 === 0) {
                // Balanced, process the line
                const parts = this.parseCsvLine(currentLine);
                if (parts.length >= 2) {
                    const act = parts[0].replace(/^"|"$/g, '').replace(/""/g, '"');
                    const promptText = parts[1].replace(/^"|"$/g, '').replace(/""/g, '"');

                    prompts.push({
                        id: `github-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        title: act,
                        content: promptText,
                        tags: ['github', 'awesome-chatgpt-prompts'],
                        target_domains: [],
                        created_at: Date.now()
                    });
                }
                currentLine = '';
            }
        }

        return prompts;
    }

    private static parseCsvLine(text: string): string[] {
        const result: string[] = [];
        let start = 0;
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            if (text[i] === '"') {
                inQuotes = !inQuotes;
            } else if (text[i] === ',' && !inQuotes) {
                result.push(text.substring(start, i));
                start = i + 1;
            }
        }
        result.push(text.substring(start));
        return result;
    }
}
