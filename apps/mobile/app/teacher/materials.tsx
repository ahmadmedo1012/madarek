/**
 * materials — الملفات التعليمية. Web parity: MaterialsPage (my materials
 * rows: type icon, course, views/downloads, size, updated) + the
 * two-channel add sheet: «رفع PDF» (raw-bytes uploadRawPdf with progress)
 * | «رابط خارجي» (the by-link addMaterial contract).
 */
import { useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StackHeader } from "@/components/shell/AppTopBar";
import { teacherApi } from "@/api/teacher";
import { pickPdf, uploadRawPdf, validatePdf } from "@/api/pdf";
import type { File } from "expo-file-system";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { latn, sizeLabel, fromNow } from "@/lib/format";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { Screen, PageHeader, SectionBar } from "@/components/ui/screen";
import { Badge, Card, Sheet } from "@/components/ui/surfaces";
import { LedgerRow, ProgressBar, RowList } from "@/components/ui/data";
import { Button } from "@/components/ui/pressables";
import { Field, Segmented, SelectField } from "@/components/ui/fields";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { MATERIAL_TYPE_LABEL, OfferingPicker, useTeacherOfferings } from "@/features/teacher/components";

type MaterialWire = {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  sizeBytes: number | string;
  url: string;
  views?: number;
  downloads?: number;
  createdAt?: string;
  course?: { code?: string; name?: string } | null;
  offeringId?: string;
};

const TYPE_OPTIONS = ["PDF", "PPT", "VIDEO", "DOC", "ZIP", "IMAGE", "OTHER"];

export default function Materials() {
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const offs = useTeacherOfferings();
  const offerings = offs.data ?? [];

  const materials = useQuery({
    queryKey: ["teacher", "me", "materials", scope],
    queryFn: () => teacherApi.materials(),
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [mode, setMode] = useState<"pdf" | "link">("pdf");
  const [offeringId, setOfferingId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("PDF");
  const [url, setUrl] = useState("");
  const [sizeBytes, setSizeBytes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const effectiveOfferingId = offeringId || offerings[0]?.id || "";

  const addLink = useMutation({
    mutationFn: async () => {
      if (effectiveOfferingId === "") throw new Error("اختر المقرّر أولاً.");
      if (name.trim().length < 1) throw new Error("اسم الملف مطلوب.");
      if (!/^https:\/\//.test(url.trim())) throw new Error("الرابط يجب أن يبدأ بـ https://");
      return teacherApi.addMaterial(effectiveOfferingId, {
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        url: url.trim(),
        sizeBytes: sizeBytes.trim() !== "" && Number.isFinite(Number(sizeBytes)) ? Number(sizeBytes) : undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher", "me", "materials"] });
      toast.success("أُضيف الملف إلى المقرّر وسيظهر لطلابه فوراً.", "تمّت الإضافة");
      setSheetOpen(false);
      resetForm();
    },
    onError: (e) => setError((e as Error).message),
  });

  const uploadPdf = useMutation({
    mutationFn: async () => {
      if (effectiveOfferingId === "") throw new Error("اختر المقرّر أولاً.");
      if (name.trim().length < 1) throw new Error("اسم الملف مطلوب.");
      if (!file) throw new Error("اختر ملف PDF للرفع.");
      await validatePdf(file);
      setProgress(0);
      const path =
        `/offerings/${effectiveOfferingId}/materials/file?name=${encodeURIComponent(name.trim())}` +
        `&type=PDF&description=${encodeURIComponent(description.trim())}`;
      return uploadRawPdf(file, path, (fraction) => setProgress(Math.round(fraction * 100)));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher", "me", "materials"] });
      toast.success("أُضيف الملف إلى المقرّر وسيظهر لطلابه فوراً.", "تمّت الإضافة");
      setSheetOpen(false);
      resetForm();
    },
    onError: (e) => setError((e as Error).message),
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setUrl("");
    setSizeBytes("");
    setFile(null);
    setType("PDF");
    setError(null);
    setProgress(0);
  };

  const busy = mode === "pdf" ? uploadPdf.isPending : addLink.isPending;
  const rows = (materials.data ?? []) as unknown as MaterialWire[];

  return (
    <Screen scroll>
      <StackHeader title="الملفات التعليمية" />
      <PageHeader
        title="الملفات التعليمية"
        kicker="ملفّاتك المرفوعة على مقرّراتك — مع عدد المشاهدات والتحميلات الفعليّ."
      />
      <SectionBar
        index={1}
        title="ملفاتك"
        action={
          <Button label="إضافة مادة" kind="accent" small onPress={() => setSheetOpen(true)} />
        }
      />
      {materials.isLoading ? (
        <SkeletonList rows={5} />
      ) : materials.isError ? (
        <ErrorState message={(materials.error as Error).message} onRetry={() => materials.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="لم ترفع ملفات بعد"
          message="أضف أول مادة بزر «إضافة مادة» بالأعلى — سيظهر لطلاب المقرّر فوراً."
          actionLabel="إضافة مادة"
          onAction={() => setSheetOpen(true)}
        />
      ) : (
        <RowList>
          {rows.map((m, i) => (
            <LedgerRow key={m.id} last={i === rows.length - 1} accessibilityLabel={`مادة ${m.name}`}>
              <T variant="body" weight="medium" numberOfLines={2}>
                {m.name}
              </T>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp[6], alignItems: "center" }}>
                {m.course?.name ? (
                  <T variant="xs" color="muted">
                    {m.course.name}
                  </T>
                ) : null}
                <Badge label={MATERIAL_TYPE_LABEL[m.type] ?? m.type} tone="grey" mono />
                <T variant="xs" color="muted">
                  {latn(m.views ?? 0)} مشاهدة · {latn(m.downloads ?? 0)} تحميل
                </T>
              </View>
              <T variant="xs" color="faint">
                {m.sizeBytes ? sizeLabel(m.sizeBytes) : "—"}
                {m.createdAt ? ` · حُدِّث ${fromNow(m.createdAt)}` : ""}
              </T>
            </LedgerRow>
          ))}
        </RowList>
      )}

      {/* إضافة مادة — the two honest channels. */}
      <Sheet open={sheetOpen} onClose={() => { if (!busy) setSheetOpen(false); }} title="إضافة مادة">
        <Segmented
          options={[
            { id: "pdf", label: "رفع PDF" },
            { id: "link", label: "رابط/JSON" },
          ]}
          selectedId={mode}
          onSelect={(id) => {
            setMode(id as "pdf" | "link");
            setError(null);
          }}
        />
        <OfferingPicker
          offerings={offerings}
          value={effectiveOfferingId}
          onChange={setOfferingId}
          label="المقرّر"
          loading={offs.isLoading}
        />
        <Field
          label="اسم المادة"
          value={name}
          onChangeText={(v) => setName(v)}
          placeholder="مثال: محاضرة الأسبوع الثالث — الشرائح"
          accessibilityLabel="اسم المادة"
        />
        {mode === "pdf" ? (
          <>
            <Button
              label={file ? "اختيار ملف آخر" : "اختيار ملف PDF"}
              kind="ghost"
              onPress={async () => {
                setError(null);
                try {
                  const picked = await pickPdf();
                  if (picked) {
                    setFile(picked);
                    const fname =
                      ((picked as unknown as { name?: string }).name ?? "").replace(/\.pdf$/i, "");
                    if (name.trim() === "" && fname !== "") setName(fname);
                  }
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            />
            <T variant="sm" color="muted">
              {file
                ? `تم اختيار الملف — جاهز للرفع (${sizeLabel(file.size)})`
                : "ملفات PDF فقط، بحد أقصى 20 ميغابايت."}
            </T>
            {uploadPdf.isPending ? (
              <View style={{ gap: sp[4] }}>
                <ProgressBar ratio={progress / 100} accent label="جارٍ رفع الملف" />
                <T variant="xs" color="muted">
                  جارٍ رفع الملف… {latn(progress)}%
                </T>
              </View>
            ) : null}
          </>
        ) : (
          <>
            <SelectField
              label="النوع"
              value={{ id: type, label: MATERIAL_TYPE_LABEL[type] ?? type }}
              options={TYPE_OPTIONS.map((t) => ({ id: t, label: MATERIAL_TYPE_LABEL[t] ?? t }))}
              onSelect={setType}
              sheetTitle="النوع"
            />
            <Field
              label="الرابط (https)"
              value={url}
              onChangeText={setUrl}
              placeholder="https://…"
              accessibilityLabel="الرابط"
            />
            <Field
              label="الحجم بالبايت (اختياري)"
              value={sizeBytes}
              onChangeText={setSizeBytes}
              hint="عدد البايتات كما يظهر على خدمة الملفات"
              keyboardType="number-pad"
              accessibilityLabel="الحجم بالبايت"
            />
          </>
        )}
        <Field
          label="الوصف (اختياري)"
          value={description}
          onChangeText={setDescription}
          placeholder="وصف مختصر يساعد الطالب على معرفة محتوى المادة…"
          accessibilityLabel="الوصف"
        />
        {error ? (
          <T variant="sm" color="danger">
            {error}
          </T>
        ) : null}
        <Button
          label={mode === "pdf" ? (busy ? "جارٍ رفع الملف…" : "إضافة المادة") : busy ? "جارٍ الإضافة…" : "إضافة المادة"}
          kind="accent"
          loading={busy}
          disabled={offerings.length === 0}
          onPress={() => {
            setError(null);
            if (mode === "pdf") uploadPdf.mutate();
            else addLink.mutate();
          }}
        />
      </Sheet>
    </Screen>
  );
}
