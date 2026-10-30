import { View } from "react-native";
import { router } from "expo-router";
import { Bug, Info } from "lucide-react-native";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { Screen } from "@/components/ui/screen";
import { T, MonoLabel } from "@/components/ui/text";
import { Card } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { Markdown } from "@/components/ui/markdown";
import { StackHeader } from "@/components/shell/AppTopBar";
import { CONTACT_LEDE, CONTACT_SECTIONS } from "@/features/common/helpData";
import { LEGAL_COLOPHON, LEGAL_UPDATED } from "@/features/common/legalData";

/**
 * /contact — «التواصل والتسجيل المبكر» (web ContactPage port): the ONE
 * available channel exactly as the web shows it — no invented emails,
 * phones, or social accounts. Plus the in-app «أبلغ عن مشكلة» pointer
 * (the floating feedback widget ships inside the app) and the /about link.
 */
export default function Contact() {
  const p = usePalette();

  return (
    <Screen scroll>
      <StackHeader title="التواصل والتسجيل المبكر" kicker="التواصل" />

      <View style={{ gap: sp[8], paddingBottom: sp[4] }}>
        <T variant="h3" weight="bold">
          التواصل والتسجيل المبكر
        </T>
        <T variant="body" color="secondary">
          {CONTACT_LEDE}
        </T>
      </View>

      {CONTACT_SECTIONS.map((section, i) => (
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

      {/* The in-app feedback pointer — the widget ships in the app shell. */}
      <Card style={{ gap: sp[8] }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
          <Bug size={18} color={p.accentInk} />
          <T variant="body" weight="bold" style={{ flex: 1 }}>
            أبلغ عن مشكلة
          </T>
        </View>
        <T variant="sm" color="secondary">
          داخل التطبيق زرّ عائم «أبلغ عن مشكلة أو اقتراح» يرسل ملاحظتك مع اسم الصفحة مباشرة — هذا هو طريق الإبلاغ الأسرع، وهو متاح لحسابات مسجّلة.
        </T>
      </Card>

      <View style={{ gap: sp[8] }}>
        <Button
          label="إنشاء حساب جديد"
          kind="primary"
          onPress={() => router.push("/auth/register" as never)}
        />
        <Button
          label="عن مدارك"
          kind="ghost"
          small
          icon={<Info size={16} color={p.text} />}
          onPress={() => router.push("/about" as never)}
        />
        <Button
          label="الأمن والإفصاح المسؤول"
          kind="ghost"
          small
          onPress={() => router.push("/legal/security" as never)}
        />
      </View>

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
    </Screen>
  );
}
