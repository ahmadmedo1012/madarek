import { View } from "react-native";
import Wallet from "lucide-react-native/icons/wallet";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui/screen";
import { Card } from "@/components/ui/surfaces";
import { EmptyState } from "@/components/ui/states";

/**
 * /student/payment — الشؤون المالية (web PaymentPage parity, mobile
 * honest-empty): the platform's data model has no Fee / Payment /
 * Invoice entities, so this screen renders no figures and no checkout —
 * only the honest «قيد التطوير» disclosure.
 */
export default function PaymentScreen() {
  const p = usePalette();
  return (
    <Screen scroll>
      <StackHeader title="الشؤون المالية" />

      <EmptyState
        icon={<Wallet size={26} color={p.textFaint} />}
        title="لا رسوم — الصفحة قيد التطوير."
      />

      <Card style={{ gap: sp[8] }}>
        <T variant="body" color="secondary">
          الدفع الإلكترونيّ قيد التطوير — لا مبالغ تقديريّة.
        </T>
        <T variant="sm" color="muted">
          رصيدك وسجلّ سدادك من الشؤون الماليّة بكليّتك.
        </T>
      </Card>

      <View style={{ gap: sp[4] }}>
        <T variant="xs" color="faint">
          إعلانات الرسوم ومواعيدها في لوحة المجتمع.
        </T>
      </View>
    </Screen>
  );
}
