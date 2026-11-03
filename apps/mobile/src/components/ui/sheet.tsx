import { useEffect, useMemo, useRef, type ComponentProps, type ReactNode } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Easing } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Check from "lucide-react-native/icons/check";
import X from "lucide-react-native/icons/x";
import type { BottomSheetFooterProps } from "@gorhom/bottom-sheet";
import { usePalette } from "@/design/theme";
import { heronEase, motion, sp, touchFloor } from "@/design/tokens";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { T } from "./text";
import { Button } from "./pressables";
import { Hairline } from "./surfaces";

/* The heavy native graph (@gorhom/bottom-sheet + react-native-gesture-handler)
   loads on first sheet render — see the module header for the WHY. Metro and
   jest both cache require() after the first call, so this is a one-time load. */

/** The @gorhom/bottom-sheet module, loaded on first sheet render. */
function bs(): typeof import("@gorhom/bottom-sheet") {
  return require("@gorhom/bottom-sheet");
}

/** react-native-gesture-handler, loaded on first sheet render. */
function gh(): typeof import("react-native-gesture-handler") {
  return require("react-native-gesture-handler");
}

/* Type-only aliases into the (lazily loaded) package — erased at compile. */
type BottomSheetBackdropComp = (typeof import("@gorhom/bottom-sheet"))["BottomSheetBackdrop"];
type BottomSheetTextInputComp = (typeof import("@gorhom/bottom-sheet"))["BottomSheetTextInput"];

/**
 * R334 2-c — AppSheet: the Heron bottom sheet, on @gorhom/bottom-sheet v5.
 *
 * Contract notes (the WHY of the local providers):
 *   · BottomSheetModal REQUIRES a BottomSheetModalProvider ancestor and the
 *     app root does not mount one yet (app/_layout.tsx is outside this
 *     branch's ownership) — so every AppSheet mounts its own. The provider
 *     renders an absolute-fill hosting container that is pointer-events
 *     box-none, i.e. invisible to layout and to taps while closed.
 *   · react-native-gesture-handler 3 THROWS in __DEV__ when a GestureDetector
 *     (the sheet handle/backdrop/drag views) has no GestureHandlerRootView
 *     ancestor. Same story: mounted locally per sheet, absolutely
 *     positioned, box-none. Hoisting BOTH providers to app/_layout.tsx is the
 *     recommended follow-up for the lead (see docs/mobile/foundations/sheets.md).
 *
 * Mount AppSheet at the ROOT of the screen it serves (a sibling of the screen
 * content, not nested inside a card/row) so the hosting container covers the
 * full screen.
 *
 * WHY THE NATIVE GRAPH IS LOADED LAZILY (R334 follow-up): ui/index.ts
 * re-exports this module, so a static import would put @gorhom/bottom-sheet
 * → react-native-gesture-handler v3 into EVERY screen's module graph (every
 * screen imports the barrel). RNGH v3 schedules a native
 * `installUIRuntimeBindings` task at import time — harmless on device,
 * fatal under jest (no native runtime: it killed src/test/render-net.test.tsx
 * via the barrel). The requires below execute on the FIRST AppSheet render
 * instead: the barrel stays cheap, the render net stays green, and on device
 * the sheet engine loads the moment the first sheet mounts.
 */

export type SheetSnap = "sm" | "md" | "lg" | "full";

/**
 * The imperative handle we drive. Structurally mirrors the package's
 * (unexported) BottomSheetModalMethods — we only ever call present/dismiss,
 * but the ref prop is typed against the full interface.
 */
type SheetModalHandle = {
  present: () => void;
  dismiss: () => void;
  snapToIndex: (index: number) => void;
  snapToPosition: (position: string | number) => void;
  expand: () => void;
  collapse: () => void;
  close: () => void;
  forceClose: () => void;
};

/** Snap preset → fraction of the window height. */
const SNAP_FRACTIONS: Record<SheetSnap, number> = {
  sm: 0.4,
  md: 0.6,
  lg: 0.85,
  full: 0.96,
};

/** Tunable sheet motion (exported — screens may override via AppSheet props). */
export const SHEET_ANIMATION = {
  /** Heron nav cadence (tokens.motion.durationNav). */
  durationMs: motion.durationNav,
  /** Reduced-motion fast path — near-instant, still not a teleport. */
  reducedDurationMs: 90,
  /** The Heron ease (tokens.heronEase as a reanimated bezier). */
  easing: Easing.bezier(...heronEase),
} as const;

export interface AppSheetProps {
  /** Controlled: true → present, false → dismiss. */
  open: boolean;
  onClose: () => void;
  /** Announced (accessibilityLabel) and rendered as the sheet header. */
  title?: string;
  /** Preset fraction of the window, or raw bottom-sheet snap points. */
  snap?: SheetSnap | (string | number)[];
  /**
   * Content-sized sheet capped at `snap` (enableDynamicSizing +
   * maxDynamicContentSize). Default true — the Heron default is "as tall as
   * the content, never taller than the cap". Pass false for a fixed-height
   * sheet (e.g. a scrollable filter body).
   */
  dynamic?: boolean;
  /** BottomSheetScrollView body — coordinated scroll-to-expand. */
  scrollable?: boolean;
  /** Footer pinned under the body (the sheet's footerComponent when scrollable). */
  footer?: ReactNode;
  /** Show the drag handle (default true). */
  showHandle?: boolean;
  /** Backdrop tap dismisses (default true). */
  closeOnBackdrop?: boolean;
  /** Show the «إغلاق» header button (default true). */
  closable?: boolean;
  /** Overrides the default (240ms / reduced 90ms) animation duration. */
  durationMs?: number;
  children: ReactNode;
}

export function AppSheet({
  open,
  onClose,
  title,
  snap = "md",
  dynamic = true,
  scrollable = false,
  footer,
  showHandle = true,
  closeOnBackdrop = true,
  closable = true,
  durationMs,
  children,
}: AppSheetProps) {
  const {
    BottomSheetModal,
    BottomSheetModalProvider,
    BottomSheetScrollView,
    BottomSheetView,
  } = bs();
  const { GestureHandlerRootView } = gh();
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const reduced = useReduceMotion();
  const { height: windowHeight } = useWindowDimensions();
  const sheetRef = useRef<SheetModalHandle>(null);
  // The last `open` we acted on — keeps present/dismiss idempotent.
  const wasOpen = useRef(false);

  const fraction = typeof snap === "string" ? SNAP_FRACTIONS[snap] : null;
  const snapPoints = dynamic
    ? undefined
    : Array.isArray(snap)
      ? snap
      : [`${Math.round((fraction ?? SNAP_FRACTIONS.md) * 100)}%`];

  // Tunable motion with the reduced-motion fast path.
  const animationConfigs = useMemo(
    () => ({
      duration: durationMs ?? (reduced ? SHEET_ANIMATION.reducedDurationMs : SHEET_ANIMATION.durationMs),
      easing: SHEET_ANIMATION.easing,
    }),
    [durationMs, reduced],
  );

  // Controlled open ↔ present/dismiss.
  useEffect(() => {
    const ref = sheetRef.current;
    if (!ref) return;
    if (open && !wasOpen.current) {
      ref.present();
      wasOpen.current = true;
    } else if (!open && wasOpen.current) {
      ref.dismiss();
      wasOpen.current = false;
    }
  }, [open]);

  // Dismissed by pan / backdrop tap / Android back — sync the controlled prop.
  const handleDismiss = () => {
    wasOpen.current = false;
    onClose();
  };

  // Sticky footer for the scrollable variant — rides the sheet's own
  // footerComponent slot so it stays pinned above the scrolling body.
  const Footer = useMemo(() => {
    if (!footer) return undefined;
    const F = (_props: BottomSheetFooterProps) => (
      <View
        style={{
          backgroundColor: p.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: p.rule,
          paddingTop: sp[12],
          paddingHorizontal: sp[20],
          paddingBottom: Math.max(sp[12], insets.bottom),
        }}
      >
        {footer}
      </View>
    );
    return F;
  }, [footer, p.surface, p.rule, insets.bottom]);

  const header = title || closable ? (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: sp[8],
        paddingTop: sp[4],
        paddingBottom: sp[12],
      }}
    >
      <View style={{ flex: 1 }}>
        {title ? (
          <T variant="h4" weight="bold" accessibilityRole="header">
            {title}
          </T>
        ) : null}
      </View>
      {closable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="إغلاق"
          onPress={handleDismiss}
          hitSlop={6}
          style={{ width: touchFloor, height: touchFloor, alignItems: "center", justifyContent: "center" }}
        >
          <X size={20} color={p.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  ) : null;

  return (
    <GestureHandlerRootView style={styles.host} pointerEvents="box-none">
      <BottomSheetModalProvider>
        <BottomSheetModal
          ref={sheetRef}
          onDismiss={handleDismiss}
          accessibilityLabel={title}
          snapPoints={snapPoints}
          enableDynamicSizing={dynamic}
          maxDynamicContentSize={
            dynamic && fraction ? Math.round(windowHeight * fraction) : undefined
          }
          bottomInset={insets.bottom}
          topInset={insets.top}
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
          enableBlurKeyboardOnGesture
          android_keyboardInputMode="adjustResize"
          enablePanDownToClose
          animationConfigs={animationConfigs}
          handleComponent={showHandle ? undefined : null}
          handleIndicatorStyle={{ backgroundColor: p.rule, width: 36, height: 4, borderRadius: 2 }}
          handleStyle={{ paddingTop: sp[8], paddingBottom: sp[4] }}
          backgroundStyle={{
            backgroundColor: p.surface,
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: p.rule,
          }}
          backdropComponent={closeOnBackdrop ? SheetBackdrop : undefined}
          footerComponent={scrollable ? Footer : undefined}
        >
          {scrollable ? (
            <BottomSheetScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: sp[20], paddingBottom: sp[20] }}
            >
              {header}
              {children}
            </BottomSheetScrollView>
          ) : (
            <BottomSheetView style={{ paddingHorizontal: sp[20], paddingBottom: sp[20] }}>
              {header}
              {children}
              {footer ? (
                <View
                  style={{
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: p.rule,
                    marginTop: sp[12],
                    paddingTop: sp[12],
                  }}
                >
                  {footer}
                </View>
              ) : null}
            </BottomSheetView>
          )}
        </BottomSheetModal>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

/** Themed backdrop — ink scrim, tap to close (Heron hairline world: no blur). */
function SheetBackdrop(props: ComponentProps<BottomSheetBackdropComp>) {
  const { BottomSheetBackdrop } = bs();
  return (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      pressBehavior="close"
      opacity={0.45}
    />
  );
}

/**
 * SheetTextInput — the keyboard-aware input for sheet bodies. Wraps
 * BottomSheetTextInput (a GestureHandler TextInput) so `keyboardBehavior`
 * tracks the focused field instead of covering it; Heron hairline styling,
 * Arabic-first (RTL) text alignment. Use INSIDE AppSheet instead of a bare
 * TextInput — plain TextInputs ignore the sheet's keyboard tracking.
 */
export function SheetTextInput(props: ComponentProps<BottomSheetTextInputComp>) {
  const p = usePalette();
  const { BottomSheetTextInput } = bs();
  return (
    <BottomSheetTextInput
      placeholderTextColor={p.textFaint}
      {...props}
      style={[
        {
          backgroundColor: p.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.rule,
          paddingHorizontal: sp[12],
          minHeight: 48,
          color: p.text,
          fontSize: 15,
          textAlign: "right",
        },
        props.style,
      ]}
    />
  );
}

/* ── Presets ─────────────────────────────────────────────────────────── */

export interface ConfirmSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  /** Holds the confirm button while the action runs. */
  loading?: boolean;
}

/** ConfirmSheet — action confirmation as a sheet («تأكيد» / «إلغاء»). */
export function ConfirmSheet({
  open,
  onClose,
  title,
  message,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  destructive = false,
  onConfirm,
  loading = false,
}: ConfirmSheetProps) {
  return (
    <AppSheet open={open} onClose={onClose} title={title} snap="sm" dynamic>
      {message ? (
        <T variant="body" color="secondary" style={{ paddingBottom: sp[16] }}>
          {message}
        </T>
      ) : null}
      <View style={{ flexDirection: "row", gap: sp[8] }}>
        <View style={{ flex: 1 }}>
          <Button label={cancelLabel} kind="ghost" onPress={onClose} small />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={confirmLabel}
            kind={destructive ? "danger" : "primary"}
            onPress={onConfirm}
            loading={loading}
            small
          />
        </View>
      </View>
    </AppSheet>
  );
}

export interface SheetAction {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  destructive?: boolean;
}

export interface ActionSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  actions: SheetAction[];
  cancelLabel?: string;
}

/** ActionSheet — icon+label rows over hairlines, «إلغاء» underneath. */
export function ActionSheet({
  open,
  onClose,
  title,
  actions,
  cancelLabel = "إلغاء",
}: ActionSheetProps) {
  const p = usePalette();
  return (
    <AppSheet open={open} onClose={onClose} title={title} snap="md" dynamic>
      <View style={{ borderWidth: StyleSheet.hairlineWidth, borderColor: p.border }}>
        {actions.map((a, i) => (
          <View key={a.label}>
            {i > 0 ? <Hairline /> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={a.label}
              onPress={() => {
                onClose();
                a.onPress();
              }}
              style={({ pressed }) => ({
                minHeight: touchFloor,
                justifyContent: "center",
                backgroundColor: pressed ? p.surfaceHover : "transparent",
                paddingHorizontal: sp[12],
              })}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: sp[12],
                  paddingVertical: sp[10],
                }}
              >
                {a.icon}
                <T variant="body" weight="medium" color={a.destructive ? "danger" : "text"}>
                  {a.label}
                </T>
              </View>
            </Pressable>
          </View>
        ))}
      </View>
      <View style={{ paddingTop: sp[12] }}>
        <Button label={cancelLabel} kind="ghost" onPress={onClose} />
      </View>
    </AppSheet>
  );
}

export interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Scrollable filter body (checkboxes, segmented controls, …). */
  children: ReactNode;
  onApply: () => void;
  onReset: () => void;
  applyLabel?: string;
  resetLabel?: string;
  applyDisabled?: boolean;
}

/** FilterSheet — scrollable body + sticky «تطبيق» / «إعادة تعيين» footer. */
export function FilterSheet({
  open,
  onClose,
  title = "تصفية",
  children,
  onApply,
  onReset,
  applyLabel = "تطبيق",
  resetLabel = "إعادة تعيين",
  applyDisabled = false,
}: FilterSheetProps) {
  return (
    <AppSheet
      open={open}
      onClose={onClose}
      title={title}
      snap="lg"
      dynamic={false}
      scrollable
      footer={
        <View style={{ flexDirection: "row", gap: sp[8] }}>
          <View style={{ flex: 1 }}>
            <Button label={resetLabel} kind="ghost" onPress={onReset} small />
          </View>
          <View style={{ flex: 1 }}>
            <Button label={applyLabel} kind="primary" onPress={onApply} disabled={applyDisabled} small />
          </View>
        </View>
      }
    >
      {children}
    </AppSheet>
  );
}

export interface PickerOption {
  id: string;
  label: string;
  sub?: string | null;
}

export interface PickerSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  options: PickerOption[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
  emptyLabel?: string;
}

/** PickerSheet — single-select rows with a check mark (RTL: العلامة تنتهي الصف). */
export function PickerSheet({
  open,
  onClose,
  title,
  options,
  selectedId,
  onSelect,
  loading = false,
  emptyLabel = "لا توجد خيارات",
}: PickerSheetProps) {
  const p = usePalette();
  return (
    <AppSheet open={open} onClose={onClose} title={title} snap="md" dynamic>
      {loading ? (
        <T variant="body" color="muted">
          جارٍ التحميل…
        </T>
      ) : options.length === 0 ? (
        <T variant="body" color="muted">
          {emptyLabel}
        </T>
      ) : (
        <View style={{ borderWidth: StyleSheet.hairlineWidth, borderColor: p.border }}>
          {options.map((o, i) => {
            const selected = o.id === selectedId;
            return (
              <View key={o.id}>
                {i > 0 ? <Hairline /> : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={o.label}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onSelect(o.id);
                    onClose();
                  }}
                  style={({ pressed }) => ({
                    minHeight: touchFloor,
                    justifyContent: "center",
                    backgroundColor: pressed ? p.surfaceHover : "transparent",
                    paddingHorizontal: sp[12],
                  })}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: sp[12],
                      paddingVertical: sp[10],
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <T variant="body" weight={selected ? "bold" : "medium"}>
                        {o.label}
                      </T>
                      {o.sub ? (
                        <T variant="sm" color="muted">
                          {o.sub}
                        </T>
                      ) : null}
                    </View>
                    {selected ? <Check size={20} color={p.accentInk} /> : null}
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </AppSheet>
  );
}

const styles = StyleSheet.create({
  host: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
});
