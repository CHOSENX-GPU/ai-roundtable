// AI Panel - Qwen (通义千问) Content Script

(function () {
    'use strict';

    const AI_TYPE = 'qwen';

    // Check if extension context is still valid
    function isContextValid() {
        return chrome.runtime && chrome.runtime.id;
    }

    // Safe message sender that checks context first
    function safeSendMessage(message, callback) {
        if (!isContextValid()) {
            console.log('[AI Panel] Extension context invalidated, skipping message');
            return;
        }
        try {
            chrome.runtime.sendMessage(message, callback);
        } catch (e) {
            console.log('[AI Panel] Failed to send message:', e.message);
        }
    }

    // Notify background that content script is ready
    safeSendMessage({ type: 'CONTENT_SCRIPT_READY', aiType: AI_TYPE });

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // Handle heartbeat and ping messages
        if (message.type === 'HEARTBEAT' || message.type === 'PING') {
            sendResponse({ alive: true, aiType: AI_TYPE });
            return true;
        }

        if (message.type === 'INJECT_MESSAGE') {
            injectMessage(message.message)
                .then(() => sendResponse({ success: true }))
                .catch(err => sendResponse({ success: false, error: err.message }));
            return true;
        }

        if (message.type === 'GET_LATEST_RESPONSE') {
            const response = getLatestResponse();
            sendResponse({ content: response });
            return true;
        }

        if (message.type === 'NEW_CONVERSATION') {
            newConversation()
                .then(() => sendResponse({ success: true }))
                .catch(err => sendResponse({ success: false, error: err.message }));
            return true;
        }
    });

    // Setup response observer for cross-reference feature
    setupResponseObserver();

    async function injectMessage(text) {
        // Qwen uses a textarea for input
        const inputSelectors = [
            'textarea[placeholder*="输入"]',
            'textarea[placeholder*="问"]',
            'textarea[placeholder*="通义"]',
            '#chat-input',
            'div[contenteditable="true"]',
            'textarea'
        ];

        let inputEl = null;
        for (const selector of inputSelectors) {
            inputEl = document.querySelector(selector);
            if (inputEl) {
                console.log('[AI Panel] Qwen found input with:', selector);
                break;
            }
        }

        if (!inputEl) {
            throw new Error('Could not find input field');
        }

        // Focus the input
        inputEl.focus();

        // Handle different input types
        if (inputEl.tagName === 'TEXTAREA') {
            inputEl.value = text;
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            // Contenteditable div
            inputEl.textContent = text;
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Delay for UI to update
        await sleep(200);

        // Use Enter key to send (more reliable than button click)
        console.log('[AI Panel] Qwen sending via Enter key...');
        inputEl.focus();

        // Dispatch Enter key event
        const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
        });
        inputEl.dispatchEvent(enterEvent);

        console.log('[AI Panel] Qwen Enter key dispatched');

        // Start capturing response after sending
        waitForStreamingComplete();

        return true;
    }

    function findSendButton() {
        // Qwen's send button
        const selectors = [
            'button[aria-label*="发送"]',
            'button[aria-label*="Send"]',
            'button[type="submit"]',
            'button[class*="send"]',
            'div[role="button"][aria-label*="发送"]',
            'button svg[viewBox]'
        ];

        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el) {
                return el.closest('button') || el;
            }
        }

        // Fallback: find button near the input
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
            if (btn.querySelector('svg') && isVisible(btn)) {
                const rect = btn.getBoundingClientRect();
                if (rect.bottom > window.innerHeight - 200) {
                    return btn;
                }
            }
        }

        return null;
    }

    function setupResponseObserver() {
        const observer = new MutationObserver((mutations) => {
            // Check context validity in observer callback
            if (!isContextValid()) {
                observer.disconnect();
                return;
            }
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            checkForResponse(node);
                        }
                    }
                }
            }
        });

        const startObserving = () => {
            if (!isContextValid()) return;
            const mainContent = document.querySelector('main') || document.body;
            observer.observe(mainContent, {
                childList: true,
                subtree: true
            });
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startObserving);
        } else {
            startObserving();
        }
    }

    let lastCapturedContent = '';
    let isCapturing = false;

    function checkForResponse(node) {
        if (isCapturing) return;

        const responseSelectors = [
            '[class*="assistant"]',
            '[class*="message"]',
            '[class*="response"]',
            '[class*="markdown"]'
        ];

        for (const selector of responseSelectors) {
            if (node.matches?.(selector) || node.querySelector?.(selector)) {
                console.log('[AI Panel] Qwen detected new response...');
                waitForStreamingComplete();
                break;
            }
        }
    }

    async function waitForStreamingComplete() {
        if (isCapturing) {
            console.log('[AI Panel] Qwen already capturing, skipping...');
            return;
        }
        isCapturing = true;

        let previousContent = '';
        let stableCount = 0;
        const maxWait = 600000;  // 10 minutes
        const checkInterval = 500;
        const stableThreshold = 4;  // ~2 seconds stable

        const startTime = Date.now();

        try {
            while (Date.now() - startTime < maxWait) {
                if (!isContextValid()) {
                    console.log('[AI Panel] Context invalidated, stopping capture');
                    return;
                }

                await sleep(checkInterval);

                // Check if still streaming
                const isStreaming = document.querySelector('[class*="loading"]') ||
                    document.querySelector('[class*="streaming"]') ||
                    document.querySelector('button[aria-label*="停止"]');

                const currentContent = getLatestResponse() || '';

                if (!isStreaming && currentContent === previousContent && currentContent.length > 0) {
                    stableCount++;
                    if (stableCount >= stableThreshold) {
                        if (currentContent !== lastCapturedContent) {
                            lastCapturedContent = currentContent;
                            safeSendMessage({
                                type: 'RESPONSE_CAPTURED',
                                aiType: AI_TYPE,
                                content: currentContent
                            });
                            console.log('[AI Panel] Qwen response captured, length:', currentContent.length);
                        }
                        return;
                    }
                } else {
                    stableCount = 0;
                }

                previousContent = currentContent;
            }
        } finally {
            isCapturing = false;
        }
    }

    function getLatestResponse() {
        // Strategy 1: Use Qwen-specific selectors
        const assistantMessages = document.querySelectorAll('.qwen-chat-message-assistant .qwen-markdown');

        if (assistantMessages.length > 0) {
            const lastMessage = assistantMessages[assistantMessages.length - 1];
            // Use HTML to preserve Markdown formatting
            const html = lastMessage.innerHTML.trim();
            if (html.length > 0) {
                console.log('[AI Panel] Qwen found via .qwen-markdown, html length:', html.length);
                return htmlToMarkdown(html);
            }
        }

        // Strategy 2: Try to find ANY assistant message with markdown
        const allAssistantMessages = document.querySelectorAll('.qwen-chat-message-assistant');
        if (allAssistantMessages.length > 0) {
            const lastAssistant = allAssistantMessages[allAssistantMessages.length - 1];
            const markdownContent = lastAssistant.querySelector('.qwen-markdown, [class*="markdown"], [class*="content"]');
            if (markdownContent) {
                const html = markdownContent.innerHTML.trim();
                if (html.length > 0) {
                    console.log('[AI Panel] Qwen found via assistant message, html length:', html.length);
                    return htmlToMarkdown(html);
                }
            }
            // Last resort - use innerText
            const text = lastAssistant.innerText?.trim();
            if (text && text.length > 0) {
                console.log('[AI Panel] Qwen fallback to innerText, length:', text.length);
                return text;
            }
        }

        // Strategy 3: Generic assistant patterns
        const fallbackSelectors = [
            '[data-role="assistant"]',
            '[class*="assistant"][class*="message"]',
            '[class*="assistant"] [class*="markdown"]',
            '[class*="assistant"] [class*="content"]',
            '.markdown-body'
        ];

        for (const selector of fallbackSelectors) {
            try {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    const lastEl = elements[elements.length - 1];
                    // Make sure it's not the user's own message
                    const isUserMessage = lastEl.closest('[class*="user"]') ||
                        lastEl.closest('.qwen-chat-message-user') ||
                        lastEl.closest('[data-role="user"]');
                    if (!isUserMessage) {
                        const html = lastEl.innerHTML?.trim() || lastEl.innerText?.trim();
                        if (html && html.length > 0) {
                            console.log('[AI Panel] Qwen fallback via:', selector, 'length:', html.length);
                            // If it has HTML structure, convert it
                            if (lastEl.innerHTML.includes('<')) {
                                return htmlToMarkdown(html);
                            }
                            return html;
                        }
                    }
                }
            } catch (e) {
                console.log('[AI Panel] Qwen selector error:', selector, e.message);
            }
        }

        console.log('[AI Panel] Qwen could not find any response');
        return null;
    }

    function htmlToMarkdown(html) {
        // Create a temporary div to parse HTML
        const temp = document.createElement('div');
        temp.innerHTML = html;

        let markdown = '';

        function processNode(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent;
            }

            if (node.nodeType !== Node.ELEMENT_NODE) {
                return '';
            }

            const tag = node.tagName.toLowerCase();
            const children = Array.from(node.childNodes).map(processNode).join('');

            switch (tag) {
                case 'h1':
                    return `# ${children}\n\n`;
                case 'h2':
                    return `## ${children}\n\n`;
                case 'h3':
                    return `### ${children}\n\n`;
                case 'h4':
                    return `#### ${children}\n\n`;
                case 'h5':
                    return `##### ${children}\n\n`;
                case 'h6':
                    return `###### ${children}\n\n`;
                case 'strong':
                case 'b':
                    return `**${children}**`;
                case 'em':
                case 'i':
                    return `*${children}*`;
                case 'code':
                    // Check if inside pre - if so, let parent handle it
                    if (node.parentElement?.tagName === 'PRE') {
                        return children;
                    }
                    return `\`${children}\``;
                case 'pre':
                    const code = node.querySelector('code');
                    const codeText = code ? code.textContent : node.textContent;
                    // Try to detect language from class
                    const langClass = code?.className || node.className || '';
                    const langMatch = langClass.match(/language-(\w+)/);
                    const lang = langMatch ? langMatch[1] : '';
                    return `\`\`\`${lang}\n${codeText}\n\`\`\`\n\n`;
                case 'p':
                    return `${children}\n\n`;
                case 'br':
                    return '\n';
                case 'hr':
                    return '---\n\n';
                case 'ul':
                    return `${children}\n`;
                case 'ol':
                    return `${children}\n`;
                case 'li':
                    const parent = node.parentElement;
                    const isInOl = parent && parent.tagName.toLowerCase() === 'ol';
                    if (isInOl) {
                        return `${children}\n`;
                    } else {
                        return `- ${children}\n`;
                    }
                case 'a':
                    const href = node.getAttribute('href') || '';
                    return `[${children}](${href})`;
                case 'blockquote':
                    return `> ${children}\n\n`;
                case 'table':
                case 'thead':
                case 'tbody':
                case 'tr':
                case 'th':
                case 'td':
                    return children;
                default:
                    return children;
            }
        }

        Array.from(temp.childNodes).forEach(node => {
            markdown += processNode(node);
        });

        // Clean up extra newlines
        markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();

        return markdown;
    }

    // Utility functions
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function isVisible(el) {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0';
    }

    async function newConversation() {
        // Direct navigation is most reliable
        console.log('[AI Panel] Qwen: Starting new conversation via navigation');
        await sleep(100);
        window.location.href = 'https://chat.qwen.ai/';
        return true;
    }

    console.log('[AI Panel] Qwen content script loaded');
})();
