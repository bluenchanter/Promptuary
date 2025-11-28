export interface PromptContext {
    selection?: string;
    url?: string;
    clipboard?: string;
}

export class PromptEngine {
    /**
     * Parses a prompt template and replaces magic variables with context data.
     * @param template The prompt template string.
     * @param context The context containing variable values.
     * @returns The parsed prompt string.
     */
    static async parse(template: string, context: PromptContext): Promise<string> {
        if (typeof template !== 'string') {
            throw new Error('Template must be a string.');
        }

        let result = template;

        // Replace {{selection}}
        // We use a function replacement to avoid issues with special characters in the replacement string
        result = result.replace(/{{selection}}/g, () => context.selection || '');

        // Replace {{url}}
        result = result.replace(/{{url}}/g, () => context.url || '');

        // Replace {{clipboard}}
        result = result.replace(/{{clipboard}}/g, () => context.clipboard || '');

        return result;
    }
}
