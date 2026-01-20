// AI Panel - DeepSeek Content Script

(function () {
    'use strict';

    const AI_TYPE = 'deepseek';

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
    });

    // Setup response observer for cross-reference feature
    setupResponseObserver();

    async function injectMessage(text) {
        // DeepSeek uses a textarea for input
        const inputSelectors = [
            '#chat-input',
            'textarea[placeholder*="输入"]',
            'textarea[placeholder*="发送"]',
            'textarea[placeholder*="DeepSeek"]',
            'textarea',
            'div[contenteditable="true"]'
        ];

        let inputEl = null;
        for (const selector of inputSelectors) {
            inputEl = document.querySelector(selector);
            if (inputEl) {
                console.log('[AI Panel] DeepSeek found input with:', selector);
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

        // Delay to let React process
        await sleep(300);

        // Try Enter key first (most reliable for DeepSeek)
        console.log('[AI Panel] DeepSeek sending via Enter key...');
        inputEl.focus();

        const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
        });
        inputEl.dispatchEvent(enterEvent);

        console.log('[AI Panel] DeepSeek Enter key dispatched');

        // Start capturing response after sending
        waitForStreamingComplete();

        return true;
    }

    function findSendButton() {
        // DeepSeek's send button is a div with role="button", not a button element
        const selectors = [
            'div[role="button"].bcc55ca1',           // DeepSeek specific send button class
            'div[role="button"]:not([aria-disabled="true"])',  // Active role button
            'div.ds-icon-button:not(.ds-icon-button--disabled)',  // DeepSeek icon button
            'button[aria-label*="发送"]',
            'button[aria-label*="Send"]',
            'button[type="submit"]'
        ];

        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el && isVisible(el)) {
                console.log('[AI Panel] DeepSeek found send button with selector:', selector);
                return el;
            }
        }

        // Fallback: find div with role="button" near the bottom of the page
        const roleButtons = document.querySelectorAll('div[role="button"]');
        for (const btn of roleButtons) {
            if (btn.querySelector('svg') && isVisible(btn)) {
                const rect = btn.getBoundingClientRect();
                if (rect.bottom > window.innerHeight - 200) {
                    console.log('[AI Panel] DeepSeek found send button via fallback');
                    return btn;
                }
            }
        }

        // Last fallback: any button with svg at the bottom
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

    async function waitForButtonEnabled(button, maxWait = 2000) {
        const start = Date.now();
        // Wait for button to be clickable (not disabled and not aria-disabled)
        while (Date.now() - start < maxWait) {
            const isDisabled = !!button.disabled ||
                button.getAttribute('aria-disabled') === 'true' ||
                button.classList.contains('disabled') ||
                button.style.opacity === '0' ||
                button.style.pointerEvents === 'none';
            if (!isDisabled) {
                console.log('[AI Panel] DeepSeek button is enabled, proceeding with click');
                return;
            }
            await sleep(50);
        }
        console.log('[AI Panel] DeepSeek button still disabled after wait, clicking anyway');
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
                console.log('[AI Panel] DeepSeek detected new response...');
                waitForStreamingComplete();
                break;
            }
        }
    }

    async function waitForStreamingComplete() {
        if (isCapturing) {
            console.log('[AI Panel] DeepSeek already capturing, skipping...');
            return;
        }
        isCapturing = true;

        let previousContent = '';
        let stableCount = 0;
        const maxWait = 600000;  // 10 minutes - AI responses can be very long
        const checkInterval = 500;
        const stableThreshold = 4;  // 2 seconds of stable content

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
                            console.log('[AI Panel] DeepSeek response captured, length:', currentContent.length);
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
        // Find the latest assistant message - more robust selectors
        const messageSelectors = [
            // DeepSeek specific - try multiple patterns
            '.message.assistant .message-content',
            '.assistant-message .markdown-body',
            '[class*="assistant"] [class*="markdown"]',
            '[class*="assistant-message"]',
            '[class*="message-content"]',
            '[class*="ds-markdown"]',
            '.markdown-body',
            // Most generic fallback - find all text blocks in main area
            'main article:last-child p',
            'main div[class*="message"]:last-child'
        ];

        let bestContent = null;
        let maxLength = 0;

        for (const selector of messageSelectors) {
            const messages = document.querySelectorAll(selector);
            if (messages.length > 0) {
                // Get the last message
                const lastMessage = messages[messages.length - 1];
                const content = lastMessage.innerText.trim();

                // Keep the longest valid content
                if (content.length > maxLength && content.length > 20) {
                    maxLength = content.length;
                    bestContent = content;
                }
            }
        }

        if (bestContent) {
            console.log('[AI Panel] DeepSeek captured content length:', maxLength);
            return bestContent;
        }

        console.log('[AI Panel] DeepSeek could not find response');
        return null;
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

    console.log('[AI Panel] DeepSeek content script loaded');
})();
