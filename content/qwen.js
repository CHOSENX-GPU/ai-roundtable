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
            if (inputEl) break;
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
        } else {
            // Contenteditable div
            inputEl.textContent = text;
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Small delay to let React process
        await sleep(100);

        // Find and click the send button
        const sendButton = findSendButton();
        if (!sendButton) {
            throw new Error('Could not find send button');
        }

        // Wait for button to be enabled
        await waitForButtonEnabled(sendButton);

        sendButton.click();

        // Start capturing response after sending
        console.log('[AI Panel] Qwen message sent, starting response capture...');
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
                console.log('[AI Panel] Qwen button is enabled, proceeding with click');
                return;
            }
            await sleep(50);
        }
        console.log('[AI Panel] Qwen button still disabled after wait, clicking anyway');
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
        let previousLength = 0;
        let stableCount = 0;
        const maxWait = 600000;  // 10 minutes
        const checkInterval = 400;  // Check faster
        const stableThreshold = 8;  // ~3.2 seconds of stable content (increased for long responses)

        const startTime = Date.now();

        try {
            while (Date.now() - startTime < maxWait) {
                if (!isContextValid()) {
                    console.log('[AI Panel] Context invalidated, stopping capture');
                    return;
                }

                await sleep(checkInterval);

                // Check if still streaming - Qwen specific indicators
                const isStreaming = document.querySelector('[class*="loading"]') ||
                    document.querySelector('[class*="streaming"]') ||
                    document.querySelector('[class*="typing"]') ||
                    document.querySelector('[class*="generating"]') ||
                    document.querySelector('button[aria-label*="停止"]') ||
                    document.querySelector('button[aria-label*="Stop"]') ||
                    document.querySelector('.cursor-blink');  // Qwen cursor indicator

                const currentContent = getLatestResponse() || '';
                const currentLength = currentContent.length;

                // Log for debugging
                if (stableCount % 5 === 0) {
                    console.log('[AI Panel] Qwen streaming - length:', currentLength, 'streaming:', !!isStreaming);
                }

                // Consider complete if:
                // 1. Not streaming AND content has been stable for threshold checks
                // 2. OR content stopped growing AND not streaming
                const contentStable = currentContent === previousContent && currentLength > 0;
                const stoppedGrowing = currentLength === previousLength && currentLength > 0;

                if ((!isStreaming && contentStable) || (!isStreaming && stoppedGrowing)) {
                    stableCount++;
                    if (stableCount >= stableThreshold) {
                        // Final check - make sure we have substantial content
                        if (currentContent.length > 10 && currentContent !== lastCapturedContent) {
                            lastCapturedContent = currentContent;
                            safeSendMessage({
                                type: 'RESPONSE_CAPTURED',
                                aiType: AI_TYPE,
                                content: currentContent
                            });
                            console.log('[AI Panel] Qwen response captured, length:', currentContent.length);
                        } else if (currentContent.length <= 10) {
                            console.log('[AI Panel] Qwen response too short, waiting...');
                            stableCount = 0;  // Reset and wait more
                        }
                        return;
                    }
                } else {
                    // Content is still changing or still streaming
                    stableCount = 0;
                }

                previousContent = currentContent;
                previousLength = currentLength;
            }

            // Timeout reached - capture whatever we have
            const finalContent = getLatestResponse() || '';
            if (finalContent.length > 10 && finalContent !== lastCapturedContent) {
                lastCapturedContent = finalContent;
                safeSendMessage({
                    type: 'RESPONSE_CAPTURED',
                    aiType: AI_TYPE,
                    content: finalContent
                });
                console.log('[AI Panel] Qwen response captured after timeout, length:', finalContent.length);
            }
        } finally {
            isCapturing = false;
        }
    }

    function getLatestResponse() {
        // Find the latest assistant message - more robust selectors
        const messageSelectors = [
            // Qwen specific - try multiple patterns
            '.qwen-message .message-content',
            '.chat-message.assistant .message-content',
            '[class*="assistant"] [class*="markdown"]',
            '[class*="assistant-message"]',
            '[class*="bot-message"]',
            '[class*="message-content"]',
            '.markdown-body',
            '[data-role="assistant"]',
            '[role="assistant"]',
            // Generic fallbacks
            'main article:last-child .message-content',
            'main div[class*="message"]:last-child'
        ];

        let bestContent = null;
        let maxLength = 0;

        for (const selector of messageSelectors) {
            const messages = document.querySelectorAll(selector);
            if (messages.length > 0) {
                const lastMessage = messages[messages.length - 1];
                const content = lastMessage.innerText.trim();

                // Keep the longest valid content
                if (content.length > maxLength && content.length > 20) {
                    maxLength = content.length;
                    bestContent = content;
                    console.log('[AI Panel] Qwen found content with selector:', selector, 'length:', content.length);
                }
            }
        }

        if (bestContent) {
            console.log('[AI Panel] Qwen final captured length:', maxLength);
            return bestContent;
        }

        console.log('[AI Panel] Qwen could not find response');
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
        // Direct navigation is most reliable
        console.log('[AI Panel] Qwen: Starting new conversation via navigation');
        await sleep(100);
        window.location.href = 'https://tongyi.aliyun.com/qianwen/';
        return true;
    }

    console.log('[AI Panel] Qwen content script loaded');
})();
