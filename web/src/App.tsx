import { useState, useEffect, useCallback, useRef } from 'react'
import { Sidebar } from './components/Sidebar'
import { AiGrid } from './components/AiGrid'
import { InputBar } from './components/InputBar'
import { LogPanel } from './components/LogPanel'
import { PairingDialog } from './components/PairingDialog'
import { DiscussionMode } from './components/DiscussionMode'
import { QuickLinks } from './components/QuickLinks'
import { HelpDialog, HelpButton } from './components/HelpDialog'
import { useBridge } from './hooks/useBridge'
import { useAiStatus } from './hooks/useAiStatus'
import { AI_TYPES, AI_DISPLAY_NAMES } from './lib/constants'
import { normalizeAiName } from './lib/utils'
import type { LogEntry, AiType, Mode, Conversations, Message } from './lib/types'

const createEmptyConversations = (): Conversations => {
  const convs: Partial<Conversations> = {}
  for (const ai of AI_TYPES) {
    convs[ai] = []
  }
  return convs as Conversations
}

function App() {
  const [mode, setMode] = useState<Mode>('normal')
  const [selectedAis, setSelectedAis] = useState<Set<AiType>>(new Set(['claude', 'chatgpt']))
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [conversations, setConversations] = useState<Conversations>(createEmptyConversations())
  const conversationsRef = useRef(conversations)

  // 保持 ref 同步以便在回调中访问最新状态
  useEffect(() => {
    conversationsRef.current = conversations
  }, [conversations])
  const [showHelp, setShowHelp] = useState(false)
  const [showPairing, setShowPairing] = useState(false)

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      message,
      type,
    }
    setLogs(prev => [entry, ...prev].slice(0, 100))
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  const addUserMessage = useCallback((aiType: AiType, content: string) => {
    const msg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    }
    setConversations(prev => ({
      ...prev,
      [aiType]: [...prev[aiType], msg],
    }))
  }, [])

  const clearConversations = useCallback((aiTypes: AiType[]) => {
    setConversations(prev => {
      const next = { ...prev }
      for (const ai of aiTypes) {
        next[ai] = []
      }
      return next
    })
  }, [])

  const {
    isConnected,
    isPaired,
    pairingCode,
    connect,
    disconnect,
    requestPairingCode,
    confirmPairing,
    sendMessage,
    getResponse,
    getStatus,
    newConversation,
  } = useBridge({
    onStatusUpdate: (aiType, connected) => {
      updateStatus(aiType, connected)
      addLog(`${aiType}: ${connected ? '已连接' : '已断开'}`, connected ? 'success' : 'info')
    },
    onResponseCaptured: (aiType, content) => {
      setConversations(prev => {
        const msgs = prev[aiType] || []
        const lastMsg = msgs[msgs.length - 1]

        // 原子检查：如果最后一条是 assistant 且在 60 秒内，则更新
        if (lastMsg?.role === 'assistant' &&
          (Date.now() - new Date(lastMsg.timestamp).getTime() < 60000)) {
          // 如果内容未变，不触发更新
          if (lastMsg.content === content) return prev

          const newMsgs = [...msgs]
          newMsgs[newMsgs.length - 1] = {
            ...lastMsg,
            content
          }
          return {
            ...prev,
            [aiType]: newMsgs
          }
        }

        // 否则添加新消息
        const newMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content,
          timestamp: new Date()
        }

        // 仅在添加新消息时记录日志（避免刷屏）
        // 注意：这里是副作用，但在 state updater 中执行副作用不推荐，但为了简便且仅是 UI log，尚可接受
        // 或者移到外部，但外部拿不到准确的判断结果
        // 暂且移除 "收到回复" 的高频日志，只在连接/发送时记录

        return {
          ...prev,
          [aiType]: [...msgs, newMsg]
        }
      })
    },
    onSendResult: (aiType, success, error) => {
      if (success) {
        addLog(`${aiType}: 消息已发送`, 'success')
      } else {
        addLog(`${aiType}: 发送失败 - ${error}`, 'error')
      }
    },
    onError: (error) => {
      addLog(`连接错误: ${error}`, 'error')
    },
  })

  const { statuses, updateStatus, replaceStatuses } = useAiStatus()

  useEffect(() => {
    if (!isPaired) {
      setShowPairing(true)
      return
    }

    let active = true

    const syncStatuses = async () => {
      const connected = isConnected || await connect()
      if (!connected) {
        return
      }
      const result = await getStatus()
      if (active && result) {
        replaceStatuses(result)
      }
    }

    syncStatuses()
    setShowPairing(false)

    return () => {
      active = false
    }
  }, [isPaired, isConnected, connect, getStatus, replaceStatuses])

  const handleSend = useCallback(async (message: string, mentionedAis?: AiType[]) => {
    if (!isPaired) {
      addLog('请先完成配对', 'error')
      setShowPairing(true)
      return
    }

    let targets: AiType[] = []

    if (mentionedAis && mentionedAis.length > 0) {
      targets = mentionedAis.filter(ai => statuses[ai])
      if (targets.length === 0) {
        addLog('@ 提及的 AI 都未连接', 'error')
        return
      }
    } else {
      targets = Array.from(selectedAis).filter(ai => statuses[ai])
      if (targets.length === 0) {
        addLog('没有可用的目标 AI', 'error')
        return
      }
    }

    addLog(`发送消息到: ${targets.join(', ')}`, 'info')

    // Context Injection Logic
    let finalMessage = message

    // 1. Identify references (mentions that are NOT targets)
    // Actually simplicity: checking mentions in the message body that are valid AI names
    const allMentions = (message.match(/@(\w+)/gi) || [])
      .map(m => normalizeAiName(m.slice(1)))
      .filter(name => AI_TYPES.includes(name as AiType))

    const references = [...new Set(allMentions.filter(ai => !targets.includes(ai as AiType)))] as AiType[]

    if (references.length > 0) {
      addLog(`检测到引用: ${references.join(', ')}`, 'info')
      const contextParts: string[] = []

      for (const refAi of references) {
        const refMsgs = conversationsRef.current[refAi] || []
        // Find last assistant message
        const lastResponse = [...refMsgs].reverse().find(m => m.role === 'assistant')

        if (lastResponse) {
          contextParts.push(`【@${AI_DISPLAY_NAMES[refAi] || refAi} 的回复】\n${lastResponse.content}`)
        } else {
          // Optionally try to fetch via bridge if not in history? 
          // But conversations should be up to date.
          const resp = await getResponse(refAi)
          if (resp) {
            contextParts.push(`【@${AI_DISPLAY_NAMES[refAi] || refAi} 的回复】\n${resp}`)
          }
        }
      }

      if (contextParts.length > 0) {
        finalMessage = `${contextParts.join('\n\n')}\n\n${message}`
      }
    }

    for (const ai of targets) {
      // User sees original message in their chat history
      addUserMessage(ai, message)
      // AI receives message with injected context
      await sendMessage(ai, finalMessage)
    }
  }, [isPaired, selectedAis, statuses, sendMessage, addLog, addUserMessage, getResponse])

  const handleMutual = useCallback(async (prompt?: string) => {
    if (!isPaired) {
      addLog('请先完成配对', 'error')
      setShowPairing(true)
      return
    }

    const targets = Array.from(selectedAis).filter(ai => statuses[ai])
    if (targets.length < 2) {
      addLog('互评需要至少 2 个已连接的 AI', 'error')
      return
    }

    addLog(`开始互评: ${targets.join(' vs ')}`, 'info')

    const currentResponses: Record<string, string> = {}
    for (const ai of targets) {
      const resp = await getResponse(ai)
      if (resp) {
        currentResponses[ai] = resp
      }
    }

    for (const targetAi of targets) {
      const othersContent = targets
        .filter(ai => ai !== targetAi && currentResponses[ai])
        .map(ai => `【${ai.toUpperCase()} 的回复】\n${currentResponses[ai]}`)
        .join('\n\n')

      if (othersContent) {
        const mutualPrompt = prompt
          ? `请${prompt}：\n\n${othersContent}`
          : `请评价以下其他 AI 的回复：\n\n${othersContent}`
        addUserMessage(targetAi, mutualPrompt)
        await sendMessage(targetAi, mutualPrompt)
      }
    }
  }, [isPaired, selectedAis, statuses, getResponse, sendMessage, addLog, addUserMessage])

  const handleCross = useCallback(async (targetAis: AiType[], sourceAi: AiType, prompt: string) => {
    if (!isPaired) {
      addLog('请先完成配对', 'error')
      setShowPairing(true)
      return
    }

    const sourceResponse = await getResponse(sourceAi)
    if (!sourceResponse) {
      addLog(`无法获取 ${sourceAi} 的回复`, 'error')
      return
    }

    const crossPrompt = `【${sourceAi.toUpperCase()} 的回复】\n${sourceResponse}\n\n${prompt}`

    for (const target of targetAis) {
      if (statuses[target]) {
        addUserMessage(target, crossPrompt)
        await sendMessage(target, crossPrompt)
      }
    }
  }, [isPaired, statuses, getResponse, sendMessage, addLog, addUserMessage])

  const handleNewConversation = useCallback(async () => {
    if (!isPaired) {
      addLog('请先完成配对', 'error')
      setShowPairing(true)
      return
    }

    const targets = Array.from(selectedAis).filter(ai => statuses[ai])
    if (targets.length === 0) {
      addLog('没有可用的目标 AI', 'error')
      return
    }

    addLog(`为 ${targets.join(', ')} 开启新对话`, 'info')
    clearConversations(targets)
    await newConversation(targets)
  }, [isPaired, selectedAis, statuses, newConversation, addLog, clearConversations])

  const handleToggleAi = useCallback((ai: AiType) => {
    setSelectedAis(prev => {
      const next = new Set(prev)
      if (next.has(ai)) {
        next.delete(ai)
      } else {
        next.add(ai)
      }
      return next
    })
  }, [])

  return (
    <div className="flex h-screen bg-[#fafafa]">
      <Sidebar
        statuses={statuses}
        selectedAis={selectedAis}
        onToggleAi={handleToggleAi}
        isConnected={isConnected}
        isPaired={isPaired}
      />

      <main className="flex-1 flex flex-col min-w-0 p-4 gap-4">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900">AI 圆桌</h1>
            <HelpButton onClick={() => setShowHelp(true)} />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPairing(true)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${isPaired
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isPaired ? 'bg-green-500' : 'bg-amber-500'}`} />
              {isPaired ? '已配对' : '配对扩展'}
            </button>
            <div className="w-px h-5 bg-slate-200" />
            <button
              onClick={() => setMode('normal')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${mode === 'normal'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
            >
              普通
            </button>
            <button
              onClick={() => setMode('discussion')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${mode === 'discussion'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
            >
              讨论
            </button>
          </div>
        </header>

        {mode === 'normal' ? (
          <>
            <AiGrid
              statuses={statuses}
              selectedAis={selectedAis}
              conversations={conversations}
            />
            <InputBar
              onSend={handleSend}
              onMutual={handleMutual}
              onCross={handleCross}
              onNewConversation={handleNewConversation}
              selectedAis={selectedAis}
              statuses={statuses}
              disabled={!isPaired}
            />
          </>
        ) : (
          <DiscussionMode
            statuses={statuses}
            isPaired={isPaired}
            sendMessage={sendMessage}
            getResponse={getResponse}
            addLog={addLog}
          />
        )}
      </main>

      <aside className="w-64 border-l border-slate-200 bg-white flex flex-col">
        <QuickLinks statuses={statuses} />
        <LogPanel logs={logs} onClear={clearLogs} />
      </aside>

      {
        showPairing && (
          <PairingDialog
            isConnected={isConnected}
            pairingCode={pairingCode}
            onConnect={connect}
            onDisconnect={disconnect}
            onRequestCode={requestPairingCode}
            onConfirm={confirmPairing}
            onClose={() => setShowPairing(false)}
            isPaired={isPaired}
          />
        )
      }

      <HelpDialog isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div >
  )
}

export default App
