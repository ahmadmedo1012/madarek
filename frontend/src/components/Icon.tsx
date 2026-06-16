import type { LucideIcon, LucideProps } from 'lucide-react';

interface IconProps extends Omit<LucideProps, 'ref'> {
  icon: LucideIcon;
  size?: number;
}

/**
 * Standard icon wrapper. Use this everywhere instead of raw Lucide
 * components so we keep stroke width and sizing consistent.
 */
export function Icon({ icon: Cmp, size = 16, strokeWidth = 1.8, ...props }: IconProps) {
  return <Cmp size={size} strokeWidth={strokeWidth} {...props} />;
}
