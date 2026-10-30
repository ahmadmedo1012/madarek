import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, FileText, Star, Undo2 } from "lucide-react-native";
import { catalogApi } from "@/api/catalog";
import { researchApi } from "@/api/research";
import { studentApi } from "@/api/student";
import { ApiError } from "@/api/client";
import type { Book, Loan, ResearchPaper } from "@/api/types";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui/screen";
import { Badge, Card, SimulatedBadge } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { SearchBar, Segmented } from "@/components/ui/fields";
import { Avatar, LedgerRow, RowList } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { fullDate, latn, num } from "@/lib/format";
import { SectionNote, countAr, scanLine } from "@/features/student/more";

type PublishedPaper = ResearchPaper & {
  offering?: { course: { code: string; name: string } } | null;
};
type SearchHit = { paper: PublishedPaper; matchedIn: "title" | "abstract" | "body"; snippet: string | null };

const BOOKS_PAGE_SIZE = 20;
const LOAN_STATUS: Record<string, { label: string; tone: "mint" | "rose" | "grey" }> = {
  ACTIVE: { label: "نشطة", tone: "mint" },
  OVERDUE: { label: "متأخر الإرجاع", tone: "rose" },
  RETURNED: { label: "مُعادة", tone: "grey" },
};

/**
 * /student/library — web LibraryPage parity: books tab (paginated search +
 * borrow + my loans with return), published-research tab (archive +
 * Arabic full-text search with snippets) opening the document viewer.
 */
export default function LibraryScreen() {
  const [tab, setTab] = useState("books");
  return (
    <Screen scroll>
      <StackHeader title="المكتبة" kicker="المكتبة الإلكترونية" />
      <Segmented
        options={[
          { id: "books", label: "الكتب" },
          { id: "research", label: "البحوث المنشورة" },
        ]}
        selectedId={tab}
        onSelect={setTab}
      />
      <SectionNote>
        كتب المكتبة الأكاديمية وبحوث طلاب الجامعة المنشورة — متاحة للاستعارة الفورية والاطّلاع المرجعي.
      </SectionNote>
      {tab === "books" ? <BooksTab /> : <ResearchTab />}
    </Screen>
  );
}

/* ── Books tab ─────────────────────────────────────────────────────── */
function BooksTab() {
  const p = usePalette();
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    setPage(1);
  }, [debouncedQ]);

  const books = useQuery({
    queryKey: ["library", "books", page, debouncedQ, scope],
    queryFn: () => catalogApi.libraryBooks({ page, limit: BOOKS_PAGE_SIZE, q: debouncedQ || undefined }),
    placeholderData: (p) => p,
  });
  const loans = useQuery({
    queryKey: ["library", "loans", scope],
    queryFn: () => studentApi.loans(),
  });

  const borrow = useMutation({
    mutationFn: (bookId: string) => catalogApi.borrow(bookId),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["library"] });
      const dueAt = (res as { dueAt?: string } | null)?.dueAt ?? null;
      toast.success(
        dueAt ? `موعد إرجاع الكتاب: ${fullDate(dueAt)}.` : "تمّت الاستعارة — راجع «استعاراتي» لموعد الإرجاع.",
        "تمّت الاستعارة",
      );
    },
    onError: (e) => toast.error((e as ApiError).message, "تعذَّرت الاستعارة"),
  });
  const returnBook = useMutation({
    mutationFn: (loanId: string) => catalogApi.returnBook(loanId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["library"] });
      toast.success("أُعيد الكتاب إلى المكتبة.", "تمّ الإرجاع");
    },
    onError: (e) => toast.error((e as ApiError).message, "تعذّر الإرجاع"),
  });

  const rows = books.data?.data ?? [];
  const meta = books.data?.meta;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);
  const openLoans = (loans.data ?? []).filter((l) => l.status !== "RETURNED");

  return (
    <View style={{ gap: sp[12] }}>
      <SearchBar
        value={q}
        onChange={setQ}
        placeholder="ابحث عن كتاب أو مؤلف…"
        onClear={() => {
          setQ("");
          setDebouncedQ("");
        }}
      />

      <View style={{ gap: sp[6] }}>
        <T variant="h4" weight="bold">
          استعاراتي
        </T>
        {loans.isLoading ? (
          <SkeletonList rows={2} rowHeight={56} />
        ) : loans.isError ? (
          <ErrorState message={(loans.error as Error).message} onRetry={() => loans.refetch()} compact />
        ) : openLoans.length === 0 ? (
          <SectionNote>لا استعارات نشطة — اضغط «استعارة» على أي كتاب متاح ليظهر هنا.</SectionNote>
        ) : (
          <RowList>
            {openLoans.map((l, i) => (
              <LoanRow
                key={l.id}
                loan={l}
                last={i === openLoans.length - 1}
                onReturn={() => returnBook.mutate(l.id)}
                returning={returnBook.isPending && returnBook.variables === l.id}
              />
            ))}
          </RowList>
        )}
      </View>

      <View style={{ gap: sp[6] }}>
        <T variant="h4" weight="bold">
          الكتب
        </T>
        {books.isLoading ? (
          <SkeletonList rows={5} />
        ) : books.isError ? (
          <ErrorState message={(books.error as Error).message} onRetry={() => books.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={24} color={p.textFaint} />}
            title={debouncedQ ? "لا توجد كتب تطابق البحث" : "لا توجد كتب بعد"}
            message={debouncedQ ? "جرّب كلمات بحث مختلفة." : "ستظهر هنا كتب المكتبة فور توفرها."}
          />
        ) : (
          <RowList>
            {rows.map((b, i) => (
              <BookRow
                key={b.id}
                book={b}
                last={i === rows.length - 1}
                onBorrow={() => borrow.mutate(b.id)}
                borrowing={borrow.isPending && borrow.variables === b.id}
              />
            ))}
          </RowList>
        )}
        {meta && totalPages > 1 ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
            <View style={{ flex: 1 }}>
              <T variant="xs" color="muted">
                {`الصفحة ${latn(meta.page)} من ${latn(totalPages)} · ${countAr(meta.total, ["كتاب", "كتابان", "كتب", "كتاباً"])}`}
              </T>
            </View>
            <Button label="السابق" kind="ghost" small disabled={page <= 1} onPress={() => setPage((v) => Math.max(1, v - 1))} />
            <Button
              label="التالي"
              kind="ghost"
              small
              disabled={page >= totalPages}
              onPress={() => setPage((v) => Math.min(totalPages, v + 1))}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function BookRow({
  book,
  last,
  onBorrow,
  borrowing,
}: {
  book: Book;
  last: boolean;
  onBorrow: () => void;
  borrowing: boolean;
}) {
  const p = usePalette();
  const unavailable = book.availableCopies === 0;
  return (
    <LedgerRow last={last} accessibilityLabel={`كتاب: ${book.title}`}>
      <T variant="body" weight="bold">
        {book.title}
      </T>
      <T variant="sm" color="secondary">
        {`${book.author}${book.category ? ` · ${book.category}` : ""}`}
      </T>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
        {unavailable ? (
          <Badge label="مستعار" tone="grey" />
        ) : (
          <Badge label="متاح" tone="mint" />
        )}
        {book.rating != null ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
            <Star size={11} color={p.goldInk} />
            <T variant="xs" color="muted">
              {latn(book.rating)}
            </T>
          </View>
        ) : null}
        <T variant="xs" color="muted">
          {`${latn(book.availableCopies)} من ${latn(book.totalCopies)} نسخة متاحة`}
        </T>
      </View>
      <View style={{ alignSelf: "flex-start" }}>
        <Button
          label={borrowing ? "جارٍ الاستعارة…" : "استعارة"}
          kind="primary"
          small
          disabled={unavailable || borrowing}
          loading={borrowing}
          onPress={onBorrow}
          accessibilityLabel={`استعارة ${book.title}`}
        />
      </View>
    </LedgerRow>
  );
}

function LoanRow({
  loan,
  last,
  onReturn,
  returning,
}: {
  loan: Loan;
  last: boolean;
  onReturn: () => void;
  returning: boolean;
}) {
  const p = usePalette();
  const status = LOAN_STATUS[loan.status] ?? { label: loan.status, tone: "grey" as const };
  const overdue = loan.status === "OVERDUE" || (loan.dueAt ? new Date(loan.dueAt).getTime() < Date.now() : false);
  return (
    <LedgerRow last={last} accessibilityLabel={`استعارة: ${loan.book?.title ?? "كتاب"}`}>
      <T variant="body" weight="bold">
        {loan.book?.title ?? "كتاب"}
      </T>
      <T variant="sm" color="secondary">
        {loan.book?.author ?? "—"}
      </T>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8], flexWrap: "wrap" }}>
        <Badge label={status.label} tone={status.tone} />
        {loan.dueAt ? (
          <T variant="xs" color={overdue ? "danger" : "muted"}>
            {`موعد الإرجاع: ${fullDate(loan.dueAt)}`}
          </T>
        ) : null}
      </View>
      <View style={{ alignSelf: "flex-start" }}>
        <Button
          label={returning ? "جارٍ الإرجاع…" : "إرجاع"}
          kind="ghost"
          small
          loading={returning}
          onPress={onReturn}
          icon={<Undo2 size={14} color={p.text} />}
          accessibilityLabel={`إرجاع ${loan.book?.title ?? "الكتاب"}`}
        />
      </View>
    </LedgerRow>
  );
}

/* ── Published research tab ────────────────────────────────────────── */
function ResearchTab() {
  const p = usePalette();
  const scope = useInstitutionScope();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const archive = useQuery({
    queryKey: ["research", "published", scope],
    queryFn: () => researchApi.published(),
    enabled: debouncedQ.length < 2,
    placeholderData: (p) => p,
  });
  const search = useQuery({
    queryKey: ["research", "search", debouncedQ, scope],
    queryFn: async () => (await researchApi.search(debouncedQ)) as unknown as SearchHit[],
    enabled: debouncedQ.length >= 2,
    placeholderData: (p) => p,
  });

  const hits = useMemo(() => {
    if (debouncedQ.length >= 2) {
      return (search.data ?? []).map((h) => ({ paper: h.paper, snippet: h.snippet }));
    }
    return (archive.data ?? []).map((p) => ({ paper: p as PublishedPaper, snippet: null }));
  }, [debouncedQ, archive.data, search.data]);

  const openPaper = (paper: PublishedPaper) => {
    const filename = paper.fileUrl ? paper.fileUrl.split("/").pop() ?? "" : "";
    if (!filename) {
      toast.error("لا يوجد ملف مرتبط بهذا البحث.");
      return;
    }
    router.push({
      pathname: "/document/[filename]",
      params: { filename, ns: "papers", title: paper.title, paper: paper.id },
    } as never);
  };

  return (
    <View style={{ gap: sp[12] }}>
      <SearchBar
        value={q}
        onChange={setQ}
        placeholder="ابحث في عنوان البحث، الملخص، أو المحتوى الكامل…"
        onClear={() => {
          setQ("");
          setDebouncedQ("");
        }}
      />
      {debouncedQ.length === 1 ? (
        <SectionNote>البحث في البحوث يبدأ من حرفين على الأقل — أضف حرفاً ثانياً وسيبدأ فوراً.</SectionNote>
      ) : null}
      {debouncedQ.length >= 2 && hits.length === 0 && !search.isLoading && !search.isError ? (
        <EmptyState
          icon={<FileText size={24} color={p.textFaint} />}
          title="لا توجد نتائج للبحث"
          message={`لم نجد بحثاً يطابق «${debouncedQ}» — جرّب كلمات أخرى.`}
        />
      ) : null}
      {archive.isLoading && debouncedQ.length < 2 ? (
        <SkeletonList rows={4} />
      ) : archive.isError && debouncedQ.length < 2 ? (
        <ErrorState message={(archive.error as Error).message} onRetry={() => archive.refetch()} />
      ) : null}
      {search.isError && debouncedQ.length >= 2 ? (
        <ErrorState message={(search.error as Error).message} onRetry={() => search.refetch()} />
      ) : null}
      {hits.length > 0 ? (
        <RowList>
          {hits.map(({ paper, snippet }, i) => (
            <LedgerRow
              key={paper.id}
              last={i === hits.length - 1}
              onPress={() => openPaper(paper)}
              accessibilityLabel={`اقرأ البحث: ${paper.title}`}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                <Avatar
                  size={36}
                  initials={
                    (paper.student as { avatarInitials?: string | null } | null)?.avatarInitials ??
                    `${paper.student?.firstName?.[0] ?? "؟"}${paper.student?.lastName?.[0] ?? ""}`
                  }
                  color={(paper.student as { avatarColor?: string | null } | null)?.avatarColor ?? null}
                />
                <View style={{ flex: 1, gap: 0 }}>
                  <T variant="body" weight="bold" numberOfLines={2}>
                    {paper.title}
                  </T>
                  <T variant="xs" color="muted" numberOfLines={1}>
                    {`${paper.student?.firstName ?? ""} ${paper.student?.lastName ?? ""}${paper.offering?.course ? ` · ${paper.offering.course.code} — ${paper.offering.course.name}` : ""}`}
                  </T>
                </View>
                {paper.grade != null ? <Badge label={`${latn(paper.grade)}/20`} tone="yellow" /> : null}
              </View>
              {snippet ? (
                <T variant="sm" color="secondary" numberOfLines={3}>
                  {snippet.replace(/<\/?mark>/g, "")}
                </T>
              ) : paper.abstract ? (
                <T variant="sm" color="secondary" numberOfLines={2}>
                  {paper.abstract}
                </T>
              ) : null}
              {(paper.plagiarismPct != null || paper.aiContentPct != null) && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
                  <T variant="xs" color="muted">
                    {scanLine(paper.plagiarismPct, paper.aiContentPct)}
                  </T>
                  <SimulatedBadge />
                </View>
              )}
              {paper.fileUrl ? (
                <T variant="sm" weight="bold" color="accentInk">
                  اقرأ البحث كاملاً
                </T>
              ) : null}
            </LedgerRow>
          ))}
        </RowList>
      ) : null}
      {hits.length === 0 && debouncedQ.length < 2 && !archive.isLoading && !archive.isError ? (
        <EmptyState
          icon={<FileText size={24} color={p.textFaint} />}
          title="لا توجد بحوث منشورة بعد"
          message="سيظهر هنا أرشيف بحوث الطلاب فور إجازتها من الأساتذة."
        />
      ) : null}
      <Card style={{ gap: sp[4] }}>
        <T variant="sm" weight="bold">
          {`بحوث منشورة: ${num(hits.length)}`}
        </T>
        <T variant="xs" color="muted">
          تم التحقق من النشر قبل الإدراج — الاستعراض عبر عارض المستندات الموثّق.
        </T>
      </Card>
    </View>
  );
}
