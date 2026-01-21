import { useState, useCallback } from 'react'
import { clsx } from 'clsx'
import { AiLogo } from './AiLogo'
import { AI_GROUPS, AI_DISPLAY_NAMES } from '../lib/constants'
import type { AiType, AiStatuses, DiscussionState } from '../lib/types'

interface DiscussionModeProps {
  statuses: AiStatuses
  isPaired: boolean
  sendMessage: (aiType: AiType, message: string) => Promise<{ success: boolean; error?: string }>
  getResponse: (aiType: AiType) => Promise<string | null>
  addLog: (message: string, type?: 'info' | 'success' | 'error' | 'warning') => void
}

const initialState: DiscussionState = {
  active: false,
  topic: '',
  participants: null,
  currentRound: 0,
  history: [],
  pendingResponses: new Set(),
  roundType: null,
}

export function DiscussionMode({
  statuses,
  isPaired,
  sendMessage,
  getResponse,
  addLog,
}: DiscussionModeProps) {
  const [state, setState] = useState<DiscussionState>(initialState)
  const [topic, setTopic] = useState('')
  const [selectedParticipants, setSelectedParticipants] = useState<Set<AiType>>(new Set())
  const [interjectMessage, setInterjectMessage] = useState('')

  const allAis = [...AI_GROUPS['US-AI'], ...AI_GROUPS['CN-AI']]
  const connectedAis = allAis.filter(ai => statuses[ai])

  const toggleParticipant = useCallback((ai: AiType) => {
    setSelectedParticipants(prev => {
      const next = new Set(prev)
      if (next.has(ai)) {
        next.delete(ai)
      } else if (next.size < 2) {
        next.add(ai)
      }
      return next
    })
  }, [])

  const startDiscussion = useCallback(async () => {
    if (!isPaired) {
      addLog('请先完成配对', 'error')
      return
    }

    if (selectedParticipants.size !== 2) {
      addLog('请选择 2 位参与者', 'error')
      return
    }

    if (!topic.trim()) {
      addLog('请输入讨论主题', 'error')
      return
    }

    const participants = Array.from(selectedParticipants) as [AiType, AiType]
    
    setState({
      active: true,
      topic: topic.trim(),
      participants,
      currentRound: 1,
      history: [],
      pendingResponses: new Set(participants),
      roundType: 'initial',
    })

    addLog(`开始讨论: ${participants.map(p => AI_DISPLAY_NAMES[p]).join(' vs ')}`, 'info')

    const initialPrompt = `请就以下主题发表你的观点：\n\n${topic.trim()}\n\n要求：\n1. 清晰阐述你的立场\n2. 提供支持你观点的论据\n3. 保持开放态度，准备与对方进行深入讨论`

    for (const ai of participants) {
      await sendMessage(ai, initialPrompt)
    }
  }, [isPaired, selectedParticipants, topic, sendMessage, addLog])

  const nextRound = useCallback(async () => {
    if (!state.active || !state.participants) return

    const [ai1, ai2] = state.participants
    const newRound = state.currentRound + 1

    setState(prev => ({
      ...prev,
      currentRound: newRound,
      pendingResponses: new Set(prev.participants!),
      roundType: 'cross-eval',
    }))

    addLog(`进入第 ${newRound} 轮`, 'info')

    const response1 = await getResponse(ai1)
    const response2 = await getResponse(ai2)

    if (response1) {
      const evalPrompt = `【${AI_DISPLAY_NAMES[ai1]} 的观点】\n${response1}\n\n请评价上述观点，指出你认同和不认同的地方，并进一步阐述你的立场。`
      await sendMessage(ai2, evalPrompt)
    }

    if (response2) {
      const evalPrompt = `【${AI_DISPLAY_NAMES[ai2]} 的观点】\n${response2}\n\n请评价上述观点，指出你认同和不认同的地方，并进一步阐述你的立场。`
      await sendMessage(ai1, evalPrompt)
    }
  }, [state, sendMessage, getResponse, addLog])

  const sendInterject = useCallback(async () => {
    if (!state.active || !state.participants || !interjectMessage.trim()) return

    addLog('发送插话给双方', 'info')

    for (const ai of state.participants) {
      await sendMessage(ai, interjectMessage.trim())
    }

    setInterjectMessage('')
  }, [state, interjectMessage, sendMessage, addLog])

  const generateSummary = useCallback(async () => {
    if (!state.active || !state.participants) return

    const [ai1, ai2] = state.participants
    const response1 = await getResponse(ai1)
    const response2 = await getResponse(ai2)

    const summaryPrompt = `请总结以下讨论：\n\n主题：${state.topic}\n\n【${AI_DISPLAY_NAMES[ai1]} 的观点】\n${response1 || '无'}\n\n【${AI_DISPLAY_NAMES[ai2]} 的观点】\n${response2 || '无'}\n\n请提供：\n1. 双方的主要观点\n2. 共识点\n3. 分歧点\n4. 你的综合评价`

    addLog('生成讨论总结', 'info')
    await sendMessage(ai1, summaryPrompt)
  }, [state, sendMessage, getResponse, addLog])

  const endDiscussion = useCallback(() => {
    setState(initialState)
    setTopic('')
    setSelectedParticipants(new Set())
    addLog('讨论已结束', 'info')
  }, [addLog])

  if (!state.active) {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-lg mx-auto space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">开始讨论</h2>
            <p className="text-sm text-slate-500">选择 2 位 AI 参与者，让他们就同一主题进行深度讨论。</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              选择参与者（2 位）
            </label>
            <div className="grid grid-cols-4 gap-2">
              {connectedAis.map(ai => (
                <button
                  key={ai}
                  onClick={() => toggleParticipant(ai)}
                  disabled={!selectedParticipants.has(ai) && selectedParticipants.size >= 2}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
                    selectedParticipants.has(ai)
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <AiLogo aiType={ai} size={18} />
                  <span className="text-sm">{AI_DISPLAY_NAMES[ai]}</span>
                </button>
              ))}
            </div>
            {connectedAis.length < 2 && (
              <p className="mt-2 text-sm text-red-500">需要至少 2 个已连接的 AI</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              讨论主题
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="例如：人工智能会取代人类的工作吗？"
              rows={4}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
            />
          </div>

          <button
            onClick={startDiscussion}
            disabled={!isPaired || selectedParticipants.size !== 2 || !topic.trim()}
            className="w-full py-2.5 px-4 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            开始讨论
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 bg-slate-100 rounded text-sm font-medium text-slate-700">
              第 {state.currentRound} 轮
            </span>
            <span className="text-sm text-slate-500">
              {state.participants?.map(p => AI_DISPLAY_NAMES[p]).join(' vs ')}
            </span>
          </div>
          <button
            onClick={endDiscussion}
            className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            结束
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-600 line-clamp-2">{state.topic}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              插话（同步发送给双方）
            </label>
            <textarea
              value={interjectMessage}
              onChange={(e) => setInterjectMessage(e.target.value)}
              placeholder="输入你想对双方说的话..."
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
            />
            <button
              onClick={sendInterject}
              disabled={!interjectMessage.trim()}
              className="mt-2 px-3 py-1.5 text-sm font-medium text-white bg-slate-900 rounded hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              发送给双方
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-slate-200 bg-white">
        <div className="flex justify-center gap-3">
          <button
            onClick={nextRound}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          >
            下一轮
          </button>
          <button
            onClick={generateSummary}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            生成总结
          </button>
        </div>
      </div>
    </div>
  )
}
