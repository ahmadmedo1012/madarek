import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import FileText from "lucide-react-native/icons/file-text";
import SlidersHorizontal from "lucide-react-native/icons/sliders-horizontal";
import Star from "lucide-react-native/icons/star";
import Undo2 from "lucide-react-native/icons/undo-2";
import { catalogApi } from "@/api/catalog";
import { researchApi } from "@/api/research";
import { studentApi } from "@/api/student";
import type { Book, Loan, ResearchPaper } from "@/api/types";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { useNow } from "@/hooks/useNow";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { AppStatusBar } from "@/design/statusbar";
import { T } from "@/components/ui/text";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui/screen";
import { Badge, Card, SimulatedBadge } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { SearchBar, Segmented } from "@/components/ui/fields";
import { Avatar, DataList, LedgerRow, makeRow, usePagedList } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { FilterSheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { haptics } from "@/haptics";
import { humanizeError } from "@/lib/errors";
import { fullDate, latn, num } from "@/lib/format";
import { SectionNote, scanLine } from "@/features/student/more";

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

/** Availability view-filters (client-side over the loaded pages — the
 * /library/books endpoint exposes no filter params, so this is honest
 * view-filtering, disclosed in the sheet while active). */
type AvailabilityFilter = "all" | "available" | "borrowed";

const AVAILABILITY_OPTIONS: { id: AvailabilityFilter; label: string }[] = [
  { id: "all", label: "كل الكتب" },
  { id: "available", label: "متاحة للاستعارة" },
  { id: "borrowed", label: "مستعارة بالكامل" },
];

/** Pure: does a book pass the availability view-filter? */
export function bookMatchesAvailability(book: Book, filter: AvailabilityFilter): boolean {
  if (filter === "available") return book.availableCopies > 0;
  if (filter === "borrowed") return book.availableCopies === 0;
  return true;
}

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
 * /student/library — web LibraryPage parity: books tab (paginated search +
 * borrow + my loans with return) + published-research tab (archive +
 * Arabic full-text search with snippets) opening the document viewer.
 * R334 Phase D: DataList (FlashList) bodies, FilterSheet availability
 * view-filter, EmptyState library room, humanized errors, selection
 * haptics on the segment switch.
 */
export default function LibraryScreen() {
  const [tab, setTab] = useState("books");
  return (
    <Screen scroll={false} padded={false}>
      <AppStatusBar />
      <StackHeader title="المكتبة" kicker="المكتبة الإلكترونية" />
      <View style={{ paddingHorizontal: sp[20], gap: sp[12], paddingTop: sp[12] }}>
        <Segmented
          options={[
            { id: "books", label: "الكتب" },
            { id: "research", label: "البحوث المنشورة" },
          ]}
          selectedId={tab}
          onSelect={(id) => {
            haptics.selection();
            setTab(id);
          }}
        />
        <SectionNote>
          كتب المكتبة الأكاديمية وبحوث طلاب الجامعة المنشورة — متاحة للاستعارة الفورية والاطّلاع المرجعي.
        </SectionNote>
      </View>
      {tab === "books" ? <BooksTab /> : <ResearchTab />}
    </Screen>
  );
}

/* ── Books tab ─────────────────────────────────────────────────────── */

const BookRow = makeRow<
  Book,
  {
    last: boolean;
    onBorrow: (id: string) => void;
    borrowingId: string | null;
  }
>(({ item: book, last, onBorrow, borrowingId }) => {
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[2] }}>
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
          label={borrowingId === book.id ? "جارٍ الاستعارة…" : "استعارة"}
          kind="primary"
          small
          disabled={unavailable || borrowingId != null}
          loading={borrowingId === book.id}
          onPress={() => onBorrow(book.id)}
          accessibilityLabel={`استعارة ${book.title}`}
        />
      </View>
    </LedgerRow>
  );
});

const LoanRow = makeRow<Loan, { last: boolean; onReturn: (id: string) => void; returningId: string | null }>(
  ({ item: loan, last, onReturn, returningId }) => {
    const now = useNow(5 * 60_000);
    const p = usePalette();
    const status = LOAN_STATUS[loan.status] ?? { label: loan.status, tone: "grey" as const };
    const overdue = loan.status === "OVERDUE" || (loan.dueAt ? new Date(loan.dueAt).getTime() < now : false);
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
            label={returningId === loan.id ? "جارٍ الإرجاع…" : "إرجاع"}
            kind="ghost"
            small
            loading={returningId === loan.id}
            onPress={() => onReturn(loan.id)}
            icon={<Undo2 size={14} color={p.text} />}
            accessibilityLabel={`إرجاع ${loan.book?.title ?? "الكتاب"}`}
          />
        </View>
      </LedgerRow>
    );
  },
);

function BooksTab() {
  const p = usePalette();
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  /* Debounced search; a changed term restarts at page 1 ATOMICALLY
   * (query+page ride one state — no reset effect, no cascading render). */
  const [query, setQuery] = useState({ q: "", page: 1 });
  useEffect(() => {
    const t = setTimeout(
      () => setQuery((prev) => (prev.q === q.trim() ? prev : { q: q.trim(), page: 1 })),
      250,
    );
    return () => clearTimeout(t);
  }, [q]);
  const debouncedQ = query.q;
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState<AvailabilityFilter>("all");
  const filterArmed = useArmOnOpen(filterOpen);

  /* DataList + usePagedList: pages ACCUMULATE (the old pagination replaced
   * the page — users could never grow past 20 rows). */
  const books = usePagedList<Book>({
    queryKey: ["library", "books", debouncedQ, scope],
    fetchPage: (page: number) =>
      catalogApi.libraryBooks({ page, limit: BOOKS_PAGE_SIZE, q: debouncedQ || undefined }),
    limit: BOOKS_PAGE_SIZE,
  });
  const loans = useQuery({
    queryKey: ["library", "loans", scope],
    queryFn: () => studentApi.loans(),
  });

  const borrow = useMutation({
    mutationFn: (bookId: string) => catalogApi.borrow(bookId),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["library"] });
      haptics.notify("success");
      const dueAt = (res as { dueAt?: string } | null)?.dueAt ?? null;
      toast.success(
        dueAt ? `موعد إرجاع الكتاب: ${fullDate(dueAt)}.` : "تمّت الاستعارة — راجع «استعاراتي» لموعد الإرجاع.",
        "تمّت الاستعارة",
      );
    },
    onError: (e) => {
      haptics.notify("error");
      toast.error(humanizeError(e), "تعذَّرت الاستعارة");
    },
  });
  const returnBook = useMutation({
    mutationFn: (loanId: string) => catalogApi.returnBook(loanId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["library"] });
      haptics.notify("success");
      toast.success("أُعيد الكتاب إلى المكتبة.", "تمّ الإرجاع");
    },
    onError: (e) => {
      haptics.notify("error");
      toast.error(humanizeError(e), "تعذّر الإرجاع");
    },
  });

  const allRows = books.items;
  const rows = useMemo(
    () => allRows.filter((b) => bookMatchesAvailability(b, availability)),
    [allRows, availability],
  );
  const openLoans = (loans.data ?? []).filter((l) => l.status !== "RETURNED");

  const header = (
    <View style={{ gap: sp[12] }}>
      <SearchBar
        value={q}
        onChange={setQ}
        placeholder="ابحث عن كتاب أو مؤلف…"
        onClear={() => {
          setQ("");
          setQuery({ q: "", page: 1 });
        }}
      />
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
        <View style={{ flex: 1 }}>
          <T variant="h4" weight="bold">
            الكتب
          </T>
          {availability !== "all" ? (
            <T variant="xs" color="muted">
              تصفية على الكتب الظاهرة أدناه — حمّل المزيد لتوسيع النتيجة.
            </T>
          ) : null}
        </View>
        <Button
          label="تصفية"
          kind="ghost"
          small
          onPress={() => {
            haptics.impact("light");
            setFilterDraft(availability);
            setFilterOpen(true);
          }}
          icon={<SlidersHorizontal size={14} color={p.text} />}
        />
      </View>
      <View style={{ gap: sp[6] }}>
        <T variant="sm" weight="bold">
          استعاراتي
        </T>
        {loans.isLoading ? (
          <SkeletonList rows={2} rowHeight={56} />
        ) : loans.isError ? (
          <ErrorState message={humanizeError(loans.error)} onRetry={() => loans.refetch()} compact />
        ) : openLoans.length === 0 ? (
          <SectionNote>لا استعارات نشطة — اضغط «استعارة» على أي كتاب متاح ليظهر هنا.</SectionNote>
        ) : (
          <View style={{ borderWidth: 0 }}>
            {openLoans.map((l, i) => (
              <LoanRow
                key={l.id}
                item={l}
                last={i === openLoans.length - 1}
                onReturn={(id) => returnBook.mutate(id)}
                returningId={returnBook.isPending ? returnBook.variables : null}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <DataList
        data={rows}
        renderItem={({ item, index }) => (
          <BookRow
            item={item}
            last={index === rows.length - 1}
            onBorrow={borrow.mutate}
            borrowingId={borrow.isPending ? borrow.variables : null}
          />
        )}
        keyExtractor={(b) => b.id}
        ListHeaderComponent={header}
        extraData={{ borrowing: borrow.isPending ? borrow.variables : null, availability }}
        isLoading={books.isLoading}
        isError={books.isError}
        errorMessage={books.errorMessage ? humanizeError(books.query.error) : null}
        onRetry={() => books.refetch()}
        refetch={books.refetch}
        isRefetching={books.isRefetching}
        onEndReached={books.onEndReached}
        isFetchingNextPage={books.isFetchingNextPage}
        hasNextPage={books.hasNextPage}
        loadMoreError={books.loadMoreError ? humanizeError(books.query.error) : null}
        onRetryLoadMore={books.retryLoadMore}
        emptySlot={
          <EmptyState
            room="library"
            title={debouncedQ || availability !== "all" ? "لا توجد كتب مطابقة" : "لا توجد ملفات"}
            message={
              debouncedQ || availability !== "all"
                ? "جرّب كلمات بحث مختلفة أو أعد ضبط التصفية."
                : "ستظهر هنا كتب المكتبة وملفاتها فور توفرها."
            }
          />
        }
        contentPadding={{ horizontal: 20, bottom: 24 }}
      />
      {filterArmed ? (
        <FilterSheet
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          title="تصفية الكتب"
          onApply={() => {
            haptics.selection();
            setAvailability(filterDraft);
          }}
          onReset={() => setFilterDraft("all")}
        >
          <View style={{ gap: sp[4] }}>
            {AVAILABILITY_OPTIONS.map((o) => (
              <FilterChip
                key={o.id}
                label={o.label}
                selected={filterDraft === o.id}
                onPress={() => {
                  haptics.selection();
                  setFilterDraft(o.id);
                }}
              />
            ))}
          </View>
        </FilterSheet>
      ) : null}
    </View>
  );
}

/** Radio-style filter chip row (44pt target, check mark on selection). */
function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Button
      label={selected ? `${label} ✓` : label}
      kind={selected ? "primary" : "ghost"}
      small
      onPress={onPress}
      accessibilityLabel={selected ? `${label} — محدَّد` : label}
      style={{ alignSelf: "flex-start" }}
    />
  );
}

/* ── Published research tab ────────────────────────────────────────── */

const PaperRow = makeRow<PublishedPaper, { last: boolean; snippet: string | null; onOpen: (p: PublishedPaper) => void }>(
  ({ item: paper, last, snippet, onOpen }) => {
    const p = usePalette();
    return (
      <LedgerRow
        last={last}
        onPress={() => onOpen(paper)}
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
          // M9 — web parity: «اقرأ البحث كاملاً» is the web's .btn.primary.sm
          // (charcoal slab), not orange text — the accent leaves the rows.
          <View style={{ alignSelf: "flex-start" }}>
            <Button
              label="اقرأ البحث كاملاً"
              kind="primary"
              small
              onPress={() => onOpen(paper)}
              icon={<FileText size={13} color={p.primaryFg} />}
              accessibilityLabel={`اقرأ البحث كاملاً: ${paper.title}`}
            />
          </View>
        ) : null}
      </LedgerRow>
    );
  },
);

function ResearchTab() {
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

  const searching = debouncedQ.length >= 2;
  const isLoading = searching ? search.isLoading : archive.isLoading;
  const isError = searching ? search.isError : archive.isError;
  const error = searching ? search.error : archive.error;
  const retry = () => (searching ? search.refetch() : archive.refetch());

  return (
    <View style={{ flex: 1 }}>
      <DataList
        data={hits}
        renderItem={({ item }) => (
          <PaperRow
            item={item.paper}
            last={false}
            snippet={item.snippet}
            onOpen={openPaper}
          />
        )}
        keyExtractor={(h) => h.paper.id}
        ListHeaderComponent={
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
            <Card style={{ gap: sp[4] }}>
              <T variant="sm" weight="bold">
                {`بحوث منشورة: ${num(hits.length)}`}
              </T>
              <T variant="xs" color="muted">
                تم التحقق من النشر قبل الإدراج — الاستعراض عبر عارض المستندات الموثّق.
              </T>
            </Card>
          </View>
        }
        isLoading={isLoading}
        isError={isError && hits.length === 0}
        errorMessage={humanizeError(error)}
        onRetry={retry}
        emptySlot={
          <EmptyState
            room="library"
            title={debouncedQ ? "لا توجد نتائج للبحث" : "لا توجد ملفات"}
            message={
              debouncedQ
                ? `لم نجد بحثاً يطابق «${debouncedQ}» — جرّب كلمات أخرى.`
                : "ستظهر هنا بحوث الطلاب المنشورة وملفاتها فور إجازتها."
            }
          />
        }
        contentPadding={{ horizontal: 20, bottom: 24 }}
      />
    </View>
  );
}
