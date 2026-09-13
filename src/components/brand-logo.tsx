import { cn } from '@/lib/utils'

export function BrandLogo({ className, decorative = false }: { className?: string; decorative?: boolean }) {
  return <img src={`${import.meta.env.BASE_URL}holloseogi.png`} alt={decorative ? '' : '홀로서기 로고'} className={cn('brand-logo', className)} decoding="async" />
}
