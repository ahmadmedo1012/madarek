import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type Ref,
} from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
  type TextInputProps,
  type ReturnKeyTypeOptions,
} from "react-native";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import Eye from "lucide-react-native/icons/eye";
import EyeOff from "lucide-react-native/icons/eye-off";
import Search from "lucide-react-native/icons/search";
import X from "lucide-react-native/icons/x";
import { usePalette } from "@/design/theme";
import { sp, touchFloor } from "@/design/tokens";
import { T } from "./text";
import { OptionSheet } from "./surfaces";
import { InlineBusy } from "./boot";

/**
 * Form fields — hairline inputs on paper, 44px floors, Arabic labels,
 * inline error association (accessibilityLabel / error text paired).
 *
 * R334 B5 (forms & keyboard) — additive upgrade, every pre-existing
 * export and prop keeps working (all 30+ screens untouched):
 *   · `Field` gains: purpose→textContentType/autoComplete mapping,
 *     input masks (digits/phone/username), disabled + loading states,
 *     a focus ring from the palette tokens, error announcement for
 *     screen readers, and automatic returnKeyType chaining
 *     (next/done) when rendered inside `FormScreen`/`FormFieldsProvider`
 *     (./form.tsx) — the provider lives here so fields never import
 *     form.tsx (no cycle).
 *   · `SecretField` keeps its name/props; the toggle now shows the
 *     Arabic caption «إظهار»/«إخفاء» beside the eye icon.
 */

/* ── field-registration context (driven by <FormScreen> in ./form.tsx) ── */

export interface FormFieldsApi {
  /** Register a focusable field; returns its unregister function. */
  register: (field: { id: string; focus: () => void }) => () => void;
  /** True when `id` is the last registered field (its return key = «تم»). */
  isLast: (id: string) => boolean;
  /** Move focus to the field registered after `id`. */
  focusNext: (id: string) => void;
  /** The form's primary action (wired by FormScreen) for the last field. */
  submit?: () => void;
}

export const FormFieldsContext = createContext<FormFieldsApi | null>(null);

/** Read the ambient field registry (null outside a form provider). */
export function useFormFields(): FormFieldsApi | null {
  return useContext(FormFieldsContext);
}

/* ── purpose → autofill mapping ─────────────────────────────────────── */

export type FieldPurpose =
  | "email"
  | "username"
  | "name"
  | "password"
  | "newPassword"
  | "phone"
  | "oneTimeCode"
  | "url";

type PurposeDefaults = Partial<
  Pick<
    TextInputProps,
    | "textContentType"
    | "autoComplete"
    | "keyboardType"
    | "autoCapitalize"
    | "autoCorrect"
  >
>;

const PURPOSE_MAP: Record<FieldPurpose, PurposeDefaults> = {
  email: {
    textContentType: "emailAddress",
    autoComplete: "email",
    keyboardType: "email-address",
    autoCapitalize: "none",
    autoCorrect: false,
  },
  username: {
    textContentType: "username",
    autoComplete: "username",
    keyboardType: "default",
    autoCapitalize: "none",
    autoCorrect: false,
  },
  name: { textContentType: "name", autoComplete: "name" },
  password: { textContentType: "password", autoComplete: "password", autoCorrect: false },
  newPassword: { textContentType: "newPassword", autoComplete: "password-new", autoCorrect: false },
  phone: { textContentType: "telephoneNumber", autoComplete: "tel", keyboardType: "phone-pad" },
  oneTimeCode: { textContentType: "oneTimeCode", autoComplete: "sms-otp", keyboardType: "number-pad" },
  url: { textContentType: "URL", autoComplete: "url", autoCapitalize: "none", autoCorrect: false },
};

/* ── input masks ────────────────────────────────────────────────────── */

export type FieldMask = "digits" | "phone" | "username";

/** Arabic-Indic (٠-٩) and Persian (۰-۹) numerals → ASCII digits. */
function normalizeDigits(text: string): string {
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  return text.replace(/[٠-٩۰-۹]/g, (d) => {
    const a = arabic.indexOf(d);
    if (a >= 0) return String(a);
    const p = persian.indexOf(d);
    return p >= 0 ? String(p) : d;
  });
}

export function applyFieldMask(mask: FieldMask, text: string): string {
  switch (mask) {
    case "digits":
      return normalizeDigits(text).replace(/[^\d]/g, "");
    case "phone": {
      // digits only (Arabic-Indic normalized); a single leading "+" survives
      const hadPlus = text.trimStart().startsWith("+");
      const digits = normalizeDigits(text).replace(/[^\d]/g, "");
      return (hadPlus ? "+" : "") + digits;
    }
    case "username":
      return text
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, "")
        .replace(/^[._-]+/, "");
  }
}

/* ── Field ──────────────────────────────────────────────────────────── */

export interface FieldProps extends TextInputProps {
  label: string;
  error?: string | null;
  hint?: string | null;
  required?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  /** R334 B5: explicit registration id inside a form (default: the label). */
  fieldId?: string;
  /** R334 B5: autofill purpose — maps to textContentType/autoComplete. */
  purpose?: FieldPurpose;
  /** R334 B5: input mask applied on every change. */
  mask?: FieldMask;
  /** R334 B5: locks editing (async work in flight on this field). */
  loading?: boolean;
  /** R334 B5: disables editing with a quiet ink (still 48px tall). */
  disabled?: boolean;
  /** R334 B5: renders the «إظهار»/«إخفاء» secure toggle (SecretField). */
  secureToggle?: boolean;
  /** React 19 ref-as-prop — forwarded to the TextInput (RHF `register`). */
  ref?: Ref<ComponentRef<typeof TextInput>>;
}

export function Field({
  label,
  error,
  hint,
  required,
  containerStyle,
  fieldId,
  purpose,
  mask,
  loading,
  disabled,
  secureToggle,
  ref,
  ...input
}: FieldProps) {
  const p = usePalette();
  const ctx = useContext(FormFieldsContext);
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);
  const inputRef = useRef<ComponentRef<typeof TextInput> | null>(null);

  const id = fieldId ?? label;
  const isLastField = ctx?.isLast(id) ?? true;
  // depend on the STABLE register callback (not the api object — it is
  // recreated whenever the order state changes, which would unregister +
  // re-register every field on each pass: an update ping-pong loop).
  const register = ctx?.register;

  // register into the ambient form (focus chain + returnKeyType) —
  // fires once per field mount (register is useCallback-stable).
  useEffect(() => {
    if (!register) return;
    return register({
      id,
      focus: () => inputRef.current?.focus(),
    });
  }, [register, id]);

  // merged caller ref + internal ref (React 19 ref-as-prop)
  const setRef = (el: ComponentRef<typeof TextInput> | null) => {
    inputRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref && typeof ref === "object") (ref as { current: ComponentRef<typeof TextInput> | null }).current = el;
  };

  // return-key chaining: explicit props win; inside a form the key reads
  // «التالي» until the last field («تم»), and submitting the last field
  // fires the form's primary action.
  const autoKey: ReturnKeyTypeOptions | undefined = ctx ? (isLastField ? "done" : "next") : undefined;
  const autoSubmit = useMemo(() => {
    if (!ctx) return undefined;
    return isLastField ? () => ctx.submit?.() : () => ctx.focusNext(id);
  }, [ctx, isLastField, id]);

  const merged: TextInputProps = purpose ? { ...PURPOSE_MAP[purpose], ...input } : input;
  const locked = disabled || loading;
  const leadingWidth = (secureToggle ? 64 : 0) + (loading ? touchFloor : 0);

  return (
    <View style={[{ gap: sp[6] }, containerStyle]}>
      <T variant="sm" weight="medium" color={error ? "danger" : "secondary"}>
        {label}
        {required ? " *" : ""}
      </T>
      <View>
        <TextInput
          ref={setRef}
          placeholderTextColor={p.textFaint}
          accessibilityLabel={input.accessibilityLabel ?? (error ? `${label} — ${error}` : label)}
          {...merged}
          secureTextEntry={secureToggle ? !show : merged.secureTextEntry}
          editable={locked ? false : merged.editable}
          accessibilityState={disabled ? { disabled: true } : merged.accessibilityState}
          onChangeText={(text) => {
            input.onChangeText?.(mask ? applyFieldMask(mask, text) : text);
          }}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          returnKeyType={input.returnKeyType ?? autoKey}
          onSubmitEditing={input.onSubmitEditing ?? autoSubmit}
          style={[
            {
              backgroundColor: p.surface,
              borderWidth: focused ? 1 : StyleSheet.hairlineWidth,
              borderColor: error ? p.accentInk : focused ? p.text : p.rule,
              paddingHorizontal: sp[12],
              paddingLeft: leadingWidth ? leadingWidth + sp[8] : sp[12],
              minHeight: 48,
              color: locked ? p.textMuted : p.text,
              fontSize: 15,
              textAlign: "right",
              opacity: disabled ? 0.6 : 1,
            },
            merged.style as StyleProp<TextStyle>,
          ]}
        />
        {secureToggle || loading ? (
          <View
            style={{
              position: "absolute",
              left: 0,
              bottom: 0,
              flexDirection: "row",
              alignItems: "center",
              height: 48,
            }}
          >
            {loading ? (
              <View style={{ width: touchFloor, height: 48, alignItems: "center", justifyContent: "center" }}>
                <InlineBusy size={12} color={p.textMuted} />
              </View>
            ) : null}
            {secureToggle ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                onPress={() => setShow((v) => !v)}
                style={{
                  minHeight: 48,
                  minWidth: touchFloor,
                  paddingHorizontal: sp[4],
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                }}
              >
                {show ? <EyeOff size={18} color={p.textMuted} /> : <Eye size={18} color={p.textMuted} />}
                <T variant="xs" color="muted">
                  {show ? "إخفاء" : "إظهار"}
                </T>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
      {error ? (
        <T variant="sm" color="danger" accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </T>
      ) : hint ? (
        <T variant="sm" color="muted">
          {hint}
        </T>
      ) : null}
    </View>
  );
}

export function SecretField({
  label,
  error,
  hint,
  fieldId,
  loading,
  disabled,
  ...input
}: FieldProps) {
  return (
    <Field
      label={label}
      error={error}
      hint={hint}
      fieldId={fieldId}
      loading={loading}
      disabled={disabled}
      secureToggle
      autoCorrect={false}
      textContentType="password"
      {...input}
    />
  );
}

/** Enumerated choice rendered as a pressable input row opening an OptionSheet. */
export function SelectField({
  label,
  value,
  options,
  onSelect,
  placeholder = "اختر…",
  error,
  loading,
  disabled,
  sheetTitle,
  emptyLabel,
}: {
  label: string;
  value: { id: string; label: string } | null;
  options: { id: string; label: string; sub?: string | null }[];
  onSelect: (id: string) => void;
  placeholder?: string;
  error?: string | null;
  loading?: boolean;
  disabled?: boolean;
  sheetTitle?: string;
  emptyLabel?: string;
}) {
  const p = usePalette();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: sp[6] }}>
      <T variant="sm" weight="medium" color={error ? "danger" : "secondary"}>
        {label}
      </T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: sp[8],
          backgroundColor: pressed ? p.surfaceHover : p.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: error ? p.accentInk : p.rule,
          paddingHorizontal: sp[12],
          minHeight: 48,
          opacity: disabled ? 0.5 : 1,
        })}
      >
        <View style={{ flex: 1 }}>
          <T variant="body" color={value ? "text" : "muted"}>
            {value ? value.label : placeholder}
          </T>
        </View>
        {loading ? <T variant="sm" color="muted">جارٍ التحميل…</T> : <ChevronDown size={18} color={p.textMuted} />}
      </Pressable>
      {error ? (
        <T variant="sm" color="danger">
          {error}
        </T>
      ) : null}
      <OptionSheet
        open={open}
        onClose={() => setOpen(false)}
        title={sheetTitle ?? label}
        options={options}
        onSelect={onSelect}
        selectedId={value?.id ?? null}
        loading={loading}
        emptyLabel={emptyLabel}
      />
    </View>
  );
}

/** Search pill for list headers. */
export function SearchBar({
  value,
  onChange,
  placeholder = "ابحث…",
  onClear,
  autoFocus,
}: {
  value: string;
  onChange: (q: string) => void;
  placeholder?: string;
  onClear?: () => void;
  autoFocus?: boolean;
}) {
  const p = usePalette();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: sp[8],
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: p.rule,
        backgroundColor: p.surface,
        paddingHorizontal: sp[12],
        minHeight: 48,
      }}
    >
      <Search size={18} color={p.textMuted} />
      <TextInput
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        placeholderTextColor={p.textFaint}
        value={value}
        onChangeText={onChange}
        autoFocus={autoFocus}
        returnKeyType="search"
        style={{ flex: 1, color: p.text, fontSize: 15, textAlign: "right", paddingVertical: 12 }}
      />
      {value.length > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel="مسح البحث" onPress={() => (onClear ? onClear() : onChange(""))} style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
          <X size={16} color={p.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Segmented control — role tab pills. */
export function Segmented({
  options,
  selectedId,
  onSelect,
  style,
}: {
  options: { id: string; label: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  return (
    <View
      style={[
        {
          flexDirection: "row",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.rule,
          backgroundColor: p.surface,
        },
        style,
      ]}
    >
      {options.map((o, i) => {
        const active = o.id === selectedId;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(o.id)}
            style={{
              flex: 1,
              minHeight: touchFloor,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: active ? p.primary : "transparent",
              borderStartWidth: i > 0 ? StyleSheet.hairlineWidth : 0,
              borderStartColor: p.border,
              paddingHorizontal: sp[8],
            }}
          >
            <T variant="sm" weight="bold" style={{ color: active ? p.primaryFg : p.textSecondary }} numberOfLines={1}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}
