import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Sharing from "expo-sharing";
import { File } from "expo-file-system";
import ExternalLink from "lucide-react-native/icons/external-link";
import Plus from "lucide-react-native/icons/plus";
import Share2 from "lucide-react-native/icons/share-2";
import Trash2 from "lucide-react-native/icons/trash";
import { absoluteUrl } from "@/api/client";
import { downloadAuthenticated } from "@/api/pdf";
import { researchApi } from "@/api/research";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { AppStatusBar } from "@/design/statusbar";
import { Screen } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { Card, Hairline, Badge } from "@/components/ui/surfaces";
import { ErrorState } from "@/components/ui/states";
import { ActionSheet, AppSheet, SheetTextInput } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { RingProgress, Skeleton, SkeletonText } from "@/motion";
import { haptics } from "@/haptics";
import { humanizeError } from "@/lib/errors";
import { dateTime, latn } from "@/lib/format";
import type { PaperAnnotation } from "@/api/types";

/** Mount-on-first-open gate for the AppSheet family (RNGH v3 cannot boot
 * under jest — arming at first open keeps the render-net green; on device
 * the sheet behaves normally, close animation included). */
function useArmOnOpen(open: boolean): boolean {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (open) setArmed(true);
  }, [open]);
  return armed || open;
}
/**
 * /document/[filename] — authenticated PDF surface (papers / materials).
 * Native: downloads with Bearer auth to the app cache, then opens the real
 * system viewer (File.preview / share). When a paper id is supplied, the
 * native annotations panel provides page+comment CRUD (the web reader's
 * annotation sidebar equivalent). Web: opens the blob in a new tab.
 *
 * R334 Phase D: motion skeleton + indeterminate ring while downloading,
 * honest error state with RETRY («تعذّر فتح الملف» — humanized, never raw
 * English), share/save via ActionSheet, AppSheet + SheetTextInput for the
 * annotations panel. Byte-level download progress is NOT available —
 * downloadAuthenticated fetches a buffer (no progress events); the ring is
 * honestly indeterminate (changing that means touching src/api/pdf.ts,
 * owned elsewhere — flagged in docs/mobile/screens/lecture-library.md).
 */
export default function DocumentViewer() {
  const params = useLocalSearchParams<{
    filename: string;
    ns?: string;
    title?: string;
    paper?: string;
  }>();
  const p = usePalette();
  const ns = params.ns === "materials" ? "materials" : params.paper ? "papers" : params.ns ?? "papers";
  const title = typeof params.title === "string" ? params.title : params.filename ?? "مستند";
  const remotePath = `/api/v1/files/${ns}/${params.filename}`;

  /* One attempt per path: every setState happens after an await (the
   * sync resets at effect-start were the set-state-in-effect class —
   * the states below are DERIVED from the attempt + the path it belongs
   * to, so a new file derives a fresh "downloading" for free).
   * `retryKey` re-arms the effect for the explicit «إعادة المحاولة». */
  const [retryKey, setRetryKey] = useState(0);
  const [attempt, setAttempt] = useState<{
    path: string;
    file: File | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const local = await downloadAuthenticated(remotePath, `${params.filename}`);
        if (alive) setAttempt({ path: remotePath, file: local, error: null });
      } catch (err) {
        if (alive)
          setAttempt({
            path: remotePath,
            file: null,
            error: humanizeError(err),
          });
      }
    })();
    return () => {
      alive = false;
    };
  }, [remotePath, params.filename, retryKey]);

  const file = attempt?.path === remotePath ? attempt.file : null;
  const downloadError = attempt?.path === remotePath ? attempt.error : null;
  const downloading = attempt?.path !== remotePath || attempt.file === null && attempt.error === null;

  const retry = () => {
    haptics.impact("light");
    setAttempt(null);
    setRetryKey((k) => k + 1);
  };

  const paperId = typeof params.paper === "string" ? params.paper : null;
  const annotations = useQuery({
    queryKey: ["research", "annotations", paperId],
    enabled: !!paperId,
    queryFn: () => researchApi.annotations(paperId!),
  });
  const qc = useQueryClient();
  const [annOpen, setAnnOpen] = useState(false);
  const [newPage, setNewPage] = useState("");
  const [newComment, setNewComment] = useState("");
  const addAnn = useMutation({
    mutationFn: () =>
      researchApi.addAnnotation(paperId!, {
        page: Math.max(1, Number(newPage) || 1),
        comment: newComment.trim(),
      }),
    onSuccess: () => {
      haptics.notify("success");
      setNewComment("");
      setNewPage("");
      qc.invalidateQueries({ queryKey: ["research", "annotations", paperId] });
    },
    onError: (e) => {
      haptics.notify("error");
      toast.error(humanizeError(e), "تعذّر إضافة التعليق");
    },
  });
  const delAnn = useMutation({
    mutationFn: (id: string) => researchApi.deleteAnnotation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["research", "annotations", paperId] }),
  });

  const openViewer = async () => {
    if (!file) return;
    try {
      await File.preview([file], { title, mimeType: "application/pdf" });
    } catch {
      // Some Android builds lack a viewer — fall back to the share sheet.
      try {
        await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", dialogTitle: title });
      } catch {
        setAttempt({
          path: remotePath,
          file,
          error: "لا يوجد عارض PDF على هذا الجهاز — جرّب مشاركة الملف.",
        });
      }
    }
  };

  const openWeb = () => {
    const abs = absoluteUrl(remotePath);
    if (abs) globalThis.window?.open(abs, "_blank");
  };

  const shareFile = async () => {
    if (!file) return;
    try {
      await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", dialogTitle: title });
    } catch {
      toast.error("تعذّرت المشاركة — أعد المحاولة.");
    }
  };

  /* Share/save actions — ActionSheet (armed on first open: the sheet
   * engine cannot boot under jest; on device it behaves normally). */
  const [shareOpen, setShareOpen] = useState(false);
  const shareArmed = useArmOnOpen(shareOpen);
  const annArmed = useArmOnOpen(annOpen);

  return (
    <Screen scroll>
      <AppStatusBar />
      <View style={{ gap: sp[12] }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
          <View style={{ flex: 1, gap: 0 }}>
            <T variant="xs" color="muted">
              {ns === "papers" ? "بحوث · ملفات PDF" : "مواد تدريسية · ملفات PDF"}
            </T>
            <T variant="h4" weight="bold" numberOfLines={2}>
              {title}
            </T>
          </View>
          <Badge label="PDF" tone="grey" mono />
        </View>
        <Hairline />

        <Card style={{ gap: sp[8], alignItems: "flex-start" }}>
          <T variant="body" color="secondary">
            يُنزَّل المستند إلى مساحة التطبيق المؤقتة عبر جلسة موثّقة، ثم يُفتح في العارض الأصلي لجهازك — دعم كامل للبحث والتكبير والصفحات.
          </T>
          {downloading ? (
            /* Honest indeterminate progress — byte-level progress is not
             * available through downloadAuthenticated (see the header). */
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp[12] }}>
              <RingProgress size={28} thickness={3} progress={0} indeterminate color={p.accent} accessibilityLabel="جارٍ التنزيل" />
              <View style={{ gap: sp[6], flex: 1 }}>
                <T variant="body" color="muted">جارٍ التنزيل…</T>
                <SkeletonText lines={1} lastLineRatio={0.6} />
              </View>
            </View>
          ) : downloadError ? (
            <ErrorState message={downloadError} compact onRetry={retry} />
          ) : (
            <View style={{ flexDirection: "row", gap: sp[8], alignSelf: "stretch" }}>
              <View style={{ flex: 1 }}>
                <Button label="فتح في العارض" kind="primary" onPress={openViewer} icon={<ExternalLink size={16} color={p.primaryFg} />} />
              </View>
              <Button
                label="مشاركة"
                kind="ghost"
                onPress={() => {
                  haptics.impact("light");
                  setShareOpen(true);
                }}
                icon={<Share2 size={16} color={p.text} />}
                small
              />
            </View>
          )}
          {typeof globalThis.window !== "undefined" ? (
            <Pressable accessibilityRole="button" accessibilityLabel="فتح في المتصفح" onPress={openWeb}>
              <T variant="sm" color="accentInk">فتح في المتصفح</T>
            </Pressable>
          ) : null}
        </Card>

        {paperId ? (
          <Card style={{ gap: sp[8] }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
              <View style={{ flex: 1 }}>
                <T variant="body" weight="bold">تعليقات المراجعة</T>
                <T variant="sm" color="muted">
                  {annotations.data ? `${latn(annotations.data.length)} تعليقًا مرتبطًا بصفحات البحث` : "مراجعة الأستاذ على الصفحات"}
                </T>
              </View>
              <Button label="إدارة" kind="ghost" small onPress={() => setAnnOpen(true)} />
            </View>
            <Hairline />
            {annotations.isLoading ? (
              <Skeleton width="100%" height={56} />
            ) : null}
            {(annotations.data ?? []).slice(0, 4).map((a) => (
              <AnnotationRow key={a.id} a={a} onDelete={() => delAnn.mutate(a.id)} />
            ))}
            {annotations.data?.length === 0 ? (
              <T variant="sm" color="faint">لا تعليقات بعد.</T>
            ) : null}
          </Card>
        ) : null}
      </View>

      {shareArmed ? (
        <ActionSheet
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          title={title}
          actions={[
            {
              label: "مشاركة أو حفظ الملف",
              onPress: () => {
                void shareFile();
              },
              icon: <Share2 size={18} color={p.text} />,
            },
            {
              label: "فتح في العارض",
              onPress: () => {
                void openViewer();
              },
              icon: <ExternalLink size={18} color={p.text} />,
            },
          ]}
        />
      ) : null}

      {annArmed ? (
        <AppSheet
          open={annOpen}
          onClose={() => setAnnOpen(false)}
          title="تعليقات على الصفحات"
          snap="lg"
        >
          <View style={{ gap: sp[12] }}>
            <View style={{ flexDirection: "row", gap: sp[8] }}>
              <View style={{ width: 120 }}>
                <SheetTextInput
                  accessibilityLabel="رقم الصفحة"
                  value={newPage}
                  onChangeText={setNewPage}
                  keyboardType="number-pad"
                  placeholder="صفحة"
                  textAlign="center"
                />
              </View>
              <View style={{ flex: 1 }}>
                <SheetTextInput
                  accessibilityLabel="نص التعليق"
                  value={newComment}
                  onChangeText={setNewComment}
                  placeholder="اكتب تعليق المراجعة…"
                />
              </View>
            </View>
            <Button
              label="إضافة تعليق"
              kind="accent"
              small
              disabled={newComment.trim().length === 0 || addAnn.isPending}
              loading={addAnn.isPending}
              onPress={() => addAnn.mutate()}
              icon={<Plus size={16} color={p.accentFg} />}
            />
            {addAnn.isError ? (
              <T variant="sm" color="danger">{humanizeError(addAnn.error)}</T>
            ) : null}
            <Hairline />
            {(annotations.data ?? []).map((a) => (
              <AnnotationRow key={a.id} a={a} onDelete={() => delAnn.mutate(a.id)} />
            ))}
            {(annotations.data ?? []).length === 0 ? <T variant="sm" color="faint">لا تعليقات بعد.</T> : null}
          </View>
        </AppSheet>
      ) : null}
    </Screen>
  );
}

function AnnotationRow({ a, onDelete }: { a: PaperAnnotation; onDelete: () => void }) {
  const p = usePalette();
  return (
    <View style={{ paddingVertical: sp[6], gap: 2 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
        <Badge label={`ص ${latn(a.page)}`} tone="sky" />
        <T variant="sm" color="faint">
          {a.author ? `${a.author.firstName} ${a.author.lastName}` : ""} {a.createdAt ? `· ${dateTime(a.createdAt)}` : ""}
        </T>
        <View style={{ flex: 1 }} />
        <Pressable accessibilityRole="button" accessibilityLabel="حذف التعليق" onPress={onDelete} hitSlop={10}>
          <Trash2 size={16} color={p.accentInk} />
        </Pressable>
      </View>
      <T variant="body" color="secondary">{a.comment}</T>
    </View>
  );
}
