import { Trophy, Star, Medal, Award } from 'lucide-react';
import { Icon } from './Icon';
import { EmojiIcon } from './EmojiIcon';
import { useMyAchievements, useLeaderboard } from '../hooks/useResources';
import { useI18nStore } from '../stores/i18n.store';

export function GamificationWidget() {
  const locale = useI18nStore((s) => s.locale);
  const achievements = useMyAchievements();
  const leaderboard = useLeaderboard();

  const totalXp = achievements.data?.reduce((sum, a) => sum + a.achievement.xp, 0) ?? 0;
  const latestBadge = achievements.data?.[0] ?? null;
  const topThree = leaderboard.data?.slice(0, 3) ?? [];

  // Compute level from XP (every 100 XP = 1 level)
  const level = Math.floor(totalXp / 100) + 1;
  const progressInLevel = (totalXp % 100);

  return (
    <div className="gamification-widget">
      {/* XP & Level */}
      <div className="gamification-widget__stats">
        <div className="gamification-widget__xp">
          <div className="gamification-widget__xp-icon">
            <Icon icon={Star} size={18} />
          </div>
          <div className="gamification-widget__xp-info">
            <span className="gamification-widget__xp-value" data-numeric="true">
              {totalXp}
            </span>
            <span className="gamification-widget__xp-label">
              {locale === 'ar' ? 'نقطة خبرة' : 'XP'}
            </span>
          </div>
        </div>

        <div className="gamification-widget__level">
          <div
            className="gamification-widget__level-ring"
            style={{ '--progress': `${(progressInLevel / 100) * 360}deg` } as React.CSSProperties}
          >
            <span className="gamification-widget__level-value" data-numeric="true">
              {level}
            </span>
          </div>
          <span className="gamification-widget__level-label">
            {locale === 'ar' ? 'المستوى' : 'Level'}
          </span>
        </div>
      </div>

      {/* Latest Badge */}
      {latestBadge && (
        <div className="gamification-widget__badge badge-animate-pulse">
          <span className="gamification-widget__badge-icon">
            <EmojiIcon emoji={latestBadge.achievement.icon ?? ''} size={20} fallback={Trophy} />
          </span>
          <div className="gamification-widget__badge-info">
            <span className="gamification-widget__badge-name">
              {latestBadge.achievement.name}
            </span>
            <span className="gamification-widget__badge-label">
              {locale === 'ar' ? 'آخر إنجاز' : 'Latest Badge'}
            </span>
          </div>
        </div>
      )}

      {/* Mini Leaderboard */}
      {topThree.length > 0 && (
        <div className="gamification-widget__leaderboard">
          <div className="gamification-widget__leaderboard-title">
            <Icon icon={Trophy} size={14} />
            <span>{locale === 'ar' ? 'المتصدّرون' : 'Top Players'}</span>
          </div>
          <div className="gamification-widget__leaderboard-list">
            {topThree.map((entry, i) => (
              <div key={entry.id} className="gamification-widget__leaderboard-row">
                <span className="gamification-widget__rank" data-rank={i + 1}>
                  <Icon
                    icon={i === 0 ? Trophy : i === 1 ? Medal : Award}
                    size={14}
                  />
                </span>
                <span className="gamification-widget__name">
                  {entry.firstName} {entry.lastName}
                </span>
                <span className="gamification-widget__points" data-numeric="true">
                  {entry.totalXp}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
