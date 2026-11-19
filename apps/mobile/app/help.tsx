import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import ChevronUp from "lucide-react-native/icons/chevron-up";
import LifeBuoy from "lucide-react-native/icons/life-buoy";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { Screen } from "@/components/ui/screen";
import { T, MonoLabel } from "@/components/ui/text";
import { Card } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { RowList, LedgerRow } from "@/components/ui/data";
import { haptics } from "@/haptics";
import { StackHeader } from "@/components/shell/AppTopBar";
import { FAQS, HELP_LEDE } from "@/features/common/helpData";
import { ABOUT_MADAREK } from "@/lib/copy";

/**
 * /help — «المساعدة والأسئلة» (web HelpPage port): the nine
 * FAQs as accordion rows ([nn] question / answer from web content),
 * with onward links to /contact and /legal/accessibility.
 */
export default function Help() {
  const p = usePalette();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Screen scroll>
      <StackHeader title="المساعدة والأسئلة" />

      <View style={{ gap: sp[8], paddingBottom: sp[4] }}>
        <T variant="h3" weight="bold">
          المساعدة والأسئلة
        </T>
        <T variant="body" color="secondary">
          {HELP_LEDE}
        </T>
      </View>

      <RowList>
        {FAQS.map((f, i) => {
          const expanded = open === i;
          return (
            <LedgerRow
              key={f.q}
              last={i === FAQS.length - 1}
              onPress={() => {
                haptics.selection();
                setOpen(expanded ? null : i);
              }}
              accessibilityLabel={`${f.q}${expanded ? " — مفتوح" : " — انقر للعرض"}`}
            >
              <View style={{ gap: sp[6] }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                  <MonoLabel>{`[${String(i + 1).padStart(2, "0")}]`}</MonoLabel>
                  <T variant="body" weight="bold" style={{ flex: 1 }}>
                    {f.q}
                  </T>
                  {expanded ? (
                    <ChevronUp size={18} color={p.textMuted} />
                  ) : (
                    <ChevronDown size={18} color={p.textMuted} />
                  )}
                </View>
                {expanded ? (
                  <T variant="body" color="secondary">
                    {f.a}
                  </T>
                ) : null}
              </View>
            </LedgerRow>
          );
        })}
      </RowList>

      <T variant="h4" weight="bold">
        مسارات أخرى
      </T>
      <View style={{ gap: sp[8] }}>
        <Button
          label="التواصل والتسجيل"
          kind="ghost"
          small
          icon={<LifeBuoy size={16} color={p.text} />}
          onPress={() => router.push("/contact" as never)}
        />
        <Button
          label="إمكانية الوصول"
          kind="ghost"
          small
          onPress={() => router.push("/legal/accessibility" as never)}
        />
        <Button
          label={ABOUT_MADAREK}
          kind="ghost"
          small
          onPress={() => router.push("/about" as never)}
        />
      </View>

      <Card>
        <T variant="sm" color="muted">
          الأجوبة مما يعمل اليوم — لغير ذلك، قناة التواصل.
        </T>
      </Card>
    </Screen>
  );
}
