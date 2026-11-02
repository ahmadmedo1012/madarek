/**
 * R331 A-App-Shell — navigation-stability net.
 *
 * The defect: every role screen wrapped itself in a per-screen
 * RoleTabFrame over a plain Stack, so the bottom bar re-mounted (and slid)
 * with every screen transition. The fix: one `(tabs)` group per role whose
 * expo-router `Tabs` layout renders the shared `RoleTabBar` ONCE via the
 * `tabBar` prop, detail screens pushing over it from the parent Stack.
 *
 * This suite proves the architecture structurally (the real expo-router
 * navigator cannot boot under jest — see the full mock in setup.ts — so we
 * assert the tree shape and the bar's contract directly):
 *   1. FS shape — every role has app/<role>/(tabs)/_layout.tsx, every
 *      ROLE_TABS entry has a screen file inside the group, and every
 *      tab route lives ONLY inside it (URLs unchanged — groups add
 *      no segments, so deep links like madarek://student/dashboard stay).
 *   2. No stragglers — nothing under app/ imports TabFrame (the deleted
 *      per-screen bar) or FeedbackFab (the removed floating FAB).
 *   3. The bar renders once and its identity persists across tab
 *      switches — a mounted RoleTabBar re-renders with a different
 *      state.index (the ONLY thing a tab switch changes) and the same
 *      element survives: one bar, five tabs, one navigate call.
 *   4. Motion foundation — reanimated 4 + worklets resolve and load under
 *      jest (deps laid for A-App-Motion; no consumer yet).
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RoleTabBar } from "@/components/shell/TabBar";
import { ROLE_TABS } from "@/components/shell/roleTabs";

/* The bar's badge rides a react-query hook (60s refetch interval) — mocking
   it keeps this unit deterministic: no async store updates between asserts
   (act()-storm noise), and the badge contract is driven by data, not the
   wire. The mock returns a fixed unread count of 3. */
jest.mock("@/hooks/useNotifications", () => ({
  useUnreadCount: () => ({ data: 3 }),
}));

const ROOT = join(__dirname, "..", "..");
const APP = join(ROOT, "app");

/* ── 1. FS shape: the (tabs) group + moved screens + stable paths ───── */

describe("every role has a persistent (tabs) shell with its ROLE_TABS screens", () => {
  const roles = Object.keys(ROLE_TABS) as (keyof typeof ROLE_TABS)[];

  test("ROLE_TABS covers all five roles with five tabs each", () => {
    expect(roles).toEqual(["STUDENT", "TEACHER", "ADMIN", "QUALITY", "OWNER"]);
    for (const role of roles) {
      expect(ROLE_TABS[role]).toHaveLength(5);
    }
  });

  test.each(roles)("role %s: (tabs)/_layout.tsx exists and drives a Tabs navigator", (role) => {
    const file = join(APP, role.toLowerCase(), "(tabs)", "_layout.tsx");
    expect(existsSync(file)).toBe(true);
    const src = readFileSync(file, "utf8");
    expect(src).toContain("Tabs");
    expect(src).toContain("RoleTabBar");
    expect(src).toContain(`role="${role}"`);
    expect(src).toContain("ROLE_TABS");
    // no per-screen bar resurrection inside the layout (import-based check
    // — doc comments may mention the retired component by name)
    expect(src).not.toMatch(/import\s*\{[^}]*TabFrame/);
  });

  test.each(roles)("role %s: every ROLE_TABS entry has its screen file in the group", (role) => {
    for (const tab of ROLE_TABS[role]) {
      expect(existsSync(join(APP, role.toLowerCase(), "(tabs)", `${tab.name}.tsx`))).toBe(true);
    }
  });

  test.each(roles)("role %s: tab URLs are unchanged (no stale copy outside the group)", (role) => {
    for (const tab of ROLE_TABS[role]) {
      // the tab screen lives ONLY inside the group — a leftover at the old
      // flat path would shadow/ambiguate the group route.
      expect(existsSync(join(APP, role.toLowerCase(), `${tab.name}.tsx`))).toBe(false);
    }
  });

  test.each(roles)("role %s: the role stack declares (tabs) as its first child", (role) => {
    const src = readFileSync(join(APP, role.toLowerCase(), "_layout.tsx"), "utf8");
    expect(src).toContain('<Stack.Screen name="(tabs)"');
    expect(src).toContain("Stack");
  });
});

/* ── 2. no stragglers: the per-screen bar and the FAB are gone ──────── */

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (entry === "node_modules") continue;
      walk(p, out);
    } else if (/\.(tsx|ts)$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

describe("the deleted per-screen chrome is fully gone", () => {
  const files = walk(APP);
  const importRe = /import[^;]*TabFrame|from\s+["'][^"']*TabFrame["']/;

  test("no file under app/ imports TabFrame (the per-screen bar)", () => {
    const offenders = files.filter((f) => importRe.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  test("no file under app/ imports FeedbackFab (the floating FAB host)", () => {
    const offenders = files.filter((f) =>
      /import[^;]*FeedbackFab|from\s+["'][^"']*FeedbackFab["']/.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  test("the FAB file itself is deleted and the report route exists", () => {
    expect(existsSync(join(ROOT, "src", "features", "feedback", "FeedbackFab.tsx"))).toBe(false);
    expect(existsSync(join(APP, "(modals)", "report.tsx"))).toBe(true);
  });
});

/* ── 3. the bar: rendered once, identity stable across tab switches ── */

type BarUtils = Awaited<ReturnType<typeof render>> & {
  navigateToTab: jest.Mock;
  tree: (index: number) => React.ReactElement;
};

async function mountBar(role: keyof typeof ROLE_TABS, stateIndex: number): Promise<BarUtils> {
  const routes = ROLE_TABS[role].map((t) => ({ key: `${role.toLowerCase()}-${t.name}`, name: t.name }));
  const navigateToTab = jest.fn();
  const tree = (index: number) => (
    <SafeAreaProvider>
      <RoleTabBar
        state={{ index, routes }}
        navigateToTab={navigateToTab}
        insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
        role={role}
      />
    </SafeAreaProvider>
  );
  const utils = await render(tree(stateIndex));
  return { ...utils, navigateToTab, tree };
}

/** Count elements with a given accessibilityRole in the rendered JSON. */
function countRole(json: unknown, role: string): number {
  const node = json as { props?: { accessibilityRole?: string }; children?: unknown[] } | null;
  if (!node || typeof node !== "object") return 0;
  let n = node.props?.accessibilityRole === role ? 1 : 0;
  for (const child of node.children ?? []) n += countRole(child, role);
  return n;
}

describe("RoleTabBar — one persistent bar per role", () => {
  test("renders ONE bar (tablist) with the five Arabic tab labels and the badge", async () => {
    const bar = await mountBar("STUDENT", 0);
    expect(bar.queryAllByTestId("role-tab-bar")).toHaveLength(1);
    // role-based queries mark accessible elements only — the container is
    // asserted over the JSON tree (5 tabs + 1 tablist).
    expect(countRole(bar.toJSON(), "tablist")).toBe(1);
    expect(bar.getAllByRole("tab")).toHaveLength(5);
    for (const tab of ROLE_TABS.STUDENT) {
      expect(bar.getByRole("tab", { name: tab.label })).toBeTruthy();
    }
    // the inbox tab (الإشعارات) carries the mocked unread badge (3)
    expect(bar.getByLabelText("3 إشعارات غير مقروءة")).toBeTruthy();
    await bar.unmount();
  });

  test("a tab switch re-renders with a new index WITHOUT re-mounting the bar", async () => {
    // A tab switch only changes state.index — the bar element identity
    // must survive (the R331 defect: the whole bar re-mounted per screen).
    const bar = await mountBar("STUDENT", 0);
    expect(bar.getByRole("tab", { name: "الرئيسية" }).props.accessibilityState.selected).toBe(true);

    // re-render the SAME tree with the index moved to the alerts tab
    await bar.rerender(bar.tree(3));

    // still exactly one bar; selection moved
    expect(bar.queryAllByTestId("role-tab-bar")).toHaveLength(1);
    expect(bar.getByRole("tab", { name: "الإشعارات" }).props.accessibilityState.selected).toBe(true);
    expect(bar.getByRole("tab", { name: "الرئيسية" }).props.accessibilityState.selected).toBe(false);
    await bar.unmount();
  });

  test("pressing an inactive tab navigates exactly once via navigateToTab", async () => {
    const bar = await mountBar("STUDENT", 0);
    await fireEvent.press(bar.getByRole("tab", { name: "مقرراتي" }));
    expect(bar.navigateToTab).toHaveBeenCalledTimes(1);
    expect(bar.navigateToTab).toHaveBeenCalledWith("student-courses");
    await bar.unmount();
  });

  test("pressing the focused tab is a no-op (no navigation, no haptic storm)", async () => {
    const bar = await mountBar("STUDENT", 0);
    await fireEvent.press(bar.getByRole("tab", { name: "الرئيسية" }));
    expect(bar.navigateToTab).not.toHaveBeenCalled();
    await bar.unmount();
  });

  test("the owner bar carries the fixed «الحوكمة» label (typo «الحواكمة» eradicated)", async () => {
    const bar = await mountBar("OWNER", 0);
    expect(bar.getByRole("tab", { name: "الحوكمة" })).toBeTruthy();
    expect(JSON.stringify(ROLE_TABS)).not.toContain("الحواكمة");
    await bar.unmount();
  });
});

/* ── 4. motion foundation: reanimated 4 + worklets resolve under jest ── */

describe("the native motion foundation (deps for A-App-Motion)", () => {
  test("react-native-reanimated and react-native-worklets import cleanly", () => {
    expect(() => require("react-native-reanimated")).not.toThrow();
    expect(() => require("react-native-worklets")).not.toThrow();
  });
});
