import { BrandMark } from './BrandMark';

/**
 * HydrationSplash — a calm, branded full-screen placeholder shown only while
 * the persisted auth store rehydrates. Replaces the previous blank/null render
 * so there is no layout flash before routing decisions are made. The no-flash
 * theme script in index.html sets data-theme before paint, so this matches the
 * resolved theme background.
 */
export function HydrationSplash() {
  return (
    <div className="hydration-splash" role="status" aria-label="جارٍ التحميل">
      <BrandMark size={48} />
    </div>
  );
}
