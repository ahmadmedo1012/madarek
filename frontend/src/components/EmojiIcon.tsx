/**
 * EmojiIcon
 *
 * Maps the legacy `iconEmoji` data field (📢, 📚, 🏆, …) to a
 * unified Lucide icon. Used wherever the data layer still emits
 * emoji strings — keeps the icon system consistent across the
 * platform without rewriting backend payloads.
 *
 * Falls back to a sensible default (BookOpen) for unknown emojis
 * so we never render the raw emoji glyph.
 *
 * Usage review (brief §3.10, wave 13-16): every current consumer
 * keys off a DATA-DRIVEN emoji string — college/course `iconEmoji`,
 * exam `courseIcon`, track/badge/announcement/event/competition
 * icons, and GlobalSearch result hits. No chrome, navigation, or
 * static UI uses EmojiIcon, and no raw emoji glyph ever renders.
 * Verdict: compliant. Keep it that way — new chrome icons use
 * `Icon` with a Lucide component directly; EmojiIcon is exclusively
 * the data-layer emoji → Lucide bridge.
 */
import {
  Megaphone,
  Trophy,
  Calendar,
  BookOpen,
  Radio,
  Book,
  FileText,
  Star,
  Beaker,
  GraduationCap,
  Lightbulb,
  Briefcase,
  Microscope,
  Users,
  Pen,
  PartyPopper,
  Globe,
  Newspaper,
  Heart,
  Bell,
  Bookmark,
  Clock,
  Coffee,
  Code,
  Gift,
  HandHeart,
  Library,
  Mail,
  Map,
  MapPin,
  Mic2,
  Music,
  Palette,
  Phone,
  PieChart,
  Pin,
  ScrollText,
  Sparkles,
  Target,
  ThumbsUp,
  Trophy as Award,
  Wifi,
  Zap,
  Building2,
  type LucideIcon,
} from 'lucide-react';
import { Icon } from './Icon';

const MAP: Record<string, LucideIcon> = {
  '📢': Megaphone,
  '📣': Megaphone,
  '🏆': Trophy,
  '🏅': Award,
  '🥇': Award,
  '🥈': Award,
  '🥉': Award,
  '📅': Calendar,
  '🗓️': Calendar,
  '📆': Calendar,
  '📚': BookOpen,
  '📖': BookOpen,
  '📕': Book,
  '📗': Book,
  '📘': Book,
  '📙': Book,
  '📒': Book,
  '📓': Book,
  '📔': Book,
  '📡': Radio,
  '📻': Radio,
  '📝': FileText,
  '✏️': Pen,
  '✍️': Pen,
  '⭐': Star,
  '🌟': Sparkles,
  '✨': Sparkles,
  '🧪': Beaker,
  '⚗️': Beaker,
  '🔬': Microscope,
  '🎓': GraduationCap,
  '💡': Lightbulb,
  '💼': Briefcase,
  '👥': Users,
  '🎉': PartyPopper,
  '🎊': PartyPopper,
  '🌍': Globe,
  '🌐': Globe,
  '🗺️': Map,
  '📍': MapPin,
  '📰': Newspaper,
  '❤️': Heart,
  '♥️': Heart,
  '🔔': Bell,
  '🔖': Bookmark,
  '⏰': Clock,
  '⌚': Clock,
  '⏱️': Clock,
  '☕': Coffee,
  '💻': Code,
  '⚡': Zap,
  '🎁': Gift,
  '🤝': HandHeart,
  '📓📚': Library,
  '✉️': Mail,
  '📧': Mail,
  '🎵': Music,
  '🎼': Music,
  '🎨': Palette,
  '📞': Phone,
  '☎️': Phone,
  '📊': PieChart,
  '📈': PieChart,
  '📌': Pin,
  '📜': ScrollText,
  '🎯': Target,
  '👍': ThumbsUp,
  '📶': Wifi,
  '🏛️': Building2,
  '🏛': Building2,
  '🎤': Mic2,
  '🏫': Building2,
};

export function EmojiIcon({
  emoji,
  size = 20,
  fallback = BookOpen,
  className,
}: {
  emoji?: string | null;
  size?: number;
  fallback?: LucideIcon;
  className?: string;
}) {
  const Cmp = (emoji && MAP[emoji]) || fallback;
  return <Icon icon={Cmp} size={size} className={className} />;
}
