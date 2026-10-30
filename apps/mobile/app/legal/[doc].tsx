import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { sp } from "@/design/tokens";
import { Screen } from "@/components/ui/screen";
import { T, MonoLabel } from "@/components/ui/text";
import { Card } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { Markdown } from "@/components/ui/markdown";
import { EmptyState } from "@/components/ui/states";
import { StackHeader } from "@/components/shell/AppTopBar";
import {
  LEGAL_COLOPHON,
  LEGAL_DOC_ORDER,
  LEGAL_DOCS,
  LEGAL_UPDATED,
  type LegalDoc,
} from "@/features/common/legalData";

/**
 * /legal/[doc] — the six policy sheets (privacy/terms/cookies/
 * accessibility/security/data). Sections ported verbatim into
 * legalData (structured {title, paragraphs[]}); paragraphs carry
 * minimal markdown (**bold**, `code`, "- " lists) rendered through the
 * training Markdown component — the native twin of the web's
 * LegalSheet/LegalCell grammar. Static content: no skeleton/error
 * states by design; the unknown-doc guard stays honest.
 */
export default function LegalDocScreen() {
  const params = useLocalSearchParams<{ doc: string }>();
  const doc = LEGAL_DOC_ORDER.includes(params.doc as LegalDoc["slug"])
    ? (params.doc as LegalDoc["slug"])
    : null;
  const data = doc ? LEGAL_DOCS[doc] : null;

  if (!doc || !data) {
    return (
      <Screen scroll>
        <StackHeader title="السياسات" kicker="مدارك" />
        <EmptyState
          title="الصفحة غير موجودة"
          message="هذه الوثيقة ليست من سياسات المنصّة الست."
          actionLabel="سياسة الخصوصية"
          onAction={() => router.push("/legal/privacy" as never)}
        />
      </Screen>
    );
  }

  const related = LEGAL_DOC_ORDER.filter((slug) => slug !== doc);

  return (
    <Screen scroll>
      <StackHeader title={data.title} kicker="السياسات" />

      <View style={{ gap: sp[8], paddingBottom: sp[4] }}>
        <T variant="h3" weight="bold">
          {data.title}
        </T>
        <T variant="body" color="secondary">
          {data.lede}
        </T>
      </View>

      {data.sections.map((section, i) => (
        <View key={section.title} style={{ gap: sp[8] }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: sp[8] }}>
            <MonoLabel>{`[${String(i + 1).padStart(2, "0")}]`}</MonoLabel>
            <T variant="h4" weight="bold" style={{ flex: 1 }}>
              {section.title}
            </T>
          </View>
          <Card>
            <Markdown source={section.paragraphs.join("\n")} />
          </Card>
        </View>
      ))}

      {/* Colophon — the honest footer (web LegalSheet, verbatim). */}
      <View style={{ gap: sp[6], paddingTop: sp[8] }}>
        <T variant="sm" color="muted" align="center">
          {LEGAL_COLOPHON}
        </T>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: sp[8] }}>
          <T variant="xs" color="faint">
            آخر تحديث:
          </T>
          <MonoLabel>{LEGAL_UPDATED}</MonoLabel>
        </View>
      </View>

      {/* Related sheets */}
      <T variant="h4" weight="bold">
        سياسات ذات صلة
      </T>
      <View style={{ gap: sp[8] }}>
        {related.map((slug) => (
          <Button
            key={slug}
            label={LEGAL_DOCS[slug].title}
            kind="ghost"
            small
            onPress={() => router.push(`/legal/${slug}` as never)}
          />
        ))}
      </View>
    </Screen>
  );
}
