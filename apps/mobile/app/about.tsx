import { View } from "react-native";
import { router } from "expo-router";
import { sp } from "@/design/tokens";
import { Screen } from "@/components/ui/screen";
import { T, MonoLabel } from "@/components/ui/text";
import { Card } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { Markdown } from "@/components/ui/markdown";
import { StackHeader } from "@/components/shell/AppTopBar";
import { ABOUT_LEDE, ABOUT_SECTIONS } from "@/features/common/helpData";
import { LEGAL_COLOPHON, LEGAL_UPDATED } from "@/features/common/legalData";

/**
 * /about — «عن مدارك» (web AboutPage port): the landing's identity
 * paragraph VERBATIM, what works today, the honest builders pending
 * marker, and the data-separation pointer. Nothing invented about who
 * builds مدارك until the owner states it.
 */
export default function About() {
  return (
    <Screen scroll>
      <StackHeader title="عن مدارك" kicker="ABOUT SHEET" />

      <View style={{ gap: sp[8], paddingBottom: sp[4] }}>
        <T variant="h3" weight="bold">
          عن مدارك
        </T>
        <T variant="body" color="secondary">
          {ABOUT_LEDE}
        </T>
      </View>

      {ABOUT_SECTIONS.map((section, i) => (
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

      <T variant="h4" weight="bold">
        السياسات
      </T>
      <View style={{ gap: sp[8] }}>
        <Button
          label="سياسة الخصوصية"
          kind="ghost"
          small
          onPress={() => router.push("/legal/privacy" as never)}
        />
        <Button
          label="شروط الاستخدام"
          kind="ghost"
          small
          onPress={() => router.push("/legal/terms" as never)}
        />
        <Button
          label="البيانات وبيانات العرض"
          kind="ghost"
          small
          onPress={() => router.push("/legal/data" as never)}
        />
        <Button
          label="التواصل والتسجيل المبكر"
          kind="ghost"
          small
          onPress={() => router.push("/contact" as never)}
        />
      </View>
    </Screen>
  );
}
