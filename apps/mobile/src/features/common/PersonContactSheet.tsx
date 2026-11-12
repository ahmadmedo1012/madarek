/**
 * PersonContactSheet — r349-P4: «بيانات الاتصال» على الموبايل.
 *
 * The shaped /people/:id payload rendered as a contact card with the
 * native verbs the platform owes this surface: tap-to-call (tel:),
 * WhatsApp (wa.me), copy — plus «طلب تواصل» on the masked/private
 * lane (the web PeoplePages parity, mobile-sized). Access decisions
 * are SERVER-SIDE (privacy.ts); this sheet renders exactly what the
 * shaped payload carries — a masked phone renders masked with the
 * request affordance, a hidden one never renders at all.
 */
import { useState } from "react";
import { Linking, View } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import MessageCircle from "lucide-react-native/icons/message-circle";
import Phone from "lucide-react-native/icons/phone";
import { Sheet, Badge, Hairline } from "@/components/ui/surfaces";
import { T } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { StatLine } from "@/components/ui/data";
import { Skeleton } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { peopleApi, type Person, type PhoneView } from "@/api/people";
import { telHref, waHref } from "@/lib/phone-validation";
import { copyTextWithToast } from "@/features/ai/clipboard";
import { humanizeError } from "@/lib/errors";
import { haptics } from "@/haptics";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";

/** PREFERRED_CONTACT labels (web PeoplePages parity). */
const PREFERRED_LABELS: Record<string, string> = {
  PHONE: "الهاتف",
  WHATSAPP: "واتساب",
  EMAIL: "البريد",
  OFFICE_HOURS: "ساعات المكتب",
};

export function personDisplayName(person: Person): string {
  return (
    person.nameAr ??
    `${person.user.firstName} ${person.user.lastName}`.trim() ??
    "—"
  );
}

/**
 * The contact verb row for a shaped phone view: call / WhatsApp / copy
 * on the visible lane, the masked display + «طلب تواصل» on the masked
 * lane, nothing on HIDDEN.
 */
export function PhoneVerbRow({
  phone,
  onRequest,
  requestPending,
  requested,
}: {
  phone: PhoneView;
  onRequest?: () => void;
  requestPending?: boolean;
  requested?: boolean;
}) {
  const p = usePalette();
  if (phone.access === "HIDDEN" || !phone.display) return null;

  const tel = telHref(phone.display);
  const wa = waHref(phone.display);
  const masked = phone.access === "MASKED";
  const canRequest = phone.canRequestContact && onRequest;

  return (
    <View style={{ gap: sp[8] }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8], flexWrap: "wrap" }}>
        <T variant="body" weight="bold" style={{ direction: "ltr", fontVariant: ["tabular-nums"] }}>
          {phone.display}
        </T>
        {masked ? <Badge label="مقنّع" tone="yellow" /> : null}
        {tel && !masked ? (
          <>
            <Button
              small
              kind="ghost"
              label="اتصال"
              icon={<Phone size={14} color={p.text} />}
              accessibilityLabel={`اتصال بـ ${phone.display}`}
              onPress={() => {
                void Linking.openURL(tel).catch(() => toast.error("تعذّر فتح الهاتف"));
              }}
            />
            <Button
              small
              kind="ghost"
              label="واتساب"
              icon={<MessageCircle size={14} color={p.text} />}
              accessibilityLabel={`مراسلة ${phone.display} على واتساب`}
              onPress={() => {
                void Linking.openURL(wa!).catch(() => toast.error("تعذّر فتح واتساب"));
              }}
            />
          </>
        ) : null}
        <Button
          small
          kind="ghost"
          label="نسخ"
          accessibilityLabel="نسخ الرقم"
          onPress={() => copyTextWithToast(tel ?? phone.display ?? "", "رقم الهاتف")}
        />
      </View>
      {masked ? (
        <T variant="xs" color="faint">
          صاحب الرقم جعله خاصًا — يظهر مقنّعًا لك.
        </T>
      ) : null}
      {canRequest ? (
        <Button
          small
          kind={requested ? "ghost" : "primary"}
          label={requested ? "أُرسل الطلب" : "طلب تواصل"}
          icon={<MessageCircle size={14} color={requested ? p.text : p.primaryFg} />}
          loading={requestPending}
          disabled={requested || requestPending}
          onPress={onRequest}
        />
      ) : null}
    </View>
  );
}

/** The sheet itself: fetch /people/:id, render the contact card. */
export function PersonContactSheet({
  personId,
  onClose,
}: {
  personId: string;
  onClose: () => void;
}) {
  const [requested, setRequested] = useState(false);

  const person = useQuery({
    queryKey: ["people", "person", personId],
    queryFn: () => peopleApi.person(personId),
  });

  const request = useMutation({
    mutationFn: () =>
      peopleApi.contactRequest(personId, {
        channel: "student",
        message: "طلب تواصل من تطبيق مدارك",
      }),
    onSuccess: () => {
      setRequested(true);
      haptics.notify("success");
      toast.success("أُرسل الطلب — سيصلك الرد عبر الإشعارات", "طلب تواصل");
    },
    onError: (e) => {
      haptics.notify("error");
      toast.error(humanizeError(e), "تعذّر إرسال الطلب");
    },
  });

  const data = person.data;

  return (
    <Sheet
      open
      onClose={onClose}
      title={data ? `بيانات الاتصال · ${personDisplayName(data)}` : "بيانات الاتصال"}
    >
      {person.isLoading ? (
        <View style={{ gap: sp[10] }}>
          <Skeleton h={28} />
          <Skeleton h={28} />
          <Skeleton h={28} />
        </View>
      ) : person.isError ? (
        <View style={{ gap: sp[10] }}>
          <T variant="body" color="muted">
            {humanizeError(person.error)}
          </T>
          <Button small kind="ghost" label="إعادة المحاولة" onPress={() => person.refetch()} />
        </View>
      ) : data ? (
        <View style={{ gap: sp[12] }}>
          {/* the kind + department line */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8], flexWrap: "wrap" }}>
            <Badge label={data.kind === "student" ? "طالب" : "مدرّس"} tone={data.kind === "student" ? "sky" : "mint"} />
            {data.kind === "student" && data.faculty ? (
              <T variant="xs" color="muted">
                {data.faculty.name}
                {data.department ? ` · ${data.department.name}` : ""}
              </T>
            ) : null}
            {data.kind === "teacher" && data.department ? (
              <T variant="xs" color="muted">
                {data.department.name}
                {data.department.faculty ? ` · ${data.department.faculty.name}` : ""}
              </T>
            ) : null}
          </View>

          {/* the shaped phone + verbs */}
          <StatLine label="الهاتف" value={data.phone.display ?? (data.phone.access === "HIDDEN" ? "غير متاح" : "—")} />
          <PhoneVerbRow
            phone={data.phone}
            onRequest={request.isPending || requested ? undefined : () => request.mutate()}
            requestPending={request.isPending}
            requested={requested}
          />

          {/* the student's guardian lane (shaped) */}
          {data.kind === "student" && data.guardian && data.guardian.phone.display ? (
            <>
              <Hairline />
              <T variant="sm" weight="bold">
                ولي الأمر{data.guardian.name ? ` · ${data.guardian.name}` : ""}
                {data.guardian.relationship ? ` (${data.guardian.relationship})` : ""}
              </T>
              <PhoneVerbRow phone={data.guardian.phone} />
            </>
          ) : null}

          {/* the teacher's official lanes */}
          {data.kind === "teacher" ? (
            <>
              <Hairline />
              {data.officialPhone ? (
                <>
                  <StatLine label="الهاتف الرسمي" value={data.officialPhone} />
                  <PhoneVerbRow
                    phone={{ access: "VISIBLE", display: data.officialPhone, canRequestContact: false }}
                  />
                </>
              ) : null}
              {data.officialEmail ? <StatLine label="البريد الرسمي" value={data.officialEmail} /> : null}
              {data.officeLocation ? <StatLine label="المكتب" value={data.officeLocation} /> : null}
              {data.officeHours ? <StatLine label="ساعات المكتب" value={data.officeHours} /> : null}
              {data.preferredContact ? (
                <T variant="xs" color="faint">
                  يفضّل التواصل عبر: {PREFERRED_LABELS[data.preferredContact] ?? data.preferredContact}
                </T>
              ) : null}
            </>
          ) : null}

          <T variant="xs" color="faint" style={{ paddingTop: sp[4] }}>
            الظهور محكوم بإعدادات الخصوصية لدى صاحب الملف — ما لا يُسمح لك لا يظهر هنا.
          </T>
        </View>
      ) : null}
    </Sheet>
  );
}
