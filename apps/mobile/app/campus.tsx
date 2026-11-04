import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import Camera from "lucide-react-native/icons/camera";
import Video from "lucide-react-native/icons/video";
import { API_BASE } from "@/api/client";
import { usePalette, useSemanticTheme } from "@/design/theme";
import { sp } from "@/design/tokens";
import { Screen } from "@/components/ui/screen";
import { T, MonoLabel } from "@/components/ui/text";
import { Card } from "@/components/ui/surfaces";
import { RowList, LedgerRow } from "@/components/ui/data";
import { StackHeader } from "@/components/shell/AppTopBar";

/**
 * /campus — «الحياة الجامعية»: the documentary media rail, ported from
 * the web CampusLifePage. R334 L2 sweep: the SAME Commons-licensed
 * registry now renders the platform's own WebP renditions through
 * expo-image (memory+disk caching, sunken placeholder, 200ms fade) —
 * the images the web serves from `/media/universities/`, no fabrication.
 * Attribution (author · license) stays under every frame — the honest
 * documentary ledger is the content, the photo is its evidence.
 *
 * TODO(upstream): the rendition URL is derived by stripping `/api/v1`
 * from EXPO_PUBLIC_API_BASE_URL — when the backend exposes a media
 * manifest endpoint, switch to it (same switch the web makes if it
 * ever leaves its own origin).
 */

interface PhotoRow {
  id: string;
  institution: string;
  name: string;
  caption: string;
  /** Honest alt text (web university-media altAr, verbatim). */
  alt: string;
  author: string;
  license: string;
}

const HERO_PHOTOS: PhotoRow[] = [
  {
    id: "uob-wide",
    institution: "جامعة بنغازي",
    name: "مقرّ إدارة جامعة بنغازي",
    caption: "الإدارة المركزية بالقبّة — تصوير بانورامي",
    alt: "صورة بانورامية لواجهة مبنى الإدارة المركزية لجامعة بنغازي بقبّتها",
    author: "WisiW",
    license: "CC BY-SA 4.0",
  },
  {
    id: "uob-science",
    institution: "جامعة بنغازي",
    name: "كلية العلوم — جامعة بنغازي",
    caption: "واجهة كلية العلوم بهندستها المتكرّرة",
    alt: "صورة لواجهة كلية العلوم بجامعة بنغازي بنمط النوافذ الهندسي المتكرّر",
    author: "WisiW",
    license: "CC BY-SA 4.0",
  },
  {
    id: "tripoli-science",
    institution: "جامعة طرابلس",
    name: "كلية العلوم — جامعة طرابلس",
    caption: "مبنى كلية العلوم من داخل الحرم",
    alt: "صورة لمبنى كلية العلوم بجامعة طرابلس من داخل الحرم الجامعي",
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
    alt: "صورة بانورامية لجادة حديقة جامعة بنغازي المكسوّة بأشجار النخيل",
    author: "WisiW",
    license: "CC BY-SA 4.0",
  },
  {
    id: "garyounis-classic",
    institution: "جامعة بنغازي (قاريونس)",
    name: "حرم قاريونس من الجوّ",
    caption: "منظر جوّي للحرم الجامعي",
    alt: "صورة جوّية لحرم جامعة بنغازي (قاريونس سابقًا) بمبانيه الأسطوانية",
    author: "Munsha'at al Akhdar lil Alwan, Benghazi",
    license: "Public domain",
  },
  {
    id: "garyounis-1",
    institution: "جامعة بنغازي (قاريونس)",
    name: "مدخل الحرم — قاريونس",
    caption: "بوابة الحرم الجامعي",
    alt: "صورة لمدخل حرم جامعة بنغازي (قاريونس) باللافتة",
    author: "Maher A. A. Abdussalam",
    license: "Public domain",
  },
  {
    id: "omu-agri",
    institution: "جامعة عمر المختار",
    name: "كلية الزراعة — البيضاء",
    caption: "مجمّع الكلية بطرازه المعماري",
    alt: "صورة لمجمّع كلية الزراعة بجامعة عمر المختار في البيضاء",
    author: "Munsha'at al Akhdar lil Alwan, Benghazi",
    license: "Public domain",
  },
  {
    id: "fateh-science",
    institution: "جامعة طرابلس",
    name: "ممرّ كلية العلوم — جامعة طرابلس",
    caption: "ممرّ داخلي من حياة الحرم",
    alt: "صورة لممرّ داخلي في كلية العلوم بجامعة طرابلس",
    author: "Tarek Siala",
    license: "CC BY 2.0",
  },
  {
    id: "uob",
    institution: "جامعة بنغازي",
    name: "تفصيلة من مبنى الإدارة",
    caption: "زوايا معمارية من الإدارة المركزية",
    alt: "صورة معمارية لجزء من مبنى إدارة جامعة بنغازي",
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

/** The web origin that serves `/media/universities/*` (API_BASE minus /api/v1). */
const WEB_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, "");

/** 800px WebP rendition — the same derivative the web rail composes. */
function photoUrl(id: string): string {
  return `${WEB_ORIGIN}/media/universities/${id}-800.webp`;
}

export default function Campus() {
  const p = usePalette();
  const { colors } = useSemanticTheme();
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
      </View>

      <RowList>
        {[...HERO_PHOTOS, ...RAIL_PHOTOS].map((photo, i, all) => (
          <LedgerRow
            key={photo.id}
            last={i === all.length - 1}
            accessibilityLabel={`${photo.name} — ${photo.institution}`}
          >
            <View style={{ gap: sp[8] }}>
              <Image
                source={{ uri: photoUrl(photo.id) }}
                contentFit="cover"
                transition={200}
                recyclingKey={photo.id}
                accessibilityLabel={photo.alt}
                style={{
                  aspectRatio: 16 / 9,
                  backgroundColor: colors.sunken,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: p.border,
                }}
              />
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
