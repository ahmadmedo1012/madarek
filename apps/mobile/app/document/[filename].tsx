import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View , TextInput } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Sharing from "expo-sharing";
import { File } from "expo-file-system";
import { Download, ExternalLink, Plus, Share2, Trash2 } from "lucide-react-native";
import { ApiError, absoluteUrl } from "@/api/client";
import { downloadAuthenticated } from "@/api/pdf";
import { researchApi } from "@/api/research";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { Screen } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { Card, Hairline, Sheet, Badge } from "@/components/ui/surfaces";
import { ErrorState } from "@/components/ui/states";
import { dateTime, latn } from "@/lib/format";
import type { PaperAnnotation } from "@/api/types";

import { InlineBusy } from "@/components/ui/boot";
/**
 * /document/[filename] — authenticated PDF surface (papers / materials).
 * Native: downloads with Bearer auth to the app cache, then opens the real
 * system viewer (File.preview / share). When a paper id is supplied, the
 * native annotations panel provides page+comment CRUD (the web reader's
 * annotation sidebar equivalent). Web: opens the blob in a new tab.
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

  const [file, setFile] = useState<File | null>(null);
  const [downloading, setDownloading] = useState(true);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setDownloading(true);
    setDownloadError(null);
    (async () => {
      try {
        const local = await downloadAuthenticated(remotePath, `${params.filename}`);
        if (alive) setFile(local);
      } catch (err) {
        if (alive) setDownloadError((err as ApiError).message ?? "تعذّر تنزيل المستند.");
      } finally {
        if (alive) setDownloading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [remotePath, params.filename]);

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
      setNewComment("");
      setNewPage("");
      qc.invalidateQueries({ queryKey: ["research", "annotations", paperId] });
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
        setDownloadError("لا يوجد عارض PDF على هذا الجهاز — جرّب مشاركة الملف.");
      }
    }
  };

  const openWeb = () => {
    const abs = absoluteUrl(remotePath);
    if (abs) globalThis.window?.open(abs, "_blank");
  };

  return (
    <Screen scroll>
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
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
              <InlineBusy size={12} color={p.accent} />
              <T variant="body" color="muted">جارٍ التنزيل…</T>
            </View>
          ) : downloadError ? (
            <ErrorState message={downloadError} compact />
          ) : (
            <View style={{ flexDirection: "row", gap: sp[8], alignSelf: "stretch" }}>
              <View style={{ flex: 1 }}>
                <Button label="فتح في العارض" kind="primary" onPress={openViewer} icon={<ExternalLink size={16} color={p.primaryFg} />} />
              </View>
              <Button
                label="مشاركة"
                kind="ghost"
                onPress={async () => {
                  if (file) await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", dialogTitle: title });
                }}
                icon={<Share2 size={16} color={p.text} />}
                small
              />
            </View>
          )}
          {typeof globalThis.window !== "undefined" ? (
            <Pressable accessibilityRole="button" onPress={openWeb}>
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
            {(annotations.data ?? []).slice(0, 4).map((a) => (
              <AnnotationRow key={a.id} a={a} onDelete={() => delAnn.mutate(a.id)} />
            ))}
            {annotations.data?.length === 0 ? (
              <T variant="sm" color="faint">لا تعليقات بعد.</T>
            ) : null}
          </Card>
        ) : null}
      </View>

      <Sheet
        open={annOpen}
        onClose={() => setAnnOpen(false)}
        title="تعليقات على الصفحات"
      >
        <View style={{ gap: sp[12] }}>
          <View style={{ flexDirection: "row", gap: sp[8] }}>
            <View style={{ width: 100 }}>
              <TextInput
                accessibilityLabel="رقم الصفحة"
                value={newPage}
                onChangeText={setNewPage}
                keyboardType="number-pad"
                placeholder="صفحة"
                placeholderTextColor={p.textFaint}
                style={{ borderWidth: StyleSheet.hairlineWidth, borderColor: p.rule, backgroundColor: p.bg, color: p.text, padding: sp[12], minHeight: 48, textAlign: "center" }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextInput
                accessibilityLabel="نص التعليق"
                value={newComment}
                onChangeText={setNewComment}
                placeholder="اكتب تعليق المراجعة…"
                placeholderTextColor={p.textFaint}
                style={{ borderWidth: StyleSheet.hairlineWidth, borderColor: p.rule, backgroundColor: p.bg, color: p.text, padding: sp[12], minHeight: 48, textAlign: "right" }}
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
          {addAnn.isError ? <T variant="sm" color="danger">{(addAnn.error as ApiError).message}</T> : null}
          <Hairline />
          {(annotations.data ?? []).map((a) => (
            <AnnotationRow key={a.id} a={a} onDelete={() => delAnn.mutate(a.id)} />
          ))}
          {(annotations.data ?? []).length === 0 ? <T variant="sm" color="faint">لا تعليقات بعد.</T> : null}
        </View>
      </Sheet>
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
        <Pressable accessibilityRole="button" accessibilityLabel="حذف التعليق" onPress={onDelete}>
          <Trash2 size={16} color="#C72E00" />
        </Pressable>
      </View>
      <T variant="body" color="secondary">{a.comment}</T>
    </View>
  );
}
