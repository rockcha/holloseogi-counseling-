import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageHeading({ emoji, children, as: Tag = 'h1', className }: {
  emoji: string;
  children: ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
}) {
  return <Tag className={cn('flex min-w-0 items-center gap-3 text-xl font-bold leading-snug tracking-tight text-[#17283f] sm:text-2xl', className)}>
    <span aria-hidden="true" className="shrink-0 text-[1em] leading-none">{emoji}</span>
    <span className="min-w-0 break-words">{children}</span>
  </Tag>;
}
