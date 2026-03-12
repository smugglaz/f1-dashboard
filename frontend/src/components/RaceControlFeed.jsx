import { timeAgo } from '../utils/format'

const FLAG_STYLES = {
  RED: { bg: 'bg-red-500/20', border: 'border-l-red-500', text: 'text-red-400 font-bold' },
  'SAFETY CAR': { bg: 'bg-yellow-500/15', border: 'border-l-yellow-500', text: 'text-yellow-300' },
  VSC: { bg: 'bg-yellow-500/10', border: 'border-l-yellow-400', text: 'text-yellow-300' },
  YELLOW: { bg: '', border: 'border-l-yellow-400', text: 'text-yellow-400' },
  GREEN: { bg: '', border: 'border-l-green-400', text: 'text-green-400' },
  BLUE: { bg: '', border: 'border-l-blue-400', text: 'text-blue-400' },
  CHEQUERED: { bg: 'bg-white/5', border: 'border-l-white', text: 'text-white font-bold' },
  BLACK: { bg: '', border: 'border-l-gray-500', text: 'text-gray-400' },
  'BLACK AND WHITE': { bg: '', border: 'border-l-gray-300', text: 'text-gray-300' },
  'BLACK AND ORANGE': { bg: '', border: 'border-l-orange-400', text: 'text-orange-400' },
}

const DEFAULT_STYLE = { bg: '', border: 'border-l-transparent', text: 'text-f1-text' }

export default function RaceControlFeed({ messages = [] }) {
  if (!messages.length) return <div className="text-f1-muted text-sm text-center py-4">No race control messages</div>

  return (
    <div className="space-y-0.5 max-h-64 overflow-y-auto">
      {[...messages].reverse().map((msg, i) => {
        const style = FLAG_STYLES[msg.flag] || FLAG_STYLES[msg.category] || DEFAULT_STYLE
        const isHighPriority = msg.flag === 'RED' || msg.flag === 'SAFETY CAR' || msg.flag === 'VSC'

        return (
          <div
            key={i}
            className={`flex gap-2 text-sm py-1.5 px-2 border-l-2 rounded-r-sm ${style.bg} ${style.border} ${i === 0 ? 'animate-fade-in' : ''}`}
          >
            <span className="text-f1-muted text-[10px] font-mono whitespace-nowrap shrink-0">
              {msg.date ? timeAgo(msg.date) : ''}
            </span>
            <span className={`${style.text} ${isHighPriority ? 'text-xs' : 'text-xs'}`}>
              {msg.flag && <span className="font-bold mr-1">[{msg.flag}]</span>}
              {msg.message}
            </span>
          </div>
        )
      })}
    </div>
  )
}
