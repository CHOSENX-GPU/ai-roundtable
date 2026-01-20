// AI Panel - 豆包 (Doubao) Content Script

(function () {
    'use strict';

    const AI_TYPE = 'doubao';

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
        // Doubao uses textarea for input
        const inputSelectors = [
            'textarea.semi-input-textarea',      // Doubao specific
            'textarea[placeholder*="输入"]',
            'textarea[placeholder*="豆包"]',
            'textarea',
            '[contenteditable="true"]'
        ];

        let inputEl = null;
        for (const selector of inputSelectors) {
            inputEl = document.querySelector(selector);
            if (inputEl) {
                console.log('[AI Panel] Doubao found input with:', selector);
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

        // Doubao doesn't have reliable button selectors, use Enter key instead
        console.log('[AI Panel] Doubao sending via Enter key...');
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

        console.log('[AI Panel] Doubao Enter key dispatched');

        // Start capturing response after sending
        waitForStreamingComplete();

        return true;
    }

    function findSendButton() {
        // Doubao's send button - based on browser inspection
        const selectors = [
            'button[aria-label="发送"]',      // Doubao specific
            'button.send-btn-mNNnTf',        // Hashed class (may change)
            'button[aria-label*="发送"]',
            'button[aria-label*="Send"]',
            'button[type="submit"]',
            'button[class*="send"]'
        ];

        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el && isVisible(el)) {
                console.log('[AI Panel] Doubao found send button with:', selector);
                return el;
            }
        }

        // Fallback: find button near the input
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
            if (btn.querySelector('svg') && isVisible(btn)) {
                const rect = btn.getBoundingClientRect();
                if (rect.bottom > window.innerHeight - 200) {
                    console.log('[AI Panel] Doubao found send via fallback');
                    return btn;
                }
            }
        }

        console.log('[AI Panel] Doubao could not find send button');
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
                console.log('[AI Panel] Doubao button is enabled, proceeding with click');
                return;
            }
            await sleep(50);
        }
        console.log('[AI Panel] Doubao button still disabled after wait, clicking anyway');
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
                console.log('[AI Panel] Doubao detected new response...');
                waitForStreamingComplete();
                break;
            }
        }
    }

    async function waitForStreamingComplete() {
        if (isCapturing) {
            console.log('[AI Panel] Doubao already capturing, skipping...');
            return;
        }
        isCapturing = true;

        let previousContent = '';
        let stableCount = 0;
        const maxWait = 600000;  // 10 minutes
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
                    document.querySelector('[class*="typing"]') ||
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
                            console.log('[AI Panel] Doubao response captured, length:', currentContent.length);
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
        // Find the latest assistant message - Doubao specific
        const messageSelectors = [
            // Doubao (ByteDance) specific patterns
            '.message-list .message.bot .message-content',
            '.chat-message.bot .content',
            '[class*="bot-message"] [class*="content"]',
            '[class*="assistant"] [class*="markdown"]',
            '[class*="bot-message"]',
            '[class*="message-content"]',
            '[class*="doubao-response"]',
            '.markdown-body',
            // Generic fallbacks - Doubao might use different structure
            'main article:last-child .content',
            'main div[class*="message"]:last-child',
            // Very generic - find any large text block at the end
            'main > div:last-child div[class*="message"]'
        ];

        let bestContent = null;
        let maxLength = 0;

        for (const selector of messageSelectors) {
            try {
                const messages = document.querySelectorAll(selector);
                if (messages.length > 0) {
                    const lastMessage = messages[messages.length - 1];
                    const content = lastMessage.innerText.trim();

                    // Keep the longest valid content
                    if (content.length > maxLength && content.length > 20) {
                        maxLength = content.length;
                        bestContent = content;
                        console.log('[AI Panel] Doubao found content with selector:', selector, 'length:', content.length);
                    }
                }
            } catch (e) {
                // Selector might be invalid, skip it
                console.log('[AI Panel] Doubao selector failed:', selector, e.message);
            }
        }

        if (bestContent) {
            console.log('[AI Panel] Doubao final captured length:', maxLength);
            return bestContent;
        }

        console.log('[AI Panel] Doubao could not find response - DOM structure may have changed');
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

    async function newConversation() {
        // Find new chat button for Doubao
        const newChatSelectors = [
            'button:contains("新对话")',
            'button:contains("新建")',
            'button:contains("New")',
            'a[href*="/new"]',
            '[data-testid="new-chat-button"]'
        ];

        for (const selector of newChatSelectors) {
            try {
                let button = null;

                if (selector.includes(':contains(')) {
                    const tagName = selector.split(':')[0];
                    const text = selector.match(/:contains\("([^"]+)"\)/)[1];
                    const buttons = Array.from(document.querySelectorAll(tagName));
                    button = buttons.find(btn => btn.textContent.includes(text));
                } else {
                    button = document.querySelector(selector);
                }

                if (button && isVisible(button)) {
                    console.log('[AI Panel] Doubao found new chat button');
                    button.click();
                    await sleep(500);
                    return;
                }
            } catch (e) {
                continue;
            }
        }

        // Fallback: reload page
        console.log('[AI Panel] Doubao new chat button not found, reloading page');
        window.location.reload();
    }

    console.log('[AI Panel] Doubao content script loaded');
})();
