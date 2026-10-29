import { useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { HardDrive, Settings } from "lucide-react-native";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen, SectionBar } from "@/components/ui";
import { T, MonoLabel } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { Badge, ConfirmDialog, Sheet } from "@/components/ui/surfaces";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { Field } from "@/components/ui/fields";
import { SkeletonList, EmptyState, ErrorState } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { ownerApi } from "@/api/owner";
import { ApiError } from "@/api/client";
import { fromNow } from "@/lib/format";
import {
  FlagToggle,
  countAr,
  numOf,
  textOf,
  type SystemRow,
} from "@/features/governance/components";

/** Storage drivers → Arabic labels (web OwnerSystemPage parity). */
const STORAGE_DRIVER_LABEL: Record<string, string> = {
  local: "محليّ — قرص الخادم",
  s3: "تخزين كائنات (S3-متوافق)",
};

/** The payload row carries `name` too (Prisma FeatureFlag) — render it. */
interface FlagRow {
  slug: string;
  enabled: boolean;
  description?: string;
  name?: string;
}

/**
 * Pushed: /owner/system — «النظام والتشغيل» (web OwnerSystemPage parity):
 * service health + the upload-storage truth (driver chip + durability/
 * reachability), the platform-settings editor (per-key sheet over
 * PUT /owner/settings/:key), and the feature-flag board (FlagToggle rows
 * over PUT /owner/feature-flags/:slug, confirm-gated, honest about the
 * registry-only effect).
 */
export default function OwnerSystem() {
  const qc = useQueryClient();
  const [editKey, setEditKey] = useState<{ key: string; value: string } | null>(null);
  const [flagConfirm, setFlagConfirm] = useState<FlagRow | null>(null);

  const sys = useQuery({
    queryKey: ["owner", "system"],
    queryFn: async () => (await ownerApi.system()) as SystemRow,
  });
  const settings = useQuery({
    queryKey: ["owner", "settings"],
    queryFn: () => ownerApi.settings(),
  });
  const flags = useQuery({
    queryKey: ["owner", "feature-flags"],
    queryFn: async () => (await ownerApi.featureFlags()) as FlagRow[],
  });

  const setSetting = useMutation({
    mutationFn: (payload: { key: string; value: string }) =>
      ownerApi.setSetting(payload.key, payload.value),
    onSuccess: (_d, payload) => {
      qc.invalidateQueries({ queryKey: ["owner", "settings"] });
      toast.success(`حُفظ الإعداد «${payload.key}».`, "تمّ الحفظ");
    },
    onError: (e) => toast.error((e as ApiError).message, "تعذّر حفظ الإعداد"),
  });

  const setFlag = useMutation({
    mutationFn: (payload: { slug: string; enabled: boolean; name?: string }) =>
      ownerApi.setFeatureFlag(payload.slug, payload.enabled),
    onSuccess: (_d, payload) => {
      qc.invalidateQueries({ queryKey: ["owner", "feature-flags"] });
      toast.success(
        payload.enabled
          ? `فُعِّلت الميزة «${payload.name ?? payload.slug}».`
          : `عُطِّلت الميزة «${payload.name ?? payload.slug}».`,
        "أعلام الميزات",
      );
    },
    onError: (e) => toast.error((e as ApiError).message, "تعذّر تحديث العلم"),
  });

  const s = sys.data;
  const storage = s?.storage ?? null;
  const driver = storage?.driver ?? null;
  const durability =
    driver === "s3"
      ? storage?.reachable === true
        ? { label: "دائمة", tone: "mint" as const, note: storage.checkedAt ? `آخر تحقّق: ${fromNow(storage.checkedAt)}` : null }
        : storage?.reachable === false
          ? { label: "مهيَّأ لكن يتعذّر الوصول الآن", tone: "rose" as const, note: "الرفعات الجديدة ستفشل حتى يعود المخزن." }
          : { label: "لم يُتحقق بعد", tone: "yellow" as const, note: "لم يتحقّق الخادم من اتصال المخزن بعد." }
      : driver
        ? storage?.persistent
          ? { label: "دائمة", tone: "mint" as const, note: null }
          : { label: "لا تنجو من إعادة النشر", tone: "yellow" as const, note: "أوراق البحث وملفات المقرّرات المرفوعة ستُفقد عند كل نشر جديد — دوامها يتطلب تخزين كائنات (S3)." }
        : null;

  const settingRows = Array.isArray(settings.data) ? settings.data : [];
  const flagRows = Array.isArray(flags.data) ? flags.data : [];

  return (
    <Screen scroll>
      <StackHeader title="النظام والتشغيل" kicker="لوحة المالك" />
      <View style={{ gap: 16, paddingTop: 16 }}>
        <View>
          <T variant="h2" weight="bold">
            النظام والتشغيل
          </T>
          <T variant="body" color="muted">
            إدارة البنية التحتية وحالة الخدمات وإعدادات المنصّة
          </T>
        </View>

        {/* [01] حالة الخدمة */}
        <View>
          <SectionBar index={1} title="حالة الخدمة" />
          {sys.isLoading ? (
            <SkeletonList rows={3} rowHeight={48} />
          ) : sys.isError ? (
            <ErrorState
              message={(sys.error as Error).message}
              onRetry={() => sys.refetch()}
              compact
            />
          ) : (
            <RowList>
              <LedgerRow last>
                <StatLine
                  label="حالة الخدمة"
                  value={sys.isError ? "تعذّر الاتصال" : s ? "متصل" : null}
                  hint="من حالة الاستعلام الحيّ"
                />
                <StatLine
                  label="آخر مزامنة"
                  value={s?.sync?.lastRunAt ? fromNow(s.sync.lastRunAt) : null}
                  hint="مع المصدر الرسميّ"
                />
                <StatLine
                  label="تنبيهات حرجة مفتوحة"
                  value={numOf(s?.alerts?.criticalCount)}
                  hint={
                    numOf(s?.alerts?.criticalCount) === 0
                      ? "لا شيء حرجًا"
                      : (numOf(s?.alerts?.criticalCount) ?? 0) > 0
                        ? "تستوجب قرارًا"
                        : null
                  }
                  tone={
                    (numOf(s?.alerts?.criticalCount) ?? 0) > 0 ? "danger" : undefined
                  }
                />
                <StatLine
                  label="أحداث آخر 7 أيام"
                  value={numOf(s?.activity?.recentEventsLast7Days)}
                  hint="سجلّ تشغيليّ"
                />
              </LedgerRow>
            </RowList>
          )}
        </View>

        {/* [02] تخزين الرفعات (PDF) */}
        <View>
          <SectionBar index={2} title="تخزين الرفعات (PDF)" />
          {sys.isLoading ? (
            <SkeletonList rows={2} rowHeight={48} />
          ) : !storage ? (
            <RowList>
              <LedgerRow last>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <HardDrive size={18} color="#62625F" />
                  <T variant="body" color="muted">
                    {sys.isError ? "—" : "غير متوفر"}
                  </T>
                </View>
                <T variant="xs" color="faint">
                  {sys.isError
                    ? "تعذّر جلب حالة النظام — أعد المحاولة من بطاقة حالة الخدمة."
                    : "نسخة الخادم الحاليّة لا تُصرّح عن حالة تخزين الرفعات بعد."}
                </T>
              </LedgerRow>
            </RowList>
          ) : (
            <RowList>
              <LedgerRow last>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <T variant="sm" color="muted">
                    السائق
                  </T>
                  <Badge
                    label={driver ? (STORAGE_DRIVER_LABEL[driver] ?? driver) : "—"}
                    tone={driver === "s3" ? "sky" : driver === "local" ? "yellow" : "grey"}
                    mono={driver != null && !(driver in STORAGE_DRIVER_LABEL)}
                  />
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <T variant="sm" color="muted">
                    دوام الملفات المرفوعة
                  </T>
                  {durability ? <Badge label={durability.label} tone={durability.tone} /> : null}
                </View>
                {durability?.note ? (
                  <T variant="xs" color="faint">
                    {durability.note}
                  </T>
                ) : null}
              </LedgerRow>
            </RowList>
          )}
        </View>

        {/* [03] إعدادات المنصّة */}
        <View>
          <SectionBar index={3} title="إعدادات المنصّة" />
          {settings.isLoading ? (
            <SkeletonList rows={3} rowHeight={48} />
          ) : settings.isError ? (
            <ErrorState
              message={(settings.error as Error).message}
              onRetry={() => settings.refetch()}
              compact
            />
          ) : settingRows.length === 0 ? (
            <T variant="body" color="muted">
              لا توجد إعدادات مُعرَّفة بعد — القيم الافتراضية تعمل.
            </T>
          ) : (
            <RowList>
              {settingRows.map((row, i) => {
                const raw = row.value;
                const initial = typeof raw === "string" ? raw : raw == null ? "" : JSON.stringify(raw);
                return (
                  <LedgerRow
                    key={row.key}
                    onPress={() => setEditKey({ key: row.key, value: initial })}
                    accessibilityLabel={`تعديل الإعداد ${row.key}`}
                    last={i === settingRows.length - 1}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <MonoLabel>{row.key}</MonoLabel>
                      {row.category ? <Badge label={row.category} tone="grey" mono /> : null}
                    </View>
                    <T variant="sm" color="secondary" numberOfLines={2}>
                      {textOf(row.value)}
                    </T>
                  </LedgerRow>
                );
              })}
            </RowList>
          )}
          <T variant="xs" color="faint">
            تُحفَظ القيمة في قاعدة البيانات وتُوثَّق في سجلّ النشاط — لا يستهلكها مسار تشغيل بعد؛ سلوك
            المنصّة يبقى بقيمه المضمّنة في الشيفرة.
          </T>
        </View>

        {/* [04] أعلام الميزات */}
        <View>
          <SectionBar index={4} title="أعلام الميزات (Feature Flags)" />
          {flags.isLoading ? (
            <SkeletonList rows={3} rowHeight={56} />
          ) : flags.isError ? (
            <ErrorState
              message={(flags.error as Error).message}
              onRetry={() => flags.refetch()}
              compact
            />
          ) : flagRows.length === 0 ? (
            <EmptyState
              icon={<Settings size={22} color="#62625F" />}
              title="لا توجد أعلام مُعرَّفة"
              message="لم تُعرَّف أعلام ميزات بعد؛ تُدار حالياً مباشرةً من قاعدة بيانات المنصّة."
            />
          ) : (
            <RowList>
              {flagRows.map((f, i) => (
                <LedgerRow key={f.slug} last={i === flagRows.length - 1}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T variant="body" weight="bold" numberOfLines={1}>
                        {f.name ?? f.slug}
                      </T>
                      <MonoLabel>{f.slug}</MonoLabel>
                      {f.description ? (
                        <T variant="xs" color="muted" numberOfLines={2}>
                          {f.description}
                        </T>
                      ) : null}
                    </View>
                    <FlagToggle
                      checked={f.enabled}
                      label={f.name ?? f.slug}
                      disabled={setFlag.isPending && setFlag.variables?.slug === f.slug}
                      onPress={() => setFlagConfirm(f)}
                    />
                  </View>
                </LedgerRow>
              ))}
            </RowList>
          )}
          <T variant="xs" color="faint">
            تُحفَظ حالة كل علم في قاعدة البيانات وتُوثَّق في سجلّ النشاط — لا تستهلكها أيّ بوابة تشغيل
            بعد، فلا يتغيّر سلوك المنصّة بتغييرها.
          </T>
        </View>

        {s?.alerts?.openCount != null && s.alerts.openCount > 0 ? (
          <T variant="xs" color="faint">
            {countAr(s.alerts.openCount, [
              "تنبيه مفتوح واحد",
              "تنبيهان مفتوحان",
              "تنبيهات مفتوحة",
              "تنبيهاً مفتوحاً",
            ])}{" "}
            حالياً — تُدار من لوحة «التنبيهات التشغيليّة».
          </T>
        ) : null}
      </View>

      <SettingEditSheet
        open={editKey !== null}
        onClose={() => setEditKey(null)}
        draft={editKey}
        setSetting={setSetting}
      />

      <ConfirmDialog
        open={flagConfirm !== null}
        title={flagConfirm?.enabled ? "تعطيل الميزة" : "تفعيل الميزة"}
        confirmLabel={flagConfirm?.enabled ? "تعطيل الميزة" : "تفعيل الميزة"}
        danger={flagConfirm?.enabled ?? false}
        message={
          flagConfirm
            ? flagConfirm.enabled
              ? `هل تريد تعطيل «${flagConfirm.name ?? flagConfirm.slug}»؟ سيُسجَّل الإجراء في سجلّ النشاط، ويمكن إعادته في أي وقت من هذه البطاقة.`
              : `هل تريد تفعيل «${flagConfirm.name ?? flagConfirm.slug}»؟ سيُسجَّل الإجراء في سجلّ النشاط، ويمكن التراجع عنه من هذه البطاقة.`
            : ""
        }
        loading={setFlag.isPending}
        onConfirm={() => {
          if (flagConfirm) {
            setFlag.mutate({
              slug: flagConfirm.slug,
              enabled: !flagConfirm.enabled,
              name: flagConfirm.name,
            });
          }
          setFlagConfirm(null);
        }}
        onCancel={() => setFlagConfirm(null)}
      />
    </Screen>
  );
}

/* ─── Per-key settings sheet — PUT /owner/settings/:key ─── */

function SettingEditSheet({
  open,
  onClose,
  draft,
  setSetting,
}: {
  open: boolean;
  onClose: () => void;
  draft: { key: string; value: string } | null;
  setSetting: UseMutationResult<unknown, Error, { key: string; value: string }>;
}) {
  const [value, setValue] = useState("");
  const [seededKey, setSeededKey] = useState<string | null>(null);

  // Seed the field when a different key opens (the sheet stays mounted).
  if (draft && draft.key !== seededKey) {
    setSeededKey(draft.key);
    setValue(draft.value);
  }
  const canSave = draft != null && value.trim().length > 0 && !setSetting.isPending;

  return (
    <Sheet open={open} onClose={onClose} title={draft ? `تعديل «${draft.key}»` : "تعديل الإعداد"}>
      <View style={{ gap: 12 }}>
        {draft ? <MonoLabel>{draft.key}</MonoLabel> : null}
        <Field
          label="قيمة الإعداد"
          value={value}
          onChangeText={setValue}
          hint="تُحفَظ كما هي (نصّ) وتُوثَّق في سجلّ النشاط"
          autoCorrect={false}
        />
        <Button
          label={setSetting.isPending ? "جارٍ الحفظ…" : "حفظ الإعداد"}
          kind="primary"
          disabled={!canSave}
          onPress={() => {
            if (!draft) return;
            setSetting.mutate(
              { key: draft.key, value: value.trim() },
              {
                onSuccess: () => onClose(),
              },
            );
          }}
        />
        {setSetting.isError ? (
          <T variant="sm" color="danger">
            {(setSetting.error as ApiError)?.message ?? "تعذّر حفظ الإعداد — حاول مجدداً."}
          </T>
        ) : null}
      </View>
    </Sheet>
  );
}
