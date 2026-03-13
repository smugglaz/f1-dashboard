import { cn } from '@/lib/utils'

function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)]',
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 p-4', className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }) {
  return (
    <h3
      className={cn('text-sm font-medium leading-none tracking-tight text-f1-muted uppercase', className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }) {
  return (
    <p
      className={cn('text-sm text-[var(--muted-foreground)]', className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }) {
  return (
    <div className={cn('p-4 pt-0', className)} {...props} />
  )
}

function CardFooter({ className, ...props }) {
  return (
    <div
      className={cn('flex items-center p-4 pt-0', className)}
      {...props}
    />
  )
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
