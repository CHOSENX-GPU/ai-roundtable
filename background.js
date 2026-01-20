// AI Panel - Background Service Worker

// URL patterns for each AI
const AI_URL_PATTERNS = {
  claude: ['claude.ai'],
  chatgpt: ['chat.openai.com', 'chatgpt.com'],
  gemini: ['gemini.google.com'],
  deepseek: ['chat.deepseek.com'],
  qwen: ['chat.qwen.ai', 'www.qianwen.com', 'qianwen.com'],
  kimi: ['www.kimi.com', 'kimi.com'],
  doubao: ['www.doubao.com', 'doubao.com', 'bot.doubao.com', 'chat.doubao.com'],
  chatglm: ['chatglm.cn']
};

// Store latest responses using chrome.storage.session (persists across service worker restarts)
async function getStoredResponses() {
  const result = await chrome.storage.session.get('latestResponses');
  return result.latestResponses || { claude: null, chatgpt: null, gemini: null, deepseek: null, qwen: null, kimi: null, doubao: null, chatglm: null };
}

async function setStoredResponse(aiType, content) {
  const responses = await getStoredResponses();
  responses[aiType] = content;
  await chrome.storage.session.set({ latestResponses: responses });
}

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Set side panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Listen for messages from side panel and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case 'SEND_MESSAGE':
      return await sendMessageToAI(message.aiType, message.message);

    case 'GET_RESPONSE':
      // Query content script directly for real-time response (not from storage)
      return await getResponseFromContentScript(message.aiType);

    case 'RESPONSE_CAPTURED':
      // Content script captured a response
      await setStoredResponse(message.aiType, message.content);
      // Forward to side panel (include content for discussion mode)
      notifySidePanel('RESPONSE_CAPTURED', { aiType: message.aiType, content: message.content });
      return { success: true };

    case 'CONTENT_SCRIPT_READY':
      // Content script loaded and ready
      const aiType = getAITypeFromUrl(sender.tab?.url);
      if (aiType) {
        notifySidePanel('TAB_STATUS_UPDATE', { aiType, connected: true });
      }
      return { success: true };

    case 'NEW_CONVERSATION':
      // Start a new conversation for selected AIs
      return await startNewConversation(message.aiTypes);

    default:
      return { error: 'Unknown message type' };
  }
}

async function getResponseFromContentScript(aiType) {
  try {
    const tab = await findAITab(aiType);
    if (!tab) {
      // Fallback to stored response if tab not found
      const responses = await getStoredResponses();
      return { content: responses[aiType] };
    }

    // Query content script for real-time DOM content
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'GET_LATEST_RESPONSE'
    });

    return { content: response?.content || null };
  } catch (err) {
    // Fallback to stored response on error
    console.log('[AI Panel] Failed to get response from content script:', err.message);
    const responses = await getStoredResponses();
    return { content: responses[aiType] };
  }
}

// Reload content script if it's dead
async function ensureContentScriptAlive(aiType, tab) {
  try {
    // Try to ping the tab
    await chrome.tabs.sendMessage(tab.id, { type: 'PING' }, { timeoutMs: 2000 });
    return true;  // Content script is alive
  } catch (err) {
    console.log('[AI Panel] Content script dead for', aiType, ', reloading...');
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: [`content/${aiType}.js`]
      });
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('[AI Panel] Content script reloaded for', aiType);
      return true;
    } catch (reloadErr) {
      console.log('[AI Panel] Failed to reload content script:', reloadErr.message);
      return false;
    }
  }
}

async function sendMessageToAI(aiType, message, retryCount = 0) {
  const maxRetries = 4; // Increased from 2 to 4

  try {
    // Find the tab for this AI
    const tab = await findAITab(aiType);

    if (!tab) {
      return { success: false, error: `No ${aiType} tab found` };
    }

    // Ensure content script is alive
    const isAlive = await ensureContentScriptAlive(aiType, tab);
    if (!isAlive) {
      return { success: false, error: `Failed to connect to ${aiType}` };
    }

    // Send message to content script with timeout
    const response = await Promise.race([
      chrome.tabs.sendMessage(tab.id, {
        type: 'INJECT_MESSAGE',
        message
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout after 10s')), 10000)
      )
    ]);

    // Notify side panel
    notifySidePanel('SEND_RESULT', {
      aiType,
      success: response?.success,
      error: response?.error
    });

    return response;
  } catch (err) {
    console.log('[AI Panel] Send error for', aiType, ':', err.message);

    // Retry if connection error and haven't exceeded max retries
    if (retryCount < maxRetries && err.message.includes('Receiving end does not exist')) {
      const waitTime = Math.min(1000 * Math.pow(2, retryCount), 3000); // Exponential backoff
      console.log('[AI Panel] Retrying send to', aiType, `attempt ${retryCount + 1}, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return sendMessageToAI(aiType, message, retryCount + 1);
    }

    return { success: false, error: err.message };
  }
}

async function findAITab(aiType) {
  const patterns = AI_URL_PATTERNS[aiType];
  if (!patterns) {
    console.log('[AI Panel] No patterns found for aiType:', aiType);
    return null;
  }

  console.log('[AI Panel] Looking for', aiType, 'with patterns:', patterns);

  const tabs = await chrome.tabs.query({});
  console.log('[AI Panel] Found', tabs.length, 'tabs');

  for (const tab of tabs) {
    console.log('[AI Panel] Checking tab:', tab.id, 'URL:', tab.url);
    if (tab.url && patterns.some(p => tab.url.includes(p))) {
      console.log('[AI Panel] Found matching tab for', aiType, ':', tab.id);
      return tab;
    }
  }

  console.log('[AI Panel] No matching tab found for', aiType);
  return null;
}

function getAITypeFromUrl(url) {
  if (!url) return null;
  for (const [aiType, patterns] of Object.entries(AI_URL_PATTERNS)) {
    if (patterns.some(p => url.includes(p))) {
      return aiType;
    }
  }
  return null;
}

async function notifySidePanel(type, data) {
  try {
    await chrome.runtime.sendMessage({ type, ...data });
  } catch (err) {
    // Side panel might not be open, ignore
  }
}

// Track tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const aiType = getAITypeFromUrl(tab.url);
    if (aiType) {
      notifySidePanel('TAB_STATUS_UPDATE', { aiType, connected: true });
    }
  }
});

// Track tab closures
chrome.tabs.onRemoved.addListener((tabId) => {
  // We'd need to track which tabs were AI tabs to notify properly
  // For now, side panel will re-check on next action
});

// Heartbeat mechanism to keep content scripts alive
setInterval(async () => {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.url) {
        const aiType = getAITypeFromUrl(tab.url);
        if (aiType) {
          // Send a lightweight heartbeat to keep the connection alive
          chrome.tabs.sendMessage(tab.id, { type: 'HEARTBEAT' }).catch(() => {
            // Silently fail - tab might be closed or content script not loaded
            console.log('[AI Panel] Heartbeat failed for', aiType, 'tab', tab.id);
          });
        }
      }
    }
  } catch (err) {
    // Ignore errors during heartbeat
  }
}, 10000); // Send heartbeat every 10 seconds

// Start new conversation for selected AIs
async function startNewConversation(aiTypes) {
  const results = {};

  for (const aiType of aiTypes) {
    try {
      const tab = await findAITab(aiType);
      if (!tab) {
        results[aiType] = { success: false, error: `No ${aiType} tab found` };
        continue;
      }

      // Send NEW_CONVERSATION message to content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'NEW_CONVERSATION'
      });

      results[aiType] = response || { success: true };
    } catch (err) {
      console.log('[AI Panel] New conversation error for', aiType, ':', err.message);
      results[aiType] = { success: false, error: err.message };
    }
  }

  // Notify side panel of results
  notifySidePanel('NEW_CONVERSATION_RESULTS', { results });

  return { success: true, results };
}
