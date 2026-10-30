import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ArrowRight, Bell, Sparkles } from "lucide-react-native";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { latn } from "@/lib/format";
import { Screen } from "@/components/ui/screen";
import { T, MonoLabel } from "@/components/ui/text";
import { Badge, Card } from "@/components/ui/surfaces";
import { StatLine } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/states";
import { StackHeader } from "@/components/shell/AppTopBar";
import {
  VISION_CONCEPTS,
  VISION_STATUS_LABEL,
  VISION_STATUS_TONE,
  type VisionConcept,
} from "@/features/common/visionData";

/**
 * /vision/[slug] — one concept's reading surface. All content is static
 * (from visionData) so there are no loading/error states; an unknown slug
 * gets the honest empty guard. Web twin: VisionDetailPage — including the
 * honest «قريباً» notification card (no subscription endpoint exists).
 */
export default function VisionDetail() {
  const p = usePalette();
  const params = useLocalSearchParams<{ slug: string }>();
  const concept = VISION_CONCEPTS.find((c) => c.slug === params.slug);

  if (!concept) {
    return (
      <Screen scroll>
        <StackHeader title="الابتكار" kicker="الرؤية" />
        <EmptyState
          title="المفهوم غير موجود"
          message="ربما تغيّر الرابط أو أُزيل هذا المفهوم من خارطة الطريق."
          actionLabel="العودة إلى الابتكارات"
          onAction={() => router.push("/vision")}
        />
      </Screen>
    );
  }

  const idx = VISION_CONCEPTS.findIndex((c) => c.slug === concept.slug);
  const prev = idx > 0 ? VISION_CONCEPTS[idx - 1] : null;
  const next = idx < VISION_CONCEPTS.length - 1 ? VISION_CONCEPTS[idx + 1] : null;
  const Icon = concept.icon;

  return (
    <Screen scroll>
      <StackHeader title={concept.title} kicker={VISION_STATUS_LABEL[concept.status]} />

      {/* Hero — icon + status + statement */}
      <View style={{ gap: sp[10], paddingBottom: sp[4] }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[12] }}>
          <Icon size={28} color={p.accentInk} />
          <Badge
            label={VISION_STATUS_LABEL[concept.status]}
            tone={VISION_STATUS_TONE[concept.status]}
          />
        </View>
        <T variant="bodyLg" color="secondary">
          {concept.subtitle}
        </T>
      </View>

      {/* Article body — the reading space */}
      <Card>
        <T variant="body" color="secondary" style={{ lineHeight: 24 }}>
          {concept.description}
        </T>
      </Card>

      {/* Metrics — honest design facts (mostly text values) */}
      <Card style={{ paddingVertical: sp[4] }}>
        {concept.metrics.map((m, i) => (
          <StatLine
            key={m.label}
            label={m.label}
            value={m.value}
            hint={m.sub ?? null}
          />
        ))}
      </Card>

      {/* Features */}
      <Card style={{ gap: sp[10] }}>
        <T variant="h4" weight="bold">
          المميزات
        </T>
        <View style={{ gap: sp[8] }}>
          {concept.features.map((f, i) => (
            <View key={i} style={{ flexDirection: "row", gap: sp[8], alignItems: "flex-start" }}>
              <Sparkles size={16} color={p.accentInk} />
              <View style={{ flex: 1 }}>
                <T variant="body" color="secondary">
                  {f}
                </T>
              </View>
            </View>
          ))}
        </View>
      </Card>

      {/* How it works — numbered steps */}
      <Card style={{ gap: sp[10] }}>
        <T variant="h4" weight="bold">
          كيف تعمل
        </T>
        <View style={{ gap: sp[12] }}>
          {concept.steps.map((s, i) => (
            <View key={i} style={{ flexDirection: "row", gap: sp[10], alignItems: "flex-start" }}>
              <MonoLabel>{`${i + 1}`}</MonoLabel>
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="body" weight="semibold">
                  {s.title}
                </T>
                <T variant="sm" color="muted">
                  {s.desc}
                </T>
              </View>
            </View>
          ))}
        </View>
      </Card>

      {/* Use cases */}
      <Card style={{ gap: sp[10] }}>
        <T variant="h4" weight="bold">
          الاستخدامات المحتملة
        </T>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp[8] }}>
          {concept.useCases.map((u) => (
            <Badge key={u} label={u} tone="grey" />
          ))}
        </View>
      </Card>

      {/* Launch notification — HONEST state (no endpoint exists yet). */}
      <Card style={{ gap: sp[8] }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: sp[10] }}>
          <Bell size={18} color={p.textMuted} />
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="body" weight="semibold">
              نبّهني عند إطلاق هذه الميزة
            </T>
            <T variant="sm" color="muted">
              خدمة التنبيه على البريد قيد التطوير — تابع صفحة الرؤية: حالة كل ابتكار تُحدَّث هنا فور تغيّرها.
            </T>
          </View>
          <Badge label="قريباً" tone="grey" />
        </View>
      </Card>

      {/* Prev / next concepts */}
      <View style={{ flexDirection: "row", gap: sp[8] }}>
        <PrevNextButton concept={prev} side="prev" />
        <PrevNextButton concept={next} side="next" />
      </View>

      <T variant="xs" color="faint" style={{ textAlign: "center" }}>
        {`${latn(idx + 1)} / ${latn(VISION_CONCEPTS.length)} — مفاهيم استكشافية، ليست ميزات مطلقة.`}
      </T>
    </Screen>
  );
}

function PrevNextButton({
  concept,
  side,
}: {
  concept: VisionConcept | null;
  side: "prev" | "next";
}) {
  const p = usePalette();
  if (!concept) return <View style={{ flex: 1 }} />;
  return (
    <Card
      onPress={() => router.push(`/vision/${concept.slug}` as never)}
      accessibilityLabel={`${side === "prev" ? "المفهوم السابق" : "المفهوم التالي"}: ${concept.title}`}
      style={{ flex: 1, gap: 2 }}
    >
      <T variant="xs" color="faint">
        {side === "prev" ? "السابق" : "التالي"}
      </T>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
        {side === "next" ? <ArrowLeft size={14} color={p.accentInk} /> : null}
        <T variant="sm" weight="bold" numberOfLines={1} style={{ flex: 1 }}>
          {concept.title}
        </T>
        {side === "prev" ? <ArrowRight size={14} color={p.accentInk} /> : null}
      </View>
    </Card>
  );
}
