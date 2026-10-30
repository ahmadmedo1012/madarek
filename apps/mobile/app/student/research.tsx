import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, ScanSearch, Upload } from "lucide-react-native";
import type { File } from "expo-file-system";
import { studentApi } from "@/api/student";
import { researchApi } from "@/api/research";
import { learningApi } from "@/api/learning";
import { pickPdf, uploadRawPdf, validatePdf } from "@/api/pdf";
import type { ResearchPaper } from "@/api/types";
import { ApiError } from "@/api/client";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui/screen";
import { Badge, Card, SimulatedBadge, Sheet } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { Field, SelectField } from "@/components/ui/fields";
import { LedgerRow, RowList, ProgressBar } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { fullDate, latn } from "@/lib/format";
import { PAPER_STATUS_LABEL, PAPER_STATUS_TONE, SectionNote, scanLine } from "@/features/student/more";

/**
 * /student/research — بحوثي (web ResearchPage parity): paper rows with the
 * status-flow chips, the declared-simulation scan results, an upload sheet
 * (deep PDF validation → raw upload with progress → create → scan), and a
 * detail sheet with the real file deep link. extractedText never renders.
 */
export default function ResearchScreen() {
  const p = usePalette();
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const mine = useQuery({
    queryKey: ["research", "mine", scope],
    queryFn: () => studentApi.myResearch(),
    placeholderData: (p) => p,
  });
  const papers = mine.data ?? [];

  const [uploadOpen, setUploadOpen] = useState(false);
  const [detail, setDetail] = useState<ResearchPaper | null>(null);
  const scan = useMutation({
    mutationFn: (id: string) => researchApi.scan(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["research"] });
      toast.success("اكتمل الفحص — النتائج معروضة على البحث.", "فحص النزاهة");
    },
    onError: (e) => toast.error((e as ApiError).message, "تعذَّر إجراء الفحص"),
  });

  return (
    <Screen scroll>
      <StackHeader title="بحوثي" kicker="البحوث العلمية" />
      <SectionNote>
        ارفع بحوثك، اعرضها على فحص الانتحال وكشف الذكاء الاصطناعي (محاكاة حتى تفعيل كشف حقيقي)، ثم أرسلها لأستاذك للتقييم والنشر في مكتبة الجامعة.
      </SectionNote>
      <Button
        label="رفع بحث جديد"
        kind="accent"
        icon={<Upload size={16} color={p.accentFg} />}
        onPress={() => setUploadOpen(true)}
      />

      {mine.isLoading ? (
        <SkeletonList rows={4} />
      ) : mine.isError ? (
        <ErrorState message={(mine.error as Error).message} onRetry={() => mine.refetch()} />
      ) : papers.length === 0 ? (
        <EmptyState
          icon={<FileText size={24} color={p.textFaint} />}
          title="لم ترفع أي بحث بعد"
          message="ابدأ برفع أول بحث لك ليتم فحصه ثم تقييمه من قبل الأستاذ."
          actionLabel="رفع بحث جديد"
          onAction={() => setUploadOpen(true)}
        />
      ) : (
        <RowList>
          {papers.map((paper, i) => (
            <LedgerRow
              key={paper.id}
              last={i === papers.length - 1}
              onPress={() => setDetail(paper)}
              accessibilityLabel={`تفاصيل البحث: ${paper.title}`}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6], flexWrap: "wrap" }}>
                <Badge
                  label={PAPER_STATUS_LABEL[paper.status] ?? String(paper.status)}
                  tone={PAPER_STATUS_TONE[paper.status] ?? "grey"}
                />
                {paper.plagiarismPct != null || paper.aiContentPct != null ? <SimulatedBadge /> : null}
                {paper.grade != null ? <Badge label={`${latn(paper.grade)}/20`} tone="yellow" /> : null}
              </View>
              <T variant="bodyLg" weight="bold">
                {paper.title}
              </T>
              <T variant="sm" color="muted">
                {paper.uploadedAt ? `رُفع: ${fullDate(paper.uploadedAt)}` : "—"}
              </T>
              {(paper.plagiarismPct != null || paper.aiContentPct != null) && (
                <T variant="xs" color="secondary">
                  {scanLine(paper.plagiarismPct, paper.aiContentPct)}
                </T>
              )}
            </LedgerRow>
          ))}
        </RowList>
      )}

      <DetailSheet
        paper={detail}
        onClose={() => setDetail(null)}
        scanning={detail ? scan.isPending && scan.variables === detail.id : false}
        onScan={() => detail && scan.mutate(detail.id)}
      />

      <UploadSheet
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onDone={() => {
          setUploadOpen(false);
          void qc.invalidateQueries({ queryKey: ["research"] });
        }}
      />
    </Screen>
  );
}

/* ── Paper detail sheet ────────────────────────────────────────────── */
function DetailSheet({
  paper,
  onClose,
  scanning,
  onScan,
}: {
  paper: ResearchPaper | null;
  onClose: () => void;
  scanning: boolean;
  onScan: () => void;
}) {
  const p = usePalette();
  if (!paper) return null;
  const hasResults = paper.plagiarismPct != null || paper.aiContentPct != null;
  return (
    <Sheet open={!!paper} onClose={onClose} title={paper.title}>
      <View style={{ gap: sp[12] }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6], flexWrap: "wrap" }}>
          <Badge
            label={PAPER_STATUS_LABEL[paper.status] ?? String(paper.status)}
            tone={PAPER_STATUS_TONE[paper.status] ?? "grey"}
          />
          <SimulatedBadge note="الفحص" />
        </View>

        {paper.abstract ? (
          <View style={{ gap: sp[4] }}>
            <T variant="sm" weight="bold">
              الملخّص
            </T>
            <T variant="body" color="secondary">
              {paper.abstract}
            </T>
          </View>
        ) : null}

        {hasResults ? (
          <Card style={{ gap: sp[4] }}>
            <T variant="sm" weight="bold">
              نتائج الفحص
            </T>
            <T variant="body" color="secondary">
              {scanLine(paper.plagiarismPct, paper.aiContentPct)}
            </T>
            <T variant="xs" color="muted">
              فحص محاكاة — قيم استرشادية حتى تفعيل كشف حقيقي.
            </T>
          </Card>
        ) : paper.status === "SCANNING" ? (
          <SectionNote>الفحص الأوتوماتيكي يجري — النتائج تظهر هنا تلقائياً.</SectionNote>
        ) : (
          <SectionNote>لم يُجرَ الفحص بعد.</SectionNote>
        )}

        {paper.status === "CHECKS_FAILED" ? (
          <T variant="sm" color="danger">
            تجاوز البحث الحدود التجريبية المسموح بها (محاكاة) — ارفع نسخة معدّلة.
          </T>
        ) : null}

        {paper.grade != null ? (
          <Card style={{ gap: sp[4] }}>
            <T variant="sm" weight="bold">
              تقييم الأستاذ
            </T>
            <T variant="bodyLg" weight="bold">
              {`${latn(paper.grade)} / 20`}
            </T>
            {paper.feedback ? (
              <T variant="body" color="secondary">
                {paper.feedback}
              </T>
            ) : null}
          </Card>
        ) : null}

        {paper.status === "UPLOADED" ? (
          <View style={{ gap: sp[6] }}>
            <SectionNote>الخطوة التالية: ابدأ الفحص الأوتوماتيكي (انتحال + محتوى ذكاء اصطناعي).</SectionNote>
            <Button
              label={scanning ? "جارٍ بدء الفحص…" : "ابدأ الفحص الآن"}
              kind="ghost"
              loading={scanning}
              disabled={scanning}
              onPress={onScan}
              icon={<ScanSearch size={16} color={p.text} />}
            />
          </View>
        ) : paper.status === "CHECKS_PASSED" ? (
          <SectionNote>بانتظار تقييم أستاذك — لا إجراء مطلوب منك الآن.</SectionNote>
        ) : paper.status === "PUBLISHED" ? (
          <SectionNote>البحث متاح للجميع في مكتبة الجامعة.</SectionNote>
        ) : null}

        {paper.fileUrl ? (
          <Button
            label="فتح ملف البحث"
            kind="primary"
            onPress={() =>
              router.push({
                pathname: "/document/[filename]",
                params: {
                  filename: paper.fileUrl!.split("/").pop() ?? "",
                  ns: "papers",
                  title: paper.title,
                  paper: paper.id,
                },
              } as never)
            }
            icon={<FileText size={16} color={p.accentFg} />}
          />
        ) : null}
      </View>
    </Sheet>
  );
}

/* ── Upload sheet ──────────────────────────────────────────────────── */
function UploadSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const scope = useInstitutionScope();
  const enrollments = useQuery({
    queryKey: ["learning", "enrollments", scope],
    queryFn: () => learningApi.enrollments(),
    enabled: open,
    staleTime: 60_000,
  });
  const offeringOptions = (enrollments.data ?? []).map((e) => ({
    id: e.offering.id,
    label: `${e.offering.course.name} (${e.offering.course.code})`,
  }));

  const [title, setTitle] = useState("");
  const [abstractText, setAbstractText] = useState("");
  const [offeringId, setOfferingId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = title.trim().length >= 3 && !busy;

  const pick = async () => {
    setFileError(null);
    try {
      const picked = await pickPdf();
      if (!picked) return;
      await validatePdf(picked);
      setFile(picked);
    } catch (e) {
      setFile(null);
      setFileError((e as ApiError).message ?? "تعذَّر اختيار الملف.");
    }
  };

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (file) {
        await validatePdf(file);
      }
      let fileUrl: string | undefined;
      if (file) {
        setProgress(0);
        const staged = (await uploadRawPdf(file, "/files/papers", (f) => setProgress(f))) as {
          fileUrl?: string;
        };
        fileUrl = staged?.fileUrl ?? undefined;
        setProgress(null);
      }
      const paper = await studentApi.submitResearch({
        title: title.trim(),
        abstract: abstractText.trim() || undefined,
        offeringId: offeringId ?? undefined,
        fileUrl,
      });
      // Honest note: the integrity scan is a deterministic simulation.
      try {
        await researchApi.scan(paper.id);
      } catch {
        // The paper row exists — the scan can be started again from its row.
      }
      toast.success("سيخضع البحث لفحص الانتحال ثم يصل إلى أستاذك للتقييم.", "تمّ رفع البحث");
      setTitle("");
      setAbstractText("");
      setOfferingId(null);
      setFile(null);
      onDone();
    } catch (e) {
      setError((e as ApiError).message ?? "تعذَّر رفع البحث — تحقّق من اتصالك وحاول مرة أخرى.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const selectedOffering = offeringOptions.find((o) => o.id === offeringId) ?? null;
  const fileName = file ? ((file as unknown as { name?: string }).name ?? file.uri ?? "ملف PDF") : null;

  return (
    <Sheet
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title="رفع بحث جديد"
      footer={
        <View style={{ gap: sp[8] }}>
          {error ? (
            <T variant="sm" color="danger">
              {error}
            </T>
          ) : null}
          {!canSubmit && !busy ? (
            <T variant="xs" color="faint">
              أكمل عنوان البحث (3 أحرف على الأقل) لتتمكّن من الرفع.
            </T>
          ) : null}
          <Button
            label={busy ? "جارٍ الرفع…" : "رفع البحث"}
            kind="primary"
            disabled={!canSubmit}
            loading={busy}
            onPress={() => void submit()}
            icon={<Upload size={16} color="#FFFFFF" />}
          />
        </View>
      }
    >
      <View style={{ gap: sp[12] }}>
        <Field
          label="عنوان البحث (مطلوب)"
          value={title}
          onChangeText={setTitle}
          placeholder="مثال: تطبيق أنماط التصميم في تطبيقات الويب"
          error={title.trim().length > 0 && title.trim().length < 3 ? "يجب أن يكون 3 أحرف على الأقل." : undefined}
        />
        <Field
          label="الملخّص (اختياري)"
          value={abstractText}
          onChangeText={setAbstractText}
          placeholder="اكتب ملخصاً مختصراً عن الفكرة، المنهج، والنتائج…"
          multiline
        />
        <SelectField
          label="المقرّر الأكاديمي المرتبط (اختياري)"
          value={selectedOffering}
          options={offeringOptions}
          onSelect={setOfferingId}
          loading={enrollments.isLoading}
          sheetTitle="مقرراتك المسجَّلة"
          emptyLabel="لا توجد مقررات مسجَّلة"
        />

        <View style={{ gap: sp[6] }}>
          <T variant="sm" weight="medium" color="secondary">
            ملف البحث (PDF، اختياري)
          </T>
          <T variant="xs" color="muted">
            ملفات PDF فقط، بحد أقصى 20 ميغابايت — بدون ملف يُسجَّل البحث بعنوانه وملخصه فقط.
          </T>
          {fileName && !fileError ? (
            <Card style={{ gap: sp[6] }}>
              <T variant="sm" color="secondary" numberOfLines={1}>
                {fileName}
              </T>
              <Button
                label="إزالة الملف"
                kind="ghost"
                small
                disabled={busy}
                onPress={() => {
                  setFile(null);
                  setFileError(null);
                }}
              />
            </Card>
          ) : (
            <Button label="اختيار ملف PDF" kind="ghost" disabled={busy} onPress={() => void pick()} />
          )}
          {fileError ? (
            <T variant="sm" color="danger">
              {fileError}
            </T>
          ) : null}
          {progress !== null ? (
            <View style={{ gap: sp[4] }}>
              <ProgressBar ratio={progress} accent label="جارٍ رفع الملف…" />
              <T variant="xs" color="muted">
                {`جارٍ رفع الملف… ${latn(Math.round(progress * 100))}%`}
              </T>
            </View>
          ) : null}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
          <SimulatedBadge note="فحص النزاهة" />
          <T variant="xs" color="faint">
            يبدأ فحص النزاهة تلقائياً بعد الرفع (محاكاة).
          </T>
        </View>
      </View>
    </Sheet>
  );
}
