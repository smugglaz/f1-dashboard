import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import NewsCard from '../components/NewsCard'
import LoadingSpinner from '../components/LoadingSpinner'

const SOURCES = ['All', 'formula1.com', 'autosport.com', 'motorsport.com']

export default function News() {
  const [source, setSource] = useState('')
  const [page, setPage] = useState(1)

  const endpoint = `/api/news?page=${page}&limit=20${source ? `&source=${source}` : ''}`
  const { data, loading, error, refetch } = useApi(endpoint)

  useEffect(() => { setPage(1) }, [source])

  useEffect(() => {
    const id = setInterval(refetch, 60000)
    return () => clearInterval(id)
  }, [refetch])

  const articles = data?.articles || data || []
  const total = data?.total ?? null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">F1 News</h1>
          {total != null && (
            <span className="text-f1-muted text-xs font-mono">{total} articles</span>
          )}
        </div>
        <div className="flex gap-1 bg-f1-card rounded-lg p-1 border border-f1-border">
          {SOURCES.map(s => (
            <button
              key={s}
              onClick={() => setSource(s === 'All' ? '' : s)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                (s === 'All' && !source) || s === source
                  ? 'bg-f1-red text-white'
                  : 'text-f1-muted hover:text-f1-text'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading && page === 1 ? <LoadingSpinner /> : error ? (
        <div className="bg-f1-card rounded-lg p-12 border border-f1-border text-center">
          <div className="text-xl font-semibold mb-2">Unable to load news</div>
          <div className="text-f1-muted">{error}</div>
          <button
            onClick={refetch}
            className="mt-4 px-4 py-2 bg-f1-red text-white rounded hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      ) : articles.length === 0 ? (
        <div className="bg-f1-card rounded-lg p-12 border border-f1-border text-center">
          <div className="text-4xl mb-4">📰</div>
          <div className="text-xl font-semibold mb-2">No Articles Yet</div>
          <div className="text-f1-muted">
            {source
              ? `No articles from ${source}. Try a different source.`
              : 'News articles will appear after the background fetch completes.'
            }
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map((article, i) => (
              <NewsCard key={article.url || i} article={article} />
            ))}
          </div>

          <div className="flex justify-center items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm bg-f1-card border border-f1-border rounded disabled:opacity-30 hover:bg-white/5"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-f1-muted font-mono">
              Page {page}
              {total != null && ` of ${Math.ceil(total / 20)}`}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={articles.length < 20}
              className="px-4 py-2 text-sm bg-f1-card border border-f1-border rounded disabled:opacity-30 hover:bg-white/5"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}
