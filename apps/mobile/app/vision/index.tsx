import { View } from "react-native";
import { router } from "expo-router";
import { Sparkles } from "lucide-react-native";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { latn } from "@/lib/format";
import { Screen } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { Badge, Card } from "@/components/ui/surfaces";
import { KpiCard, RowList, LedgerRow } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/states";
import { StackHeader } from "@/components/shell/AppTopBar";
import { countAr } from "@/features/common/components";
import {
  VISION_CONCEPTS,
  VISION_HONEST_NOTE,
  VISION_KICKER,
  VISION_STATUS_LABEL,
  VISION_STATUS_TONE,
  type VisionConcept,
} from "@/features/common/visionData";

/**
 * /vision — the concepts gallery (static roadmap content; no API, so no
 * skeleton/error states by design — the empty guard stays honest if the
 * concept list is ever emptied). Web twin: VisionGalleryPage. The kicker
 * is contractual honesty: these are exploratory concepts, not promises.
 */
export default function VisionIndex() {
  const p = usePalette();
  const grouped = {
    beta: VISION_CONCEPTS.filter((c) => c.status === "beta"),
    prototype: VISION_CONCEPTS.filter((c) => c.status === "prototype"),
    planning: VISION_CONCEPTS.filter((c) => c.status === "planning"),
    research: VISION_CONCEPTS.filter((c) => c.status === "research"),
  };
  const total = VISION_CONCEPTS.length;
  const inDevelopment =
    grouped.prototype.length + grouped.planning.length + grouped.research.length;

  return (
    <Screen scroll>
      <StackHeader title="الرؤية" kicker={VISION_KICKER} />

      <View style={{ gap: sp[4], paddingBottom: sp[8] }}>
        <T variant="h3" weight="bold">
          {latn(total)} ابتكارًا قادمًا، نبني التعليم في يدك خطوة بخطوة.
        </T>
        <T variant="body" color="secondary">
          هذه نظرة على المسار التقني للمنصّة — من الذكاء الاصطناعي والميتافيرس إلى البلوكشين والترجمة الفورية.
        </T>
      </View>

      {/* Status summary — a quiet numbers strip (values from the data). */}
      <View style={{ flexDirection: "row", gap: sp[8] }}>
        <KpiCard label="تجريبي" value={grouped.beta.length} />
        <KpiCard label="نموذج" value={grouped.prototype.length} />
        <KpiCard label="تخطيط" value={grouped.planning.length} />
        <KpiCard label="بحث" value={grouped.research.length} />
      </View>

      {total === 0 ? (
        <EmptyState
          title="لا توجد ابتكارات معروضة بعد"
          message="ستظهر خارطة الطريق التقنية للمنصّة هنا حين تُنشر."
          icon={<Sparkles size={20} color={p.textMuted} />}
        />
      ) : (
        <>
          {grouped.beta.length > 0 ? (
            <ConceptBand
              title="جرّبها الآن"
              note={countAr(grouped.beta.length, [
                "ابتكار متاح للتجربة",
                "ابتكاران متاحان للتجربة",
                "ابتكارات متاحة للتجربة",
                "ابتكارًا متاحًا للتجربة",
              ])}
              concepts={grouped.beta}
            />
          ) : null}
          {inDevelopment > 0 ? (
            <ConceptBand
              title="قيد التطوير"
              note={countAr(inDevelopment, [
                "ابتكار في المراحل المبكرة",
                "ابتكاران في المراحل المبكرة",
                "ابتكارات في المراحل المبكرة",
                "ابتكارًا في المراحل المبكرة",
              ])}
              concepts={[...grouped.prototype, ...grouped.planning, ...grouped.research]}
            />
          ) : null}
        </>
      )}

      {/* Honest framing — the bottom note (web A8 P2-5, verbatim). */}
      <Card>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: sp[10] }}>
          <Sparkles size={18} color={p.accentInk} />
          <View style={{ flex: 1 }}>
            <T variant="sm" color="muted">
              {VISION_HONEST_NOTE}
            </T>
          </View>
        </View>
      </Card>
    </Screen>
  );
}

function ConceptBand({
  title,
  note,
  concepts,
}: {
  title: string;
  note: string;
  concepts: VisionConcept[];
}) {
  const p = usePalette();
  return (
    <View style={{ gap: sp[8] }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: sp[8] }}>
        <T variant="h4" weight="bold" style={{ flex: 1 }}>
          {title}
        </T>
        <T variant="xs" color="faint">
          {note}
        </T>
      </View>
      <RowList>
        {concepts.map((c, i) => {
          const Icon = c.icon;
          return (
            <LedgerRow
              key={c.slug}
              last={i === concepts.length - 1}
              onPress={() => router.push(`/vision/${c.slug}` as never)}
              accessibilityLabel={`${c.title} — ${VISION_STATUS_LABEL[c.status]}`}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                <Icon size={20} color={p.accentInk} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T variant="body" weight="bold" numberOfLines={1}>
                    {c.title}
                  </T>
                  <T variant="sm" color="muted" numberOfLines={2}>
                    {c.subtitle}
                  </T>
                </View>
                <Badge label={VISION_STATUS_LABEL[c.status]} tone={VISION_STATUS_TONE[c.status]} />
              </View>
            </LedgerRow>
          );
        })}
      </RowList>
    </View>
  );
}
