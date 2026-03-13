import { cn } from '@/lib/utils'

function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-2xl glass text-[var(--card-foreground)]',
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 p-5 pb-3', className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }) {
  return (
    <h3
      className={cn('text-footnote font-medium tracking-tight text-label-secondary', className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }) {
  return (
    <p
      className={cn('text-caption-1 text-label-tertiary', className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }) {
  return (
    <div className={cn('px-5 pb-5 pt-0', className)} {...props} />
  )
}

function CardFooter({ className, ...props }) {
  return (
    <div
      className={cn('flex items-center px-5 pb-5 pt-0', className)}
      {...props}
    />
  )
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
