/**
 * curriculum — بناء المنهج. Web parity: CurriculumAuthoringPanel +
 * LectureAuthoring/ChapterBuilder/CheckpointBuilder — lectures (create,
 * edit, delete, reorder), per-lecture chapters and checkpoints editors,
 * and the transcript generate button. Video upload stays a web-panel
 * action (presign requires an S3 backend) — this screen manages links.
 */

import { useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StackHeader } from "@/components/shell/AppTopBar";
import { learningApi } from "@/api/learning";
import type { Lecture } from "@/api/types";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { latn } from "@/lib/format";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { Screen, PageHeader, SectionBar } from "@/components/ui/screen";
import { Badge, Card, ConfirmDialog, Sheet } from "@/components/ui/surfaces";
import { LedgerRow, RowList } from "@/components/ui/data";
import { Button } from "@/components/ui/pressables";
import { Field } from "@/components/ui/fields";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { OfferingPicker, arCount, useTeacherOfferings } from "@/features/teacher/components";

const TRANSCRIPT_LABEL: Record<string, string> = {
  NONE: "بلا نص",
  PENDING: "جارٍ التوليد",
  PROCESSING: "جارٍ التوليد",
  DONE: "مكتمل",
  FAILED: "فشل التوليد",
};

function durationLabel(sec: number | null | undefined): string {
  if (sec === null || sec === undefined) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${latn(m)}:${String(s).padStart(2, "0")}`;
}

export default function Curriculum() {
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const offs = useTeacherOfferings();
  const offerings = offs.data ?? [];
  const [offeringId, setOfferingId] = useState("");
  const effectiveId = offeringId || offerings[0]?.id || "";

  const lectures = useQuery({
    queryKey: ["learning", "offering", effectiveId, "lectures", scope],
    queryFn: () => learningApi.lectures(effectiveId),
    enabled: effectiveId !== "",
  });
  const rows = [...(lectures.data ?? [])].sort((a, b) => a.ordinal - b.ordinal);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["learning", "offering", effectiveId] });
    qc.invalidateQueries({ queryKey: ["learning", "lecture"] });
  };

  /* New/edit lecture sheet. */
  const [editing, setEditing] = useState<Lecture | null>(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [durationSec, setDurationSec] = useState("");
  const [lectureError, setLectureError] = useState<string | null>(null);

  const saveLecture = useMutation({
    mutationFn: async () => {
      if (title.trim().length < 2) throw new Error("عنوان المحاضرة مطلوب.");
      if (videoUrl.trim() === "") throw new Error("رابط الفيديو مطلوب — https:// أو مسار ملف داخل المنصة.");
      const dur = durationSec.trim() === "" ? undefined : Number(durationSec);
      if (dur !== undefined && (Number.isNaN(dur) || dur < 1)) throw new Error("المدة يجب أن تكون ثانية واحدة على الأقل.");
      if (editing) {
        return learningApi.updateLecture(editing.id, {
          title: title.trim(),
          videoUrl: videoUrl.trim(),
          description: description.trim() || null,
          ...(dur !== undefined ? { durationSec: dur } : {}),
        });
      }
      return learningApi.createLecture(effectiveId, {
        title: title.trim(),
        videoUrl: videoUrl.trim(),
        description: description.trim() || undefined,
        durationSec: dur,
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success(editing ? "حُفظت تعديلات المحاضرة." : "أُضيفت المحاضرة إلى المنهج.", "تمّ الحفظ");
      setAdding(false);
      setEditing(null);
      setTitle("");
      setVideoUrl("");
      setDescription("");
      setDurationSec("");
      setLectureError(null);
    },
    onError: (e) => setLectureError((e as Error).message),
  });

  const deleteLecture = useMutation({
    mutationFn: (id: string) => learningApi.deleteLecture(id),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      toast.success("حُذفت المحاضرة من المنهج.", "تمّ الحذف");
    },
    onError: (e) => toast.error((e as Error).message, "تعذَّر الحذف"),
  });

  const reorder = useMutation({
    mutationFn: (orderedIds: string[]) => learningApi.reorderLectures(effectiveId, orderedIds),
    onSuccess: () => {
      invalidate();
      toast.success("حُدِّث ترتيب المحاضرات.");
    },
    onError: (e) => toast.error((e as Error).message, "تعذَّر إعادة الترتيب"),
  });

  const move = (index: number, dir: -1 | 1) => {
    const next = [...rows];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    const tmp = next[index]!;
    next[index] = next[j]!;
    next[j] = tmp;
    reorder.mutate(next.map((l) => l.id));
  };

  const [deleteTarget, setDeleteTarget] = useState<Lecture | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const openLectureForm = (lecture: Lecture | null) => {
    setEditing(lecture);
    setAdding(lecture === null);
    setTitle(lecture?.title ?? "");
    setVideoUrl(lecture?.videoUrl ?? "");
    setDescription(lecture?.description ?? "");
    setDurationSec(lecture?.durationSec != null ? String(lecture.durationSec) : "");
    setLectureError(null);
  };

  return (
    <Screen scroll>
      <StackHeader title="بناء المنهج" />
      <PageHeader title="بناء المنهج" kicker="محاضرات المقرّر وفصولها ومحطات الفحص والنص المكتوب." />
      {offerings.length === 0 ? (
        offs.isLoading ? (
          <SkeletonList rows={3} />
        ) : (
          <EmptyState title="لم تُسند إليك مقرّرات بعد" message="ستظهر مقرّراتك هنا فور إسنادها من قِبَل المسجل العام." />
        )
      ) : (
        <>
          <OfferingPicker offerings={offerings} value={effectiveId} onChange={setOfferingId} label="المقرّر" />
          <Card>
            <T variant="sm" color="muted">
              رفع الفيديو يتم حاليًا من لوحة الويب — هنا إدارة الروابط (رابط https أو مسار ملف داخل المنصة). الرفع المباشر يحتاج خادم تخزين S3.
            </T>
          </Card>

          <SectionBar
            index={1}
            title="المحاضرات"
            action={
              <Button label="محاضرة جديدة" kind="accent" small onPress={() => openLectureForm(null)} />
            }
          />
          {lectures.isLoading ? (
            <SkeletonList rows={3} />
          ) : lectures.isError ? (
            <ErrorState message={(lectures.error as Error).message} onRetry={() => lectures.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              title="لا توجد محاضرات بعد"
              message="ابدأ بإضافة أول محاضرة: عنوان، رابط فيديو، ومدة اختيارية."
              actionLabel="محاضرة جديدة"
              onAction={() => openLectureForm(null)}
            />
          ) : (
            <RowList>
              {rows.map((l, i) => (
                <LedgerRow
                  key={l.id}
                  last={i === rows.length - 1}
                  onPress={() => setOpenId((cur) => (cur === l.id ? null : l.id))}
                  accessibilityLabel={`محاضرة ${l.title}`}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                    <T variant="bodyLg" weight="bold" color="muted">
                      {latn(l.ordinal)}
                    </T>
                    <View style={{ flex: 1 }}>
                      <T variant="body" weight="medium" numberOfLines={1}>
                        {l.title}
                      </T>
                      <T variant="xs" color="muted">
                        {durationLabel(l.durationSec)}
                        {l.transcriptStatus ? ` · النص: ${TRANSCRIPT_LABEL[l.transcriptStatus] ?? l.transcriptStatus}` : ""}
                      </T>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: sp[4], flexWrap: "wrap" }}>
                    <Button label="▲" kind="ghost" small disabled={i === 0 || reorder.isPending} onPress={() => move(i, -1)} accessibilityLabel="انقل لأعلى" />
                    <Button label="▼" kind="ghost" small disabled={i === rows.length - 1 || reorder.isPending} onPress={() => move(i, 1)} accessibilityLabel="انقل لأسفل" />
                    <Button label="تعديل" kind="ghost" small onPress={() => openLectureForm(l)} />
                    <Button label="حذف" kind="ghost" small onPress={() => setDeleteTarget(l)} />
                  </View>
                </LedgerRow>
              ))}
            </RowList>
          )}

          {/* هيكل المحاضرة — chapters + checkpoints + transcript (expanded). */}
          {openId !== null ? (
            <LectureStructure
              lectureId={openId}
              onInvalidated={invalidate}
            />
          ) : null}
        </>
      )}

      {/* محاضرة جديدة / تعديل محاضرة. */}
      <Sheet
        open={adding || editing !== null}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        title={editing ? "تعديل المحاضرة" : "محاضرة جديدة"}
      >
        <Field label="عنوان المحاضرة" value={title} onChangeText={setTitle} accessibilityLabel="عنوان المحاضرة" />
        <Field
          label="رابط الفيديو"
          value={videoUrl}
          onChangeText={setVideoUrl}
          hint="رابط خارجي يبدأ بـ https:// أو مسار ملف داخل المنصة (/api/v1/files/papers/)"
          accessibilityLabel="رابط الفيديو"
        />
        <Field
          label="الوصف (اختياري)"
          value={description}
          onChangeText={setDescription}
          accessibilityLabel="الوصف"
        />
        <Field
          label="المدة بالثواني (اختياري)"
          value={durationSec}
          onChangeText={setDurationSec}
          hint="مثال: 2700 لمدة 45 دقيقة"
          keyboardType="number-pad"
          accessibilityLabel="المدة بالثواني"
        />
        {lectureError ? (
          <T variant="sm" color="danger">
            {lectureError}
          </T>
        ) : null}
        <Button
          label={saveLecture.isPending ? "جارٍ الحفظ…" : editing ? "حفظ التعديلات" : "إضافة المحاضرة"}
          kind="accent"
          loading={saveLecture.isPending}
          disabled={effectiveId === ""}
          onPress={() => {
            setLectureError(null);
            saveLecture.mutate();
          }}
        />
      </Sheet>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="حذف المحاضرة"
        message={`سيُحذف «${deleteTarget?.title ?? ""}» مع فصولها وأسئلتها التفاعلية نهائيًا. هل تريد الحذف؟`}
        confirmLabel="حذف نهائي"
        danger
        loading={deleteLecture.isPending}
        onConfirm={() => deleteTarget && deleteLecture.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </Screen>
  );
}

/* ─── هيكل المحاضرة — chapters + checkpoints + transcript ──────────── */

function LectureStructure({ lectureId, onInvalidated }: { lectureId: string; onInvalidated: () => void }) {
  const qc = useQueryClient();
  const scope = useInstitutionScope();
  const detail = useQuery({
    queryKey: ["learning", "lecture", lectureId, scope],
    queryFn: () => learningApi.lecture(lectureId),
  });
  const lecture = detail.data ?? null;

  const transcriptStatus = useQuery({
    queryKey: ["learning", "lecture", lectureId, "transcript-status", scope],
    queryFn: () => learningApi.transcriptStatus(lectureId),
  });

  const [chapterSheet, setChapterSheet] = useState(false);
  const [chTitle, setChTitle] = useState("");
  const [chStart, setChStart] = useState("");
  const [chEnd, setChEnd] = useState("");
  const [chError, setChError] = useState<string | null>(null);

  const [cpSheet, setCpSheet] = useState(false);
  const [cpTrigger, setCpTrigger] = useState("");
  const [cpQuestion, setCpQuestion] = useState("");
  const [cpOptions, setCpOptions] = useState<string[]>(["", ""]);
  const [cpCorrect, setCpCorrect] = useState<number | null>(null);
  const [cpExplanation, setCpExplanation] = useState("");
  const [cpError, setCpError] = useState<string | null>(null);

  const invalidateLecture = () => {
    qc.invalidateQueries({ queryKey: ["learning", "lecture", lectureId] });
    onInvalidated();
  };

  const addChapter = useMutation({
    mutationFn: async () => {
      if (chTitle.trim().length < 2) throw new Error("عنوان الفصل مطلوب.");
      const start = Number(chStart);
      const end = Number(chEnd);
      if (chStart.trim() === "" || chEnd.trim() === "" || Number.isNaN(start) || Number.isNaN(end)) {
        throw new Error("البداية والنهاية ثوانٍ رقمية.");
      }
      if (end <= start) throw new Error("نهاية الفصل يجب أن تكون بعد بدايته.");
      return learningApi.addChapter(lectureId, { title: chTitle.trim(), startSec: start, endSec: end });
    },
    onSuccess: () => {
      invalidateLecture();
      toast.success("أُضيف الفصل إلى المحاضرة.", "تمّت الإضافة");
      setChapterSheet(false);
      setChTitle("");
      setChStart("");
      setChEnd("");
      setChError(null);
    },
    onError: (e) => setChError((e as Error).message),
  });

  const deleteChapter = useMutation({
    mutationFn: (chapterId: string) => learningApi.deleteChapter(lectureId, chapterId),
    onSuccess: () => {
      invalidateLecture();
      toast.success("حُذف الفصل.");
    },
    onError: (e) => toast.error((e as Error).message, "تعذَّر الحذف"),
  });

  const addCheckpoint = useMutation({
    mutationFn: async () => {
      if (cpQuestion.trim().length < 3) throw new Error("نص السؤال مطلوب.");
      const trigger = Number(cpTrigger);
      if (cpTrigger.trim() === "" || Number.isNaN(trigger) || trigger < 0) throw new Error("موضع السؤال ثوانٍ ≥ 0.");
      const opts = cpOptions.map((o) => o.trim()).filter((o) => o !== "");
      if (opts.length < 2) throw new Error("خياران على الأقل.");
      if (cpCorrect === null || cpCorrect >= opts.length) throw new Error("حدِّد الإجابة الصحيحة قبل الحفظ.");
      return learningApi.addCheckpoint(lectureId, {
        triggerSec: trigger,
        question: cpQuestion.trim(),
        options: opts,
        correctIndex: cpCorrect,
        explanation: cpExplanation.trim() || undefined,
      });
    },
    onSuccess: () => {
      invalidateLecture();
      toast.success("أُضيف سؤال التفاعل إلى المحاضرة.", "تمّت الإضافة");
      setCpSheet(false);
      setCpTrigger("");
      setCpQuestion("");
      setCpOptions(["", ""]);
      setCpCorrect(null);
      setCpExplanation("");
      setCpError(null);
    },
    onError: (e) => setCpError((e as Error).message),
  });

  const deleteCheckpoint = useMutation({
    mutationFn: (checkpointId: string) => learningApi.deleteCheckpoint(checkpointId),
    onSuccess: () => {
      invalidateLecture();
      toast.success("حُذف سؤال التفاعل.");
    },
    onError: (e) => toast.error((e as Error).message, "تعذَّر الحذف"),
  });

  const generateTranscript = useMutation({
    mutationFn: () => learningApi.generateTranscript(lectureId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["learning", "lecture", lectureId] });
      toast.success("بدأ توليد النص المكتوب — تابع حالته من شريحة النص.", "توليد النص");
    },
    onError: (e) => toast.error((e as Error).message, "تعذَّر بدء التوليد"),
  });

  if (detail.isLoading) return <SkeletonList rows={2} />;
  if (detail.isError) {
    return <ErrorState message={(detail.error as Error).message} onRetry={() => detail.refetch()} compact />;
  }

  const chapters = lecture?.chapters ?? [];
  const checkpoints = lecture?.checkpoints ?? [];
  const tStatus = lecture?.transcriptStatus ?? transcriptStatus.data?.status ?? "NONE";

  return (
    <View style={{ gap: sp[12] }}>
      <SectionBar index={2} title={`هيكل المحاضرة: ${lecture?.title ?? ""}`} />

      {/* النص المكتوب — status + generate. */}
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
          <View style={{ flex: 1 }}>
            <T variant="body" weight="bold">النص المكتوب (SRT/VTT)</T>
          </View>
          <Badge label={TRANSCRIPT_LABEL[tStatus] ?? tStatus} tone={tStatus === "DONE" ? "mint" : tStatus === "FAILED" ? "rose" : "grey"} />
        </View>
        <Button
          label="توليد النص"
          kind="ghost"
          small
          loading={generateTranscript.isPending}
          onPress={() => generateTranscript.mutate()}
        />
        {tStatus === "NONE" ? (
          <T variant="xs" color="muted">
            التوليد التلقائي يحوّل صوت الفيديو إلى نص — يعمل على روابط الفيديو المدعومة فقط.
          </T>
        ) : null}
      </Card>

      {/* الفصول. */}
      <SectionBar
        index={3}
        title="الفصول"
        action={
          <Button label="فصل جديد" kind="ghost" small onPress={() => setChapterSheet(true)} />
        }
      />
      {chapters.length === 0 ? (
        <Card>
          <T variant="sm" color="muted">لا فصول بعد — قسّم المحاضرة إلى فصول بزمن بداية ونهاية.</T>
        </Card>
      ) : (
        <RowList>
          {chapters.map((c, i) => (
            <LedgerRow key={c.id} last={i === chapters.length - 1} accessibilityLabel={`فصل ${c.title}`}>
              <T variant="body" weight="medium" numberOfLines={1}>
                {c.title}
              </T>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
                <T variant="xs" color="muted">
                  {`${durationLabel(c.startSec)} — ${durationLabel(c.endSec)}`}
                </T>
                <Button label="حذف" kind="ghost" small onPress={() => deleteChapter.mutate(c.id)} />
              </View>
            </LedgerRow>
          ))}
        </RowList>
      )}

      {/* محطات الفحص. */}
      <SectionBar
        index={4}
        title="محطات الفحص"
        action={
          <Button label="سؤال جديد" kind="ghost" small onPress={() => setCpSheet(true)} />
        }
      />
      {checkpoints.length === 0 ? (
        <Card>
          <T variant="sm" color="muted">لا أسئلة تفاعلية بعد — تظهر للطالب عند نقطة زمنية داخل المحاضرة.</T>
        </Card>
      ) : (
        <RowList>
          {checkpoints.map((c, i) => (
            <LedgerRow
              key={c.id}
              last={i === checkpoints.length - 1}
              accessibilityLabel={`سؤال عند ${durationLabel(c.triggerSec)}`}
            >
              <T variant="body" numberOfLines={2}>
                {c.question}
              </T>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
                <T variant="xs" color="muted">
                  عند {durationLabel(c.triggerSec)} ·{" "}
                  {arCount(c.options.length, ["خيار واحد", "خياران", "خيارات", "خياراً"])}
                </T>
                <Button label="حذف" kind="ghost" small onPress={() => deleteCheckpoint.mutate(c.id)} />
              </View>
            </LedgerRow>
          ))}
        </RowList>
      )}

      {/* فصل جديد sheet. */}
      <Sheet open={chapterSheet} onClose={() => setChapterSheet(false)} title="فصل جديد">
        <Field label="عنوان الفصل" value={chTitle} onChangeText={setChTitle} accessibilityLabel="عنوان الفصل" />
        <Field
          label="البداية (بالثواني)"
          value={chStart}
          onChangeText={setChStart}
          hint="مثل 320 للدقيقة 05:20"
          keyboardType="number-pad"
          accessibilityLabel="بداية الفصل"
        />
        <Field
          label="النهاية (بالثواني)"
          value={chEnd}
          onChangeText={setChEnd}
          hint="مثل 1120 للدقيقة 18:40"
          keyboardType="number-pad"
          accessibilityLabel="نهاية الفصل"
        />
        {chError ? (
          <T variant="sm" color="danger">
            {chError}
          </T>
        ) : null}
        <Button
          label={addChapter.isPending ? "جارٍ الحفظ…" : "إضافة الفصل"}
          kind="accent"
          loading={addChapter.isPending}
          onPress={() => {
            setChError(null);
            addChapter.mutate();
          }}
        />
      </Sheet>

      {/* سؤال تفاعلي جديد sheet. */}
      <Sheet open={cpSheet} onClose={() => setCpSheet(false)} title="محطة فحص جديدة">
        <Field
          label="نص السؤال"
          value={cpQuestion}
          onChangeText={(v) => {
            setCpQuestion(v);
            setCpError(null);
          }}
          placeholder="سؤال يظهر للطالب عند نقطة زمنية داخل المحاضرة"
          accessibilityLabel="نص السؤال"
        />
        <Field
          label="موضع السؤال (بالثواني)"
          value={cpTrigger}
          onChangeText={setCpTrigger}
          hint="يظهر عند هذه اللحظة"
          keyboardType="number-pad"
          accessibilityLabel="موضع السؤال"
        />
        <T variant="sm" weight="medium" color="secondary">
          الخيارات — اضغط «صحيحة» لتحديد الإجابة
        </T>
        {cpOptions.map((o, i) => (
          <View key={i} style={{ flexDirection: "row", gap: sp[6], alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Field
                label={`الخيار ${latn(i + 1)}`}
                value={o}
                onChangeText={(v) => {
                  setCpOptions((m) => m.map((x, j) => (j === i ? v : x)));
                  setCpError(null);
                }}
                accessibilityLabel={`الخيار ${latn(i + 1)}`}
              />
            </View>
            <Button
              label={cpCorrect === i ? "✓ صحيحة" : "صحيحة"}
              kind={cpCorrect === i ? "accent" : "ghost"}
              small
              onPress={() => setCpCorrect(i)}
            />
            {cpOptions.length > 2 ? (
              <Button
                label="حذف"
                kind="ghost"
                small
                onPress={() => {
                  setCpOptions((m) => m.filter((_, j) => j !== i));
                  if (cpCorrect === i) setCpCorrect(null);
                  else if (cpCorrect !== null && cpCorrect > i) setCpCorrect(cpCorrect - 1);
                }}
              />
            ) : null}
          </View>
        ))}
        {cpOptions.length < 6 ? (
          <Button label="إضافة خيار" kind="ghost" small onPress={() => setCpOptions((m) => [...m, ""])} />
        ) : null}
        <Field
          label="الشرح (اختياري)"
          value={cpExplanation}
          onChangeText={setCpExplanation}
          hint="يظهر للطالب بعد الإجابة"
          accessibilityLabel="الشرح"
        />
        {cpError ? (
          <T variant="sm" color="danger">
            {cpError}
          </T>
        ) : null}
        <Button
          label={addCheckpoint.isPending ? "جارٍ الحفظ…" : "إضافة السؤال"}
          kind="accent"
          loading={addCheckpoint.isPending}
          onPress={() => {
            setCpError(null);
            addCheckpoint.mutate();
          }}
        />
      </Sheet>
    </View>
  );
}


