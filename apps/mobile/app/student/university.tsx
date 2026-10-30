/**
 * /student/university — عن الجامعة (web UniversityInfoPage parity, pilot
 * mode): the platform's reference showcase institution facts served by
 * the PUBLIC GET /university/facts, plus the caller's own membership
 * context from the session. The endpoint carries no typed mobile client
 * yet — the sheet is normalized defensively (object entries / {facts:[…]}
 * / {data:{…}} all land as StatLine rows; an unrecognized shape renders
 * the honest empty state, never a guess).
 */
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react-native";
import { get } from "@/api/client";
import { useSession, ROLE_LABELS } from "@/auth/session";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { SectionBar } from "@/components/ui/screen";
import { Badge, Card } from "@/components/ui/surfaces";
import { StatLine } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { latn } from "@/lib/format";
import { SectionNote, countAr } from "@/features/student/more";
import { PushFrame } from "@/features/student/components";

/* ── Defensive normalization (unknown wire shape) ─────────────────── */

interface FactEntry {
  key: string;
  value: string;
}

interface FactSection {
  category: string;
  entries: FactEntry[];
}

interface FactsSheet {
  institutionName: string | null;
  sections: FactSection[];
}

/** Western glyphs for server strings that may carry Arabic-Indic digits. */
function latnify(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

/** Honest scalar rendering — strings/numbers/booleans pass, the rest «—». */
function factValue(v: unknown): string {
  if (typeof v === "string") {
    const t = latnify(v).trim();
    return t.length > 0 ? t : "—";
  }
  if (typeof v === "number") return Number.isFinite(v) ? latn(v) : "—";
  if (typeof v === "boolean") return v ? "نعم" : "لا";
  return "—";
}

/** Known category ids → Arabic section titles (unknown ids pass through). */
const CATEGORY_LABEL: Record<string, string> = {
  identity: "الهويّة",
  contact: "التواصل",
  memberships: "العضويّات",
  strategic: "الخطّة الاستراتيجيّة",
  grading: "سلّم الدرجات",
  programs: "البرامج والدرجات",
};

function categoryLabel(category: string): string {
  return CATEGORY_LABEL[category] ?? category;
}

/**
 * Normalize the /university/facts payload into honest sections:
 *   { institution, categories: { cat: { key: value } } } — the public route,
 *   { facts: [{ key, value, category }, …] } / { categories: [{ category,
 *   items }] } — the sync registry views,
 *   a plain object — one entry per key («عام» bucket),
 * all optionally wrapped in { data: {… }}.
 */
function normalizeFacts(raw: unknown): FactsSheet {
  /* Unwrap nested {data:{…}} re-wraps defensively (the client already
     unwraps the outer success envelope). */
  let node: unknown = raw;
  for (let depth = 0; depth < 3; depth += 1) {
    if (!node || typeof node !== "object" || Array.isArray(node)) break;
    const inner = (node as { data?: unknown }).data;
    if (inner === undefined) break;
    node = inner;
  }

  const sheet: FactsSheet = { institutionName: null, sections: [] };
  if (!node || typeof node !== "object" || Array.isArray(node)) return sheet;

  const obj = node as Record<string, unknown>;
  const inst = obj.institution;
  if (inst && typeof inst === "object" && typeof (inst as { name?: unknown }).name === "string") {
    sheet.institutionName = (inst as { name: string }).name;
  }

  const sections: FactSection[] = [];
  const add = (category: string | null, key: string, value: unknown) => {
    if (!key || value === null || value === undefined || typeof value === "object") return;
    const label = category && category.trim().length > 0 ? category : "عام";
    let section = sections.find((s) => s.category === label);
    if (!section) {
      section = { category: label, entries: [] };
      sections.push(section);
    }
    section.entries.push({ key, value: factValue(value) });
  };

  const factsArr = obj.facts;
  const categories = obj.categories;
  if (Array.isArray(factsArr)) {
    /* { facts: [{ key, value, category }, …] } */
    for (const f of factsArr) {
      if (!f || typeof f !== "object") continue;
      const row = f as { key?: unknown; value?: unknown; category?: unknown };
      if (typeof row.key === "string") {
        add(typeof row.category === "string" ? row.category : null, row.key, row.value);
      }
    }
  } else if (Array.isArray(categories)) {
    /* { categories: [{ category, items: [{ key, value }] }] } */
    for (const c of categories) {
      if (!c || typeof c !== "object") continue;
      const sec = c as { category?: unknown; items?: unknown };
      const cat = typeof sec.category === "string" ? sec.category : null;
      if (!Array.isArray(sec.items)) continue;
      for (const it of sec.items) {
        if (!it || typeof it !== "object") continue;
        const row = it as { key?: unknown; value?: unknown };
        if (typeof row.key === "string") add(cat, row.key, row.value);
      }
    }
  } else if (categories && typeof categories === "object") {
    /* { categories: { cat: { key: value } } } — the public route shape. */
    for (const [cat, kv] of Object.entries(categories as Record<string, unknown>)) {
      if (!kv || typeof kv !== "object" || Array.isArray(kv)) continue;
      for (const [key, value] of Object.entries(kv as Record<string, unknown>)) {
        add(cat, key, value);
      }
    }
  } else {
    /* A plain object — one StatLine per entry, «عام» bucket. */
    for (const [key, value] of Object.entries(obj)) {
      if (key === "institution") continue;
      add(null, key, value);
    }
  }

  sheet.sections = sections;
  return sheet;
}

/* ── Screen ──────────────────────────────────────────────────────── */

export default function UniversityScreen() {
  const p = usePalette();
  const scope = useInstitutionScope();
  const user = useSession((s) => s.user);

  const facts = useQuery({
    queryKey: ["university", "facts", scope],
    queryFn: () => get("/university/facts"),
  });

  const sheet = facts.data ? normalizeFacts(facts.data) : null;
  const institution = user?.currentInstitution ?? null;
  const membershipRole = user?.membershipRole ?? user?.role ?? null;
  const membershipIndex = (sheet?.sections.length ?? 0) + 1;

  return (
    <PushFrame
      title="عن الجامعة"
      kicker="حقائق مؤسّسة العرض المرجعية — وضع الطيار"
      refreshing={facts.isFetching && !facts.isLoading}
      onRefresh={() => facts.refetch()}
    >
      <SectionNote>
        تُقرأ هذه الصفحة من مصدر حقائق مؤسّسة العرض المرجعية (بيانات تجريبية اصطناعية)، بينما تعود معلومات
        العضويّة أدناه إلى جلستك الحالية.
      </SectionNote>

      {facts.isLoading ? (
        <SkeletonList rows={6} rowHeight={56} />
      ) : facts.isError ? (
        <ErrorState message={(facts.error as Error).message} onRetry={() => facts.refetch()} />
      ) : !sheet || sheet.sections.length === 0 ? (
        <EmptyState
          icon={<Building2 size={22} color={p.textMuted} />}
          title="لا توجد حقائق محفوظة بعد"
          message="لم تُزامَن أي حقائق لهذه المؤسّسة — ستظهر هنا فور توافرها من المصدر المعتمد."
        />
      ) : (
        <>
          {sheet.institutionName ? (
            <Card>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: sp[8],
                  flexWrap: "wrap",
                }}
              >
                <T variant="h3" weight="bold" style={{ flex: 1 }}>
                  {sheet.institutionName}
                </T>
                <Badge label="بيانات تجريبية" tone="yellow" />
              </View>
            </Card>
          ) : null}

          {sheet.sections.map((s, i) => (
            <View key={s.category} style={{ gap: sp[8] }}>
              <SectionBar
                index={i + 1}
                title={categoryLabel(s.category)}
                action={
                  <T variant="xs" color="muted">
                    {latn(s.entries.length)}
                  </T>
                }
              />
              <Card>
                {s.entries.map((e) => (
                  <StatLine key={`${s.category}-${e.key}`} label={e.key} value={e.value} />
                ))}
              </Card>
            </View>
          ))}
        </>
      )}

      {/* عضويّتك — session context (currentInstitution), always available */}
      <SectionBar index={membershipIndex} title="عضويّتك" />
      <Card>
        <StatLine label="المؤسسة الحالية" value={institution?.name ?? "—"} />
        <StatLine label="المعرّف على المنصّة" value={institution?.slug ?? "—"} />
        <StatLine
          label="دورك في المؤسّسة"
          value={membershipRole ? ROLE_LABELS[membershipRole] ?? membershipRole : "—"}
        />
        {user?.memberships && user.memberships.length > 0 ? (
          <StatLine
            label="عضويّاتك"
            value={latn(user.memberships.length)}
            hint={countAr(user.memberships.length, [
              "مؤسّسة واحدة",
              "مؤسّستان",
              "مؤسّسات",
              "مؤسّسة",
            ])}
          />
        ) : null}
      </Card>
    </PushFrame>
  );
}
