import { View } from "react-native";
import { router } from "expo-router";
import { ArrowRight, Info, Palette } from "lucide-react-native";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen, SectionBar } from "@/components/ui";
import { T, MonoLabel } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { BrandMark } from "@/components/ui/brand";
import { Card, Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow } from "@/components/ui/data";

/** The brand asset register (frontend/public/brand) — SVG sources named
 *  verbatim; the mobile app draws its own vector BrandMark twin. */
const BRAND_ASSETS: { file: string; label: string }[] = [
  { file: "mark.svg", label: "رمز العلامة المربَّع (المعوّل)" },
  { file: "madarek-mark.svg", label: "الرمز المستقلّ للويب" },
  { file: "wordmark.svg", label: "الكتابة (مدارك)" },
  { file: "lockup.svg", label: "الدمج الأفقيّ — رمز + كتابة" },
  { file: "lockup-stacked.svg", label: "الدمج المركَّب — رمز فوق كتابة" },
];

/**
 * Pushed: /owner/content — «المحتوى والعلامة التجاريّة» (web OwnerContentPage
 * parity): an HONEST branding landing. Editing the brand colors or the
 * home-page copy is under development (the web disclosure travels verbatim);
 * detailed content management lives in the web console — this page lists
 * the official asset register and links to the platform identity page.
 */
export default function OwnerContent() {
  return (
    <Screen scroll>
      <StackHeader title="المحتوى والعلامة التجاريّة" kicker="لوحة المالك" />
      <View style={{ gap: 16, paddingTop: 16 }}>
        <View>
          <T variant="h2" weight="bold">
            المحتوى والعلامة التجاريّة
          </T>
          <T variant="body" color="muted">
            الهويّة البصريّة وأصول العلامة
          </T>
        </View>

        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <BrandMark size={44} />
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="body" weight="bold">
                علامة مدارك
              </T>
              <T variant="xs" color="muted">
                مربَّع + معوّل بخطوط شعرية، وعقدة برتقالية واحدة
              </T>
            </View>
            <Badge label="SVG" tone="grey" mono />
          </View>
        </Card>

        <View>
          <SectionBar index={1} title="أصول العلامة الرسميّة" />
          <RowList>
            {BRAND_ASSETS.map((a, i) => (
              <LedgerRow key={a.file} last={i === BRAND_ASSETS.length - 1}>
                <T variant="body" weight="medium">
                  {a.label}
                </T>
                <MonoLabel>{`brand/${a.file}`}</MonoLabel>
              </LedgerRow>
            ))}
          </RowList>
          <T variant="xs" color="faint">
            المصادر الرسميّة تعيش في مستودع الويب (frontend/public/brand) — التطبيق يرسم توأمه
            المتجهيّ الخاص من الهندسة ذاتها.
          </T>
        </View>

        <Card>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Info size={16} color="#62625F" />
              <T variant="body" weight="bold" style={{ flex: 1 }}>
                قيد التطوير
              </T>
            </View>
            <T variant="sm" color="muted">
              تعديل ألوان العلامة التجاريّة (الأساسيّ، الثانويّ، التمييز) ومحتوى الصفحة الرئيسيّة
              قيد التطوير. حالياً تُعتمَد ألوان علامة مدارك الرسميّة المعتمدة في نظام التصميم —
              ومحرّر العنوان والوصف الفرعيّ محدَّد في كود الصفحة الرئيسيّة.
            </T>
          </View>
        </Card>

        <View>
          <SectionBar index={2} title="إدارة المحتوى التفصيلية" />
          <Card>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Palette size={16} color="#62625F" />
                <T variant="body" weight="bold" style={{ flex: 1 }}>
                  الإعلانات وأعلام الميزات
                </T>
              </View>
              <T variant="sm" color="muted">
                إدارة المحتوى التفصيلية (بثّ الإعلانات، أعلام الميزات، صياغة الصفحة الرئيسيّة) تُدار
                من لوحة الويب — التطبيق يعرض هوية المنصّة كما هي معرَّفة في الشيفرة والتصميم.
              </T>
              <Button
                label="عن مدارك — الهويّة والمنصّة"
                kind="ghost"
                small
                icon={<ArrowRight size={14} color="#282828" />}
                onPress={() => router.push("/about" as never)}
              />
            </View>
          </Card>
        </View>

        <View>
          <SectionBar index={3} title="التغذية الراجعة" />
          <Card>
            <View style={{ gap: 8 }}>
              <T variant="sm" color="muted">
                صندوق تقارير «أبلغ عن مشكلة / اقتراح» الواردة من مستخدمي المنصّة، مع حالتها الكاملة
                وطريقها.
              </T>
              <Button
                label="فتح صندوق التغذية الراجعة"
                kind="ghost"
                small
                icon={<ArrowRight size={14} color="#282828" />}
                onPress={() => router.push("/owner/feedback" as never)}
              />
            </View>
          </Card>
        </View>
      </View>
    </Screen>
  );
}
