import { useState, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
  type TextInputProps,
} from "react-native";
import { ChevronDown, Eye, EyeOff, Search, X } from "lucide-react-native";
import { usePalette } from "@/design/theme";
import { sp, touchFloor } from "@/design/tokens";
import { T } from "./text";
import { OptionSheet } from "./surfaces";

/**
 * Form fields — hairline inputs on paper, 44px floors, Arabic labels,
 * inline error association (accessibilityLabel / error text paired).
 */
export interface FieldProps extends TextInputProps {
  label: string;
  error?: string | null;
  hint?: string | null;
  required?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Field({ label, error, hint, required, containerStyle, ...input }: FieldProps) {
  const p = usePalette();
  return (
    <View style={[{ gap: sp[6] }, containerStyle]}>
      <T variant="sm" weight="medium" color={error ? "danger" : "secondary"}>
        {label}
        {required ? " *" : ""}
      </T>
      <TextInput
        placeholderTextColor={p.textFaint}
        accessibilityLabel={label}
        {...input}
        style={[
          {
            backgroundColor: p.surface,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: error ? "#C72E00" : p.rule,
            paddingHorizontal: sp[12],
            minHeight: 48,
            color: p.text,
            fontSize: 15,
            textAlign: "right",
          },
          input.style as StyleProp<TextStyle>,
        ]}
      />
      {error ? (
        <T variant="sm" color="danger">
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

export function SecretField({ label, error, hint, ...input }: FieldProps) {
  const [show, setShow] = useState(false);
  const p = usePalette();
  return (
    <View style={{ position: "relative" }}>
      <Field
        label={label}
        error={error}
        hint={hint}
        secureTextEntry={!show}
        autoCorrect={false}
        textContentType="password"
        {...input}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
        onPress={() => setShow((v) => !v)}
        style={{ position: "absolute", left: 0, bottom: error || hint ? 26 : 4, width: touchFloor, height: 48, alignItems: "center", justifyContent: "center" }}
      >
        {show ? <EyeOff size={20} color={p.textMuted} /> : <Eye size={20} color={p.textMuted} />}
      </Pressable>
    </View>
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
          borderColor: error ? "#C72E00" : p.rule,
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
              minHeight: 44,
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
