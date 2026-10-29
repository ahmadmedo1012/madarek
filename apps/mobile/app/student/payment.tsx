import { View } from "react-native";
import { Wallet } from "lucide-react-native";
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
      <StackHeader title="الشؤون المالية" kicker="حالة رسومك الجامعية" />

      <EmptyState
        icon={<Wallet size={26} color={p.textFaint} />}
        title="لا توجد رسوم أو بيانات مالية مسجّلة في النظام بعد — هذه الصفحة قيد التطوير."
      />

      <Card style={{ gap: sp[8] }}>
        <T variant="body" color="secondary">
          تكامل الدفع الإلكترونيّ مع نظام الخزينة الجامعيّة قيد التطوير، والمنصّة لا تعرض أيّ مبالغ تقديريّة.
        </T>
        <T variant="sm" color="muted">
          رصيدك الفعليّ وسجلّ سدادك مصدرهما مكتب الشؤون الماليّة — راجعه في كليّتك عند الحاجة.
        </T>
      </Card>

      <View style={{ gap: sp[4] }}>
        <T variant="xs" color="faint">
          الإعلانات الرسميّة الخاصّة بالرسوم ومواعيدها تُنشر على لوحة المجتمع الجامعيّ.
        </T>
      </View>
    </Screen>
  );
}
