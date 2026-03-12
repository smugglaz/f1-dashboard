import { ExternalLink } from 'lucide-react'
import { timeAgo, estimateReadingTime } from '../utils/format'

const SOURCE_COLORS = {
  'formula1.com': 'bg-f1-red/20 text-f1-red',
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
      className="block bg-f1-card rounded-lg border border-f1-border hover:border-f1-red/50 transition-all hover:-translate-y-0.5 group"
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
        <div className="aspect-video rounded-t-lg bg-gradient-to-br from-f1-red/20 to-f1-card flex items-center justify-center">
          <span className="text-f1-red/40 text-4xl font-bold">F1</span>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${sourceClass}`}>
            {article.source}
          </span>
          <span className="text-xs text-f1-muted">
            {article.published ? timeAgo(article.published) : ''}
          </span>
          <span className="text-xs text-f1-muted ml-auto">{readTime}</span>
        </div>
        <h3 className="font-semibold text-sm group-hover:text-f1-red transition-colors line-clamp-2">
          {article.title}
        </h3>
        {article.summary && (
          <p className="text-f1-muted text-xs mt-2 line-clamp-3">{article.summary}</p>
        )}
        <div className="flex items-center gap-1 text-f1-muted text-xs mt-3">
          <ExternalLink className="w-3 h-3" />
          Read article
        </div>
      </div>
    </a>
  )
}
