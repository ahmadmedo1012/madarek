import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { usePalette } from "../src/design/theme";
import { sp } from "../src/design/tokens";
import { Screen } from "../src/components/ui/screen";
import { T } from "../src/components/ui/text";
import { Button } from "../src/components/ui/pressables";
import { BrandMark } from "../src/components/ui/brand";

export default function NotFound() {
  const p = usePalette();
  return (
    <Screen scroll>
      <View style={{ alignItems: "center", paddingTop: sp[56], gap: sp[12] }}>
        <BrandMark size={56} />
        <T variant="h2" weight="bold">الصفحة غير موجودة</T>
        <T variant="body" color="muted" align="center">
          الرابط الذي طلبته غير متاح في التطبيق — عُد إلى لوحتك أو إلى صفحة البداية.
        </T>
        <View style={{ flexDirection: "row", gap: sp[8], marginTop: sp[8] }}>
          <View style={{ borderWidth: StyleSheet.hairlineWidth, borderColor: p.border }}>
            <Button label="الرئيسية" kind="primary" onPress={() => router.replace("/")} small />
          </View>
        </View>
      </View>
    </Screen>
  );
}
