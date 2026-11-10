import { useWindowDimensions, View } from "react-native";
import Video from "lucide-react-native/icons/video";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { Screen } from "@/components/ui/screen";
import { T, MonoLabel } from "@/components/ui/text";
import { Card } from "@/components/ui/surfaces";
import { RowList, LedgerRow } from "@/components/ui/data";
import { StackHeader } from "@/components/shell/AppTopBar";
import { UniversityCard } from "@/components/UniversityCard";
import { UNIVERSITY_CARDS } from "@/media/university-cards.generated";

/**
 * /campus — «الحياة الجامعية»: the documentary university register.
 *
 * R345 F: the Wikimedia photo rail is RETIRED — the nine documented
 * Libyan public universities now ride the R343 typographic/architectural
 * CARD system (original line-art elevations: arcade · courtyard · tower
 * · hall — no photos, no crests, no traced buildings), drawn from the
 * ONE shared geometry source (shared/media/university-cards.ts, the
 * byte-synced generated twin) via react-native-svg. Same registry ids,
 * same [nn] numerals, same documented names/cities — the register is
 * the content; the card is its plate. Light/dark rides the palette.
 *
 * The official-channel video ledger stays (see [02]).
 */

interface VideoRowData {
  id: string;
  institution: string;
  title: string;
  kind: string;
  duration: string;
  channel: string;
}

const UNIVERSITY_VIDEOS: VideoRowData[] = [
  {
    id: "misurata-exams",
    institution: "جامعة مصراتة",
    title: "أجواء امتحانات نهاية الفصل بكليات جامعة مصراتة",
    kind: "فيديو توثيقي من القناة الرسمية للجامعة",
    duration: "5:11",
    channel: "القناة الرسمية لجامعة مصراتة",
  },
  {
    id: "sebha-graduation",
    institution: "جامعة سبها",
    title: "حفل خريجي جامعة سبها — الدفعة 40",
    kind: "فيديو توثيقي من القناة الرسمية للجامعة",
    duration: "3:13",
    channel: "القناة الرسمية لجامعة سبها",
  },
];

export default function Campus() {
  const p = usePalette();
  const { width } = useWindowDimensions();
  const cardWidth = width - sp[20] * 2;

  return (
    <Screen scroll>
      <StackHeader title="الحياة الجامعية" kicker="توثيق جامعي" />

      {/* [01] الحياة الجامعية — the typographic/architectural register */}
      <View style={{ gap: sp[8] }}>
        <MonoLabel>[01] الحياة الجامعية</MonoLabel>
        <T variant="h3" weight="bold">
          من داخل الجامعات الليبية
        </T>
        <T variant="body" color="secondary">
          سجلٌّ تخطيطي لتسع جامعات ليبية عامة: بطاقات معمارية أصلية مرسومة لمدارك بخطّ الحبر — رواق وفناء وبرج وقاعة — لكل جامعة رقمها واسمها ومدينتها. لا صور فوتوغرافية: التخطيط توثيقٌ للمعمار، لا زخرفة.
        </T>
      </View>

      <View style={{ gap: sp[16] }}>
        {UNIVERSITY_CARDS.map((spec) => (
          <UniversityCard key={spec.id} id={spec.id} width={cardWidth} />
        ))}
      </View>

      <T variant="sm" color="muted">
        السجل التخطيطي الأصلي لمدارك: تسع بطاقات لجامعات ليبية عامة، بتركيبات معمارية أصلية (رواق · فناء · برج · قاعة) — لا أعمال لأطراف ثالثة. ظهور جامعة هنا توثيقٌ لحقيقتها، لا تبنّيًا ولا شراكة — مدارك مستقلّة.
      </T>

      {/* [02] مشاهد جامعية — official-channel documentaries */}
      <View style={{ gap: sp[8] }}>
        <MonoLabel>[02] مشاهد جامعية</MonoLabel>
        <T variant="h3" weight="bold">
          الحياة الجامعية بالفيديو
        </T>
        <T variant="body" color="secondary">
          تسجيلات توثيقية من القنوات الرسمية للجامعات — تُحمَّل عند الطلب فقط، وبلا أي بايتات خارجية قبل نقرك.
        </T>
      </View>

      <RowList>
        {UNIVERSITY_VIDEOS.map((video, i) => (
          <LedgerRow
            key={video.id}
            last={i === UNIVERSITY_VIDEOS.length - 1}
            accessibilityLabel={video.title}
          >
            <View style={{ gap: sp[4] }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                <Video size={18} color={p.textMuted} />
                <T variant="body" weight="bold" style={{ flex: 1 }} numberOfLines={2}>
                  {video.title}
                </T>
                <MonoLabel>{video.duration}</MonoLabel>
              </View>
              <T variant="sm" color="muted">
                {`${video.kind} · ${video.institution}`}
              </T>
              <T variant="xs" color="faint">
                {`القناة: ${video.channel} — التشغيل متاح على الموقع وموقع القناة الرسمية.`}
              </T>
            </View>
          </LedgerRow>
        ))}
      </RowList>

      <Card>
        <T variant="sm" color="muted">
          الفيديوهات من القنوات الرسمية لجامعتي مصراتة وسبها، عبر آلية التضمين المسموحة — والمشغّل لا يُحمَّل إلا بعد نقر «شاهد الفيديو» على الموقع.
        </T>
      </Card>
    </Screen>
  );
}
