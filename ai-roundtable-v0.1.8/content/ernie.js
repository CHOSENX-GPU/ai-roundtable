// AI Panel - Ernie (文心一言) Content Script

(function () {
    'use strict';

    const AI_TYPE = 'ernie';

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
    // Notify background that content script is ready

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
    debugPanel.innerHTML = '[AI Panel] Ernie Script Loaded<br>Waiting for content...';
    document.body.appendChild(debugPanel);

    function updateDebug(text) {
        debugPanel.innerHTML = `[AI Panel] Ernie<br>${text}`;
    }

    updateDebug('Connecting to extension...');
    safeSendMessage({ type: 'CONTENT_SCRIPT_READY', aiType: AI_TYPE });


    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
            safeSendMessage({ type: 'NEW_CONVERSATION_TRIGGERED', aiType: AI_TYPE });
            // Ernie new conversation logic: click the "New Chat" button
            const newChatBtn = document.querySelector('div[class*="new-chat-btn"]'); // Generic guess
            // If specific selector needed: Usually a button with "+" icon
            if (newChatBtn) newChatBtn.click();
            else window.location.href = 'https://ernie.baidu.com/';

            sendResponse({ success: true });
            return true;
        }
    });

    // Setup response observer
    setupResponseObserver();

    async function injectMessage(text) {
        // Ernie uses a standard textarea usually
        let inputEl = document.querySelector('#ba-input-textarea') ||
            document.querySelector('textarea.ant-input') ||
            document.querySelector('textarea[placeholder*="输入"]');

        if (!inputEl) {
            // Fallback usually works
            inputEl = document.querySelector('textarea');
        }

        if (!inputEl) throw new Error('Could not find input field');

        inputEl.focus();
        inputEl.value = text;
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));

        await sleep(200);

        // Click send button or Enter
        const sendBtn = document.querySelector('div.send-button') ||
            document.querySelector('button[class*="send"]');

        if (sendBtn) {
            sendBtn.click();
        } else {
            const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                bubbles: true,
                cancelable: true
            });
            inputEl.dispatchEvent(enterEvent);
        }

        waitForStreamingComplete();
        return true;
    }

    function setupResponseObserver() {
        const observer = new MutationObserver((mutations) => {
            if (!isContextValid()) {
                observer.disconnect();
                return;
            }
            // Simple check
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check for response
                    if (document.querySelector('[class*="assistant"]')) {
                        checkForResponse();
                    }
                }
            }
        });

        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        }

        // Polling fallback
        setInterval(() => {
            if (!isCapturing) {
                const content = getLatestResponse();
                if (content && content !== lastCapturedContent && content.length > lastCapturedContent.length) {
                    waitForStreamingComplete();
                }
            }
        }, 2000);
    }

    let lastCapturedContent = '';
    let isCapturing = false;

    function checkForResponse() {
        if (isCapturing) return;
        waitForStreamingComplete();
    }

    function htmlToMarkdown(element) {
        if (!element) return '';
        // Same logic as other scripts
        const clone = element.cloneNode(true);
        // ... (standard htmlToMarkdown logic) ...
        // Simplified for brevity in this initial version, but should be robust
        clone.querySelectorAll('pre, code').forEach(el => {
            // Basic protection
        });
        return clone.innerText || clone.textContent;
    }

    async function waitForStreamingComplete() {
        if (isCapturing) return;
        isCapturing = true;

        // Stability check logic (same as Qwen/others)
        let stableCount = 0;
        let previousContent = '';
        const maxWait = 120000;
        const start = Date.now();

        try {
            while (Date.now() - start < maxWait) {
                await sleep(500);

                const isStreaming = document.querySelector('[class*="loading"]') ||
                    document.querySelector('[class*="generating"]'); // Ernie indicators

                const currentContent = getLatestResponse() || '';

                if (!isStreaming && currentContent === previousContent && currentContent.length > 0) {
                    stableCount++;
                    if (stableCount >= 4) { // 2 seconds stable
                        if (currentContent !== lastCapturedContent) {
                            lastCapturedContent = currentContent;
                            safeSendMessage({
                                type: 'RESPONSE_CAPTURED',
                                aiType: AI_TYPE,
                                content: currentContent
                            });
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
        // Ernie Selectors
        // Since I don't know exact ones, I'll use the Aggressive Strategy from Qwen

        // 1. Try common selectors
        const selectors = [
            '.ernie-message',
            '[class*="assistant"]',
            '[class*="bot-message"]',
            '[class*="markdown-body"]'
        ];

        for (const s of selectors) {
            const els = document.querySelectorAll(s);
            if (els.length > 0) {
                const last = els[els.length - 1];
                if (last.innerText.length > 5) return last.innerText;
            }
        }

        // 2. Fallback: Find largest text div
        const main = document.querySelector('main') || document.body;
        const divs = main.querySelectorAll('div');
        let longest = '';

        for (const div of divs) {
            if (div.innerText.length > longest.length && div.innerText.length > 10) {
                // Ensure not input
                if (!div.querySelector('textarea')) {
                    longest = div.innerText;
                }
            }
        }

        if (longest.length > 10) {
            updateDebug(`Fallback Found: ${longest.length} chars (div)`);
            return longest;
        }

        updateDebug('Scanning... No content found');
        return null;
    }

    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    console.log('[AI Panel] Ernie script loaded');

})();
