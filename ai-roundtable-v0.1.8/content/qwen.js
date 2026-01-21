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

    // Navigate to new chat if needed
    // ...

    // --- VISUAL DEBUGGER ---
    const debugPanel = document.createElement('div');
    debugPanel.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: #0f0;
        padding: 10px;
        z-index: 999999;
        font-family: monospace;
        font-size: 12px;
        pointer-events: none;
        border-radius: 5px;
        max-width: 300px;
    `;
    debugPanel.innerHTML = '[AI Panel] Script Loaded<br>Waiting for content...';
    document.body.appendChild(debugPanel);

    function updateDebug(text) {
        debugPanel.innerHTML = `[AI Panel]<br>${text}`;
    }

    // Connect to background
    updateDebug('Connecting to extension...');
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

        // Fallback polling every 2 seconds to catch what MutationObserver might miss
        setInterval(() => {
            if (isCapturing) return;
            const response = getLatestResponse();
            if (response && response !== lastCapturedContent && response.length > lastCapturedContent.length) {
                console.log('[AI Panel] Qwen polling found new content...');
                waitForStreamingComplete();
            }
        }, 2000);
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

    function htmlToMarkdown(element) {
        if (!element) return '';
        const clone = element.cloneNode(true);

        // Remove copy buttons and other UI elements
        clone.querySelectorAll('button, .copy-btn, .sr-only').forEach(el => el.remove());

        // Process code blocks first to protect content
        clone.querySelectorAll('pre').forEach(pre => {
            const code = pre.querySelector('code');
            const langClass = code ? code.className : '';
            const langMatch = langClass.match(/language-(\w+)/) || pre.className.match(/language-(\w+)/);
            const lang = langMatch ? langMatch[1] : '';
            const content = code ? code.textContent : pre.textContent;
            pre.textContent = `\n\`\`\`${lang}\n${content}\n\`\`\`\n`;
        });

        // Inline code
        clone.querySelectorAll('code').forEach(el => {
            if (el.parentElement.tagName !== 'PRE') {
                el.textContent = `\`${el.textContent}\``;
            }
        });

        // Block elements spacing
        clone.querySelectorAll('p, div').forEach(el => {
            el.appendChild(document.createTextNode('\n\n'));
        });

        // Bold/Italic
        clone.querySelectorAll('strong, b').forEach(el => el.textContent = `**${el.textContent}**`);
        clone.querySelectorAll('em, i').forEach(el => el.textContent = `*${el.textContent}*`);

        // Lists
        clone.querySelectorAll('li').forEach(el => el.textContent = `- ${el.textContent}\n`);

        return clone.textContent.trim().replace(/\n{3,}/g, '\n\n');
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
        const checkInterval = 500;  // Slightly relaxed check
        const stableThreshold = 4;  // ~2 seconds stable

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
                    document.querySelector('button[aria-label*="Stop"]');
                // Removed .cursor-blink as it can match input cursor and cause indefinite waiting

                const currentContent = getLatestResponse() || '';
                const currentLength = currentContent.length;

                // Log for debugging
                if (stableCount % 5 === 0) {
                    console.log('[AI Panel] Qwen streaming - length:', currentLength, 'streaming:', !!isStreaming);
                }

                // Consider complete if:
                // 1. Not streaming AND content has been stable
                // 2. OR content stopped growing AND not streaming
                const contentStable = currentContent === previousContent && currentLength > 0;
                const stoppedGrowing = currentLength === previousLength && currentLength > 0;

                if ((!isStreaming && contentStable) || (!isStreaming && stoppedGrowing)) {
                    stableCount++;
                    if (stableCount >= stableThreshold) {
                        // Final check - make sure we have substantial content
                        if (currentContent.length > 5 && currentContent !== lastCapturedContent) {
                            lastCapturedContent = currentContent;
                            safeSendMessage({
                                type: 'RESPONSE_CAPTURED',
                                aiType: AI_TYPE,
                                content: currentContent
                            });
                            console.log('[AI Panel] Qwen response captured, length:', currentContent.length);
                        } else if (currentContent.length <= 5) {
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

            // Timeout reached
            const finalContent = getLatestResponse() || '';
            if (finalContent.length > 5 && finalContent !== lastCapturedContent) {
                lastCapturedContent = finalContent;
                safeSendMessage({
                    type: 'RESPONSE_CAPTURED',
                    aiType: AI_TYPE,
                    content: finalContent
                });
            }
        } finally {
            isCapturing = false;
        }
    }

    function getLatestResponse() {
        // Strategy 1: Try specific selectors first
        const specificSelectors = [
            // Generic assistant patterns
            '[class*="assistant"]',
            '[class*="answer"]',
            '[class*="response"]',
            '[class*="bot"]',
            '[data-role="assistant"]',
            '[role="assistant"]',
            // Markdown containers
            '.markdown-body',
            '[class*="markdown"]',
            // Message content patterns
            '[class*="message-content"]',
            '[class*="msg-content"]',
            '[class*="chat-content"]'
        ];

        let bestContent = null;
        let maxLength = 0;

        for (const selector of specificSelectors) {
            try {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    // Get the LAST matching element (most recent message)
                    const lastEl = elements[elements.length - 1];
                    const text = lastEl.innerText?.trim() || '';

                    if (text.length > maxLength && text.length > 5) {
                        // Make sure it's not the user's own message
                        const isUserMessage = lastEl.closest('[class*="user"]') ||
                            lastEl.closest('[data-role="user"]');
                        if (!isUserMessage) {
                            maxLength = text.length;
                            bestContent = text;
                            console.log('[AI Panel] Qwen found via selector:', selector, 'len:', text.length);
                        }
                    }
                }
            } catch (e) {
                // Ignore selector errors
            }
        }

        if (bestContent && bestContent.length > 10) {
            return bestContent;
        }

        // Strategy 2: FALLBACK - Find the largest text block in the main area
        // This is aggressive but should catch any response
        console.log('[AI Panel] Qwen using fallback DOM scan...');

        const mainArea = document.querySelector('main') ||
            document.querySelector('[class*="chat"]') ||
            document.querySelector('[class*="conversation"]') ||
            document.body;

        // Find all divs with substantial text
        const allDivs = mainArea.querySelectorAll('div');
        let longestText = '';
        let longestDiv = null;

        for (const div of allDivs) {
            // Skip tiny divs, input areas, and navigation
            if (div.offsetHeight < 20) continue;
            if (div.querySelector('textarea') || div.querySelector('input')) continue;
            if (div.closest('nav') || div.closest('header') || div.closest('footer')) continue;

            const text = div.innerText?.trim() || '';

            // Skip if this is clearly a user message (short, matches input)
            if (text.length < 20) continue;

            // Prefer divs that contain markdown-like content or longer text
            if (text.length > longestText.length) {
                // Make sure this div doesn't contain the input area
                const hasInput = div.querySelector('textarea, [contenteditable]');
                if (!hasInput) {
                    longestText = text;
                    longestDiv = div;
                }
            }
        }

        // Strategy 2: FALLBACK
        // ...

        if (longestText.length > 20) {
            updateDebug(`Fallback Found: ${longestText.length} chars`);
            console.log('[AI Panel] Qwen fallback found text, len:', longestText.length);
            return longestText;
        }

        updateDebug('No content found (scanning...)');
        console.log('[AI Panel] Qwen could not find any response');
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
        window.location.href = 'https://chat.qwen.ai/';
        return true;
    }

    console.log('[AI Panel] Qwen content script loaded');
})();
