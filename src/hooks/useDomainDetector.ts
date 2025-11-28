import { useState, useEffect } from 'react';

export const useDomainDetector = () => {
    const [domain, setDomain] = useState<string | null>(null);
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        const detect = async () => {
            // Check if chrome API is available (for development in browser without extension context)
            if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
                try {
                    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (tab?.url) {
                        const urlObj = new URL(tab.url);
                        setDomain(urlObj.hostname);
                        setUrl(tab.url);
                    }
                } catch (error) {
                    console.error('Failed to detect domain:', error);
                }
            } else {
                // Fallback for development
                console.warn('Chrome API not available, using window.location');
                setDomain(window.location.hostname);
                setUrl(window.location.href);
            }
        };

        detect();
    }, []);

    return { domain, url };
};
