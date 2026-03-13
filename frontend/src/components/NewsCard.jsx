import { ExternalLink } from 'lucide-react'
import { timeAgo, estimateReadingTime } from '../utils/format'

const SOURCE_COLORS = {
  'formula1.com': 'bg-amber-500/15 text-amber-700',
  'autosport.com': 'bg-blue-500/20 text-blue-400',
  'motorsport.com': 'bg-green-500/20 text-green-400',
}

export default function NewsCard({ article }) {
  const sourceClass = SOURCE_COLORS[article.source] || 'bg-gray-500/20 text-gray-400'
  const readTime = estimateReadingTime(article.summary)

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block glass rounded-2xl hover:border-glass-highlight transition-all hover:-translate-y-0.5 group"
    >
      {article.image_url ? (
        <div className="aspect-video overflow-hidden rounded-t-lg">
          <img
            src={article.image_url}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={e => { e.target.style.display = 'none' }}
          />
        </div>
      ) : (
        <div className="aspect-video rounded-t-2xl bg-gradient-to-br from-f1-red/10 to-transparent flex items-center justify-center">
          <span className="text-amber-700/40 text-4xl font-bold">F1</span>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${sourceClass}`}>
            {article.source}
          </span>
          <span className="text-xs text-label-tertiary">
            {article.published ? timeAgo(article.published) : ''}
          </span>
          <span className="text-xs text-label-tertiary ml-auto">{readTime}</span>
        </div>
        <h3 className="font-semibold text-sm group-hover:text-amber-700 transition-colors line-clamp-2">
          {article.title}
        </h3>
        {article.summary && (
          <p className="text-label-secondary text-xs mt-2 line-clamp-3">{article.summary}</p>
        )}
        <div className="flex items-center gap-1 text-label-tertiary text-xs mt-3">
          <ExternalLink className="w-3 h-3" />
          Read article
        </div>
      </div>
    </a>
  )
}
