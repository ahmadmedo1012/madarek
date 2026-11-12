import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
  KeyboardToolbar,
  useKeyboardState,
} from "react-native-keyboard-controller";
import TriangleAlert from "lucide-react-native/icons/triangle-alert";
import CircleCheck from "lucide-react-native/icons/circle-check";
import { z } from "zod";
import { usePalette, useStatusTones } from "@/design/theme";
import { heron, sp } from "@/design/tokens";
import { FormFieldsContext, type FormFieldsApi } from "./fields";
import { T } from "./text";
import { Button, type ButtonKind } from "./pressables";

/**
 * form.tsx — R334 B5 «النماذج» — the FormScreen pattern.
 *
 * One keyboard-aware form recipe for the whole app (Arabic-first, RTL):
 *   · KeyboardAwareScrollView (react-native-keyboard-controller) keeps the
 *     focused field visible without layout-thrash;
 *   · a bottom-anchored primary action that rides above the keyboard
 *     (KeyboardStickyView) with async loading/success/error states and an
 *     Arabic error summary;
 *   · the accessory KeyboardToolbar «السابق / التالي / تم» for field
 *     navigation (its own arrows also chain focus natively);
 *   · automatic returnKeyType chaining (next → done) + focus order via
 *     FormFieldsProvider (the registry itself lives in ./fields.tsx so
 *     Field never imports this module — no cycles);
 *   · safe-area-aware paddings (top inset + home-indicator clearance).
 *
 * Works standalone (uncontrolled Fields + useFormValidation) AND with
 * react-hook-form (`register`/`Controller` — Field forwards refs,
 * React 19 ref-as-prop). See docs/mobile/foundations/form.md.
 */

/** The controller's accessory toolbar height (its own constant). */
const TOOLBAR_HEIGHT = 42;
/** Bottom reserve so scroll content clears the sticky action bar. */
const ACTION_RESERVE = 104;

/* ── FormFieldsProvider — the focus-order registry ──────────────────── */

export function FormFieldsProvider({
  children,
  submit,
}: {
  children: ReactNode;
  submit?: () => void;
}) {
  const [order, setOrder] = useState<string[]>([]);
  const focusFns = useRef(new Map<string, () => void>());
  const submitRef = useRef<(() => void) | undefined>(submit);
  useEffect(() => {
    submitRef.current = submit;
  }, [submit]);

  const register = useCallback((field: { id: string; focus: () => void }) => {
    focusFns.current.set(field.id, field.focus);
    setOrder((prev) => (prev.includes(field.id) ? prev : [...prev, field.id]));
    return () => {
      focusFns.current.delete(field.id);
      setOrder((prev) => prev.filter((x) => x !== field.id));
    };
  }, []);

  const isLast = useCallback(
    (id: string) => (order.length === 0 ? true : order[order.length - 1] === id),
    [order],
  );
  const focusNext = useCallback(
    (id: string) => {
      const i = order.indexOf(id);
      const next = i >= 0 ? order[i + 1] : undefined;
      if (next) focusFns.current.get(next)?.();
    },
    [order],
  );

  const api = useMemo<FormFieldsApi>(
    () => ({
      register,
      isLast,
      focusNext,
      submit: () => submitRef.current?.(),
    }),
    [register, isLast, focusNext],
  );

  return <FormFieldsContext.Provider value={api}>{children}</FormFieldsContext.Provider>;
}

/* ── FormScreen — the keyboard-aware form container ─────────────────── */

export interface FormScreenProps {
  children: ReactNode;
  /** Primary action; may be async — busy + thrown-error states are managed. */
  onSubmit?: () => void | Promise<void>;
  submitLabel?: string;
  submitLoading?: boolean;
  submitDisabled?: boolean;
  /** Stable e2e anchor for the submit Button (R349 smoke ids). */
  submitTestID?: string;
  submitKind?: ButtonKind;
  /** Form-level Arabic error summary (API refusal, etc.) — announced as alert. */
  error?: string | null;
  /** Arabic success note (mint tone) shown above the action. */
  success?: string | null;
  /** Extra rows under the primary action (links, secondary buttons). */
  footer?: ReactNode;
  /** Accessory keyboard toolbar «السابق / التالي / تم» (default true). */
  toolbar?: boolean;
  /** Anchor the primary action above the keyboard (default true). */
  stickyAction?: boolean;
  /** Horizontal screen padding (default true). */
  padded?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  actionStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}

/** The Heron toolbar theme — ink on paper, both appearances. */
const TOOLBAR_THEME = {
  light: { primary: heron.light.text, disabled: heron.light.textFaint, background: heron.light.surface, ripple: heron.light.surfaceHover },
  dark: { primary: heron.dark.text, disabled: heron.dark.textFaint, background: heron.dark.surface, ripple: heron.dark.surfaceHover },
};

export function FormScreen({
  children,
  onSubmit,
  submitLabel,
  submitLoading,
  submitDisabled,
  submitKind,
  submitTestID,
  error,
  success,
  footer,
  toolbar = true,
  stickyAction = true,
  padded = true,
  contentContainerStyle,
  actionStyle,
  style,
}: FormScreenProps) {
  const p = usePalette();
  const tones = useStatusTones();
  const insets = useSafeAreaInsets();
  const kb = useKeyboardState();

  /* async submit flow: loading + thrown-error states live here */
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const loading = submitLoading || busy;

  const runSubmit = useCallback(async () => {
    if (!onSubmit || loading || submitDisabled) return;
    setSubmitError(null);
    setBusy(true);
    try {
      await onSubmit();
    } catch (err) {
      setSubmitError(
        err instanceof Error && err.message ? err.message : "تعذّر إتمام العملية — حاول مرة أخرى.",
      );
    } finally {
      setBusy(false);
    }
  }, [onSubmit, loading, submitDisabled]);

  const shownError = error ?? submitError;
  const hasAction = !!(onSubmit || footer);

  const actionBar = (
    <View style={[{ gap: sp[12] }, actionStyle]}>
      {shownError ? (
        <View
          accessibilityRole="alert"
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: sp[8],
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: p.accentInk,
            backgroundColor: p.accentSoft,
            paddingHorizontal: sp[12],
            paddingVertical: sp[10],
          }}
        >
          <TriangleAlert size={15} color={p.accentInk} />
          <T variant="sm" style={{ flex: 1, color: p.accentInk }}>
            {shownError}
          </T>
        </View>
      ) : success ? (
        <View
          accessibilityRole="alert"
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: sp[8],
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: tones.mint.deep,
            backgroundColor: tones.mint.bg,
            paddingHorizontal: sp[12],
            paddingVertical: sp[10],
          }}
        >
          <CircleCheck size={15} color={tones.mint.ink} />
          <T variant="sm" style={{ flex: 1, color: tones.mint.ink }}>
            {success}
          </T>
        </View>
      ) : null}
      {onSubmit && submitLabel ? (
        <Button
          label={submitLabel}
          onPress={runSubmit}
          loading={loading}
          disabled={submitDisabled}
          kind={submitKind}
          testID={submitTestID}
        />
      ) : null}
      {footer}
    </View>
  );

  // the focused field must clear the toolbar + sticky bar above the keyboard
  const bottomOffset = kb.isVisible ? (toolbar ? TOOLBAR_HEIGHT : 0) + ACTION_RESERVE : 12;

  return (
    <View style={[{ flex: 1, backgroundColor: p.bg }, style]}>
      <FormFieldsProvider submit={onSubmit ? runSubmit : undefined}>
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          bottomOffset={bottomOffset}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            {
              flexGrow: 1,
              gap: sp[16],
              paddingTop: Math.max(sp[16], insets.top + sp[8]),
              paddingBottom: stickyAction && hasAction ? ACTION_RESERVE : sp[24],
            },
            padded && { paddingHorizontal: sp[24] },
            contentContainerStyle,
          ]}
        >
          <View style={{ gap: sp[16], flex: stickyAction && hasAction ? 1 : undefined }}>
            {children}
          </View>
          {stickyAction && !hasAction ? actionBar : null}
        </KeyboardAwareScrollView>

        {stickyAction && hasAction ? (
          <KeyboardStickyView
            offset={{ closed: -insets.bottom, opened: toolbar ? -TOOLBAR_HEIGHT : 0 }}
          >
            <View
              style={{
                backgroundColor: p.bg,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: p.rule,
                paddingHorizontal: padded ? sp[24] : 0,
                paddingTop: sp[12],
              }}
            >
              {actionBar}
            </View>
          </KeyboardStickyView>
        ) : null}

        {toolbar ? (
          <KeyboardToolbar theme={TOOLBAR_THEME}>
            <KeyboardToolbar.Prev>
              <T variant="sm" color="secondary">
                السابق
              </T>
            </KeyboardToolbar.Prev>
            <KeyboardToolbar.Next>
              <T variant="sm" color="secondary">
                التالي
              </T>
            </KeyboardToolbar.Next>
            <KeyboardToolbar.Done
              text={
                <T variant="sm" weight="medium">
                  تم
                </T>
              }
            />
          </KeyboardToolbar>
        ) : null}
      </FormFieldsProvider>
    </View>
  );
}

/* ── Arabic zod messages — the adapter + rule factories ─────────────── */

/** The zod issue shape this adapter reads (structural — zod 4). */
interface IssueLike {
  code: string;
  origin?: string | undefined;
  path: PropertyKey[];
  message?: string | undefined;
  minimum?: number | undefined;
  maximum?: number | undefined;
  format?: string | undefined;
}

export const AR_MESSAGES = {
  required: "هذا الحقل مطلوب",
  email: "بريد إلكتروني غير صالح",
  url: "رابط غير صالح",
  phone: "رقم هاتف غير صالح",
  minChars: (n: number) => `يجب أن يكون ${n} حرفًا على الأقل`,
  maxChars: (n: number) => `يجب ألّا يتجاوز ${n} حرفًا`,
  minNumber: (n: number) => `يجب أن يكون ${n} على الأقل`,
  maxNumber: (n: number) => `يجب أن يكون ${n} على الأكثر`,
  invalid: "قيمة غير صالحة",
} as const;

/**
 * Map a zod issue to an Arabic message. Schemas built with the `ar()`
 * factories already carry Arabic messages; this is the fallback for plain
 * zod schemas (and for issue codes without a factory).
 */
export function arabizeIssue(issue: IssueLike): string {
  switch (issue.code) {
    case "invalid_type":
      // an absent/empty string is a missing value, not a type error
      return AR_MESSAGES.required;
    case "invalid_format":
      if (issue.format === "email") return AR_MESSAGES.email;
      if (issue.format === "url") return AR_MESSAGES.url;
      return AR_MESSAGES.invalid;
    case "too_small": {
      const n = issue.minimum ?? 0;
      if (issue.origin === "string" && n <= 1) return AR_MESSAGES.required;
      return issue.origin === "number" || issue.origin === "int"
        ? AR_MESSAGES.minNumber(n)
        : AR_MESSAGES.minChars(n);
    }
    case "too_big": {
      const n = issue.maximum ?? 0;
      return issue.origin === "number" || issue.origin === "int"
        ? AR_MESSAGES.maxNumber(n)
        : AR_MESSAGES.maxChars(n);
    }
    default:
      return issue.message ?? AR_MESSAGES.invalid;
  }
}

/**
 * Arabic-first zod rule factories — the vocabulary every form shares.
 * `ar.email()` reads: required first («هذا الحقل مطلوب»), then the format
 * check («بريد إلكتروني غير صالح»).
 */
export const ar = {
  required: (msg: string = AR_MESSAGES.required) => z.string().trim().min(1, { message: msg }),
  email: (msg: string = AR_MESSAGES.email) =>
    z
      .string()
      .trim()
      .min(1, { message: AR_MESSAGES.required })
      .pipe(z.email({ message: msg })),
  password: (min = 12, max = 72) =>
    z
      .string()
      .min(min, { message: `كلمة المرور ${min} حرفًا على الأقل (حتى ${max}).` })
      .max(max, { message: `كلمة المرور أطول من الحد (${max} حرفًا).` }),
  username: () =>
    z
      .string()
      .trim()
      .min(3, { message: AR_MESSAGES.minChars(3) })
      .max(30, { message: AR_MESSAGES.maxChars(30) })
      .regex(/^[a-z0-9._-]+$/, { message: "يُسمح بالحروف اللاتينية الصغيرة والأرقام و . _ - فقط" }),
  phone: () => z.string().trim().regex(/^\+?\d{8,15}$/, { message: AR_MESSAGES.phone }),
  length: (min: number, max?: number) =>
    z
      .string()
      .trim()
      .min(min, { message: AR_MESSAGES.minChars(min) })
      .max(max ?? 512, { message: AR_MESSAGES.maxChars(max ?? 512) }),
};

/* ── useFormValidation — standalone zod adapter with touched semantics ── */

export interface UseFormValidationResult {
  /** Bind straight to <Field {...form.field("email")} />. */
  field: (name: string) => {
    value: string;
    onChangeText: (text: string) => void;
    onBlur: () => void;
    error: string | undefined;
  };
  values: Record<string, unknown>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  /** True after a submit attempt — field errors stop hiding then. */
  submitted: boolean;
  /** Error for one field — undefined until touched or submitted. */
  errorFor: (name: string) => string | undefined;
  setValue: (name: string, value: unknown) => void;
  blur: (name: string) => void;
  /** Validate every field; records all errors and marks submitted. */
  validateAll: () => boolean;
  /** Wrap an async submit: validates first, then runs `fn(values)`. */
  handleSubmit: (fn: (values: Record<string, unknown>) => void | Promise<void>) => () => Promise<void>;
  reset: (values?: Record<string, unknown>) => void;
}

function issuesToErrors(issues: IssueLike[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "_");
    if (!(key in out)) out[key] = arabizeIssue(issue);
  }
  return out;
}

export function useFormValidation<S extends z.ZodObject<z.ZodRawShape>>({
  schema,
  initialValues,
}: {
  schema: S;
  initialValues?: Record<string, unknown>;
}): UseFormValidationResult {
  const [values, setValues] = useState<Record<string, unknown>>(() => ({ ...initialValues }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  const shape = schema.shape as Record<string, z.ZodType>;

  const validateField = useCallback(
    (name: string): string | undefined => {
      const fieldSchema = shape[name];
      if (!fieldSchema) return undefined;
      const result = fieldSchema.safeParse(values[name]);
      if (result.success) return undefined;
      return arabizeIssue(result.error.issues[0] as unknown as IssueLike);
    },
    [shape, values],
  );

  const setValue = useCallback(
    (name: string, value: unknown) => {
      setValues((prev) => ({ ...prev, [name]: value }));
      // live re-validation once the field has been seen (touched/submit)
      if (touched[name] || submitted) {
        const fieldSchema = shape[name];
        if (fieldSchema) {
          const result = fieldSchema.safeParse(value);
          setErrors((prev) => {
            const next = { ...prev };
            if (result.success) delete next[name];
            else next[name] = arabizeIssue(result.error.issues[0] as unknown as IssueLike);
            return next;
          });
        }
      }
    },
    [shape, touched, submitted],
  );

  const blur = useCallback(
    (name: string) => {
      setTouched((prev) => ({ ...prev, [name]: true }));
      const message = validateField(name);
      setErrors((prev) => {
        const next = { ...prev };
        if (message) next[name] = message;
        else delete next[name];
        return next;
      });
    },
    [validateField],
  );

  const errorFor = useCallback(
    (name: string) => (touched[name] || submitted ? errors[name] : undefined),
    [touched, submitted, errors],
  );

  const field = useCallback(
    (name: string) => ({
      value: (values[name] as string | undefined) ?? "",
      onChangeText: (text: string) => setValue(name, text),
      onBlur: () => blur(name),
      error: errorFor(name),
    }),
    [values, setValue, blur, errorFor],
  );

  const validateAll = useCallback((): boolean => {
    const result = schema.safeParse(values);
    setSubmitted(true);
    if (result.success) {
      setErrors({});
      return true;
    }
    setErrors(issuesToErrors(result.error.issues as unknown as IssueLike[]));
    return false;
  }, [schema, values]);

  const handleSubmit = useCallback(
    (fn: (values: Record<string, unknown>) => void | Promise<void>) =>
      async () => {
        if (!validateAll()) return;
        await fn(values);
      },
    [validateAll, values],
  );

  const reset = useCallback((next?: Record<string, unknown>) => {
    setValues({ ...(next ?? initialValues ?? {}) });
    setErrors({});
    setTouched({});
    setSubmitted(false);
  }, [initialValues]);

  return {
    field,
    values,
    errors,
    touched,
    submitted,
    errorFor,
    setValue,
    blur,
    validateAll,
    handleSubmit,
    reset,
  };
}
