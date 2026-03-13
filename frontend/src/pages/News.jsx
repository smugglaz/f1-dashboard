import { useState, useEffect } from 'react'
import { useApiQuery } from '../hooks/useApiQuery'
import NewsCard from '../components/NewsCard'

import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Newspaper } from 'lucide-react'

const SOURCES = ['All', 'formula1.com', 'autosport.com', 'motorsport.com']

export default function News() {
  const [source, setSource] = useState('')
  const [page, setPage] = useState(1)

  const endpoint = `/api/news?page=${page}&limit=20${source ? `&source=${source}` : ''}`
  const { data, loading, error, refetch } = useApiQuery(endpoint, { refetchInterval: 60_000 })

  useEffect(() => { setPage(1) }, [source])

  const articles = data?.articles || data || []
  const total = data?.total ?? null

  return (
    <div className="space-y-6">
      <PageHeader
        title="F1 News"
        subtitle={total != null ? `${total} articles` : undefined}
      >
        <Tabs value={source || 'All'} onValueChange={v => setSource(v === 'All' ? '' : v)}>
          <TabsList>
            {SOURCES.map(s => (
              <TabsTrigger key={s} value={s}>{s}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </PageHeader>

      {loading && page === 1 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-40 w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={Newspaper}
          title="Unable to load news"
          description={error}
          action="Retry"
          onAction={refetch}
        />
      ) : articles.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="No Articles Yet"
          description={source
            ? `No articles from ${source}. Try a different source.`
            : 'News articles will appear after the background fetch completes.'
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map((article, i) => (
              <NewsCard key={article.url || i} article={article} />
            ))}
          </div>

          <div className="flex justify-center items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="px-4 py-2 text-sm text-label-tertiary font-mono">
              Page {page}
              {total != null && ` of ${Math.ceil(total / 20)}`}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={articles.length < 20}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
