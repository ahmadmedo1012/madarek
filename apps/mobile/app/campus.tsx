import { View } from "react-native";
import { Camera, Video } from "lucide-react-native";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { Screen } from "@/components/ui/screen";
import { T, MonoLabel } from "@/components/ui/text";
import { Card } from "@/components/ui/surfaces";
import { RowList, LedgerRow } from "@/components/ui/data";
import { StackHeader } from "@/components/shell/AppTopBar";

/**
 * /campus — «الحياة الجامعية»: the documentary media rail, ported from
 * the web CampusLifePage. The web renders real Commons-licensed photos
 * and official-channel videos; the mobile port carries the SAME registry
 * as TEXT-ONLY rows (institution · caption · author · license) with the
 * web's honesty captions verbatim — no fake images are fabricated here.
 */

interface PhotoRow {
  id: string;
  institution: string;
  name: string;
  caption: string;
  author: string;
  license: string;
}

const HERO_PHOTOS: PhotoRow[] = [
  {
    id: "uob-wide",
    institution: "جامعة بنغازي",
    name: "مقرّ إدارة جامعة بنغازي",
    caption: "الإدارة المركزية بالقبّة — تصوير بانورامي",
    author: "WisiW",
    license: "CC BY-SA 4.0",
  },
  {
    id: "uob-science",
    institution: "جامعة بنغازي",
    name: "كلية العلوم — جامعة بنغازي",
    caption: "واجهة كلية العلوم بهندستها المتكرّرة",
    author: "WisiW",
    license: "CC BY-SA 4.0",
  },
  {
    id: "tripoli-science",
    institution: "جامعة طرابلس",
    name: "كلية العلوم — جامعة طرابلس",
    caption: "مبنى كلية العلوم من داخل الحرم",
    author: "Atoo77",
    license: "CC BY-SA 4.0",
  },
];

const RAIL_PHOTOS: PhotoRow[] = [
  {
    id: "uob-garden",
    institution: "جامعة بنغازي",
    name: "حديقة الجامعة — جامعة بنغازي",
    caption: "جادة الحديقة بخطّ النخيل",
    author: "WisiW",
    license: "CC BY-SA 4.0",
  },
  {
    id: "garyounis-classic",
    institution: "جامعة بنغازي (قاريونس)",
    name: "حرم قاريونس من الجوّ",
    caption: "منظر جوّي للحرم الجامعي",
    author: "Munsha'at al Akhdar lil Alwan, Benghazi",
    license: "Public domain",
  },
  {
    id: "garyounis-1",
    institution: "جامعة بنغازي (قاريونس)",
    name: "مدخل الحرم — قاريونس",
    caption: "بوابة الحرم الجامعي",
    author: "Maher A. A. Abdussalam",
    license: "Public domain",
  },
  {
    id: "omu-agri",
    institution: "جامعة عمر المختار",
    name: "كلية الزراعة — البيضاء",
    caption: "مجمّع الكلية بطرازه المعماري",
    author: "Munsha'at al Akhdar lil Alwan, Benghazi",
    license: "Public domain",
  },
  {
    id: "fateh-science",
    institution: "جامعة طرابلس",
    name: "ممرّ كلية العلوم — جامعة طرابلس",
    caption: "ممرّ داخلي من حياة الحرم",
    author: "Tarek Siala",
    license: "CC BY 2.0",
  },
  {
    id: "uob",
    institution: "جامعة بنغازي",
    name: "تفصيلة من مبنى الإدارة",
    caption: "زوايا معمارية من الإدارة المركزية",
    author: "WisiW",
    license: "CC BY-SA 4.0",
  },
];

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
  return (
    <Screen scroll>
      <StackHeader title="الحياة الجامعية" kicker="توثيق جامعي" />

      {/* [01] الحياة الجامعية — documentary photography rail */}
      <View style={{ gap: sp[8] }}>
        <MonoLabel>[01] الحياة الجامعية</MonoLabel>
        <T variant="h3" weight="bold">
          من داخل الجامعات الليبية
        </T>
        <T variant="body" color="secondary">
          صور حقيقية لحرم جامعات ليبية عامة، بتراخيص مفتوحة من ويكيميديا كومنز — توثيقٌ للحياة الجامعية، لا زخرفة: كل إطار يحمل اسم جامعته ونسب مصوّره.
        </T>
        <T variant="xs" color="faint">
          الصور تُعرض على موقع المنصّة — هنا سجلّها التوثيقي كاملًا بتراخيصها.
        </T>
      </View>

      <RowList>
        {[...HERO_PHOTOS, ...RAIL_PHOTOS].map((photo, i, all) => (
          <LedgerRow
            key={photo.id}
            last={i === all.length - 1}
            accessibilityLabel={`${photo.name} — ${photo.institution}`}
          >
            <View style={{ gap: sp[4] }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                <Camera size={18} color={p.textMuted} />
                <T variant="body" weight="bold" style={{ flex: 1 }} numberOfLines={1}>
                  {photo.name}
                </T>
                <MonoLabel>{photo.license}</MonoLabel>
              </View>
              <T variant="sm" color="muted">
                {`${photo.caption} · ${photo.institution}`}
              </T>
              <T variant="xs" color="faint">
                {`تصوير: ${photo.author}`}
              </T>
            </View>
          </LedgerRow>
        ))}
      </RowList>

      <T variant="sm" color="muted">
        المصدر: ويكيميديا كومنز — تراخيص PD / CC BY / CC BY-SA، ونسب كل مصوّر مرفقة بإطاره. أعيد تحجيم الصور وقصّها للعرض. ظهور جامعة هنا توثيقٌ لحقيقتها، لا تبنّيًا ولا شراكة — مدارك مستقلّة.
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
