import { type ReactNode } from "react";
import { Text, type StyleProp, type TextProps, type TextStyle } from "react-native";
import { usePalette, useStatusTones } from "@/design/theme";
import { fonts } from "@/design/fonts";
import { type } from "@/design/tokens";

export type TextVariant =
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "bodyLg"
  | "body"
  | "sm"
  | "xs"
  | "mono"
  | "monoSm";

export type TextColorRole =
  | "text"
  | "secondary"
  | "muted"
  | "faint"
  | "accentInk"
  | "accent"
  | "onPrimary"
  | "onAccent"
  | "gold"
  | "danger"
  | "inherit";

const sizes: Record<TextVariant, TextStyle> = {
  display: { fontSize: type.display, lineHeight: 46 },
  h1: { fontSize: type.h1, lineHeight: 40 },
  h2: { fontSize: type.h2, lineHeight: 32 },
  h3: { fontSize: type.h3, lineHeight: 28 },
  h4: { fontSize: type.h4, lineHeight: 24 },
  bodyLg: { fontSize: type.bodyLg, lineHeight: 24 },
  body: { fontSize: type.body, lineHeight: 20 },
  sm: { fontSize: type.sm, lineHeight: 18 },
  xs: { fontSize: type.xs, lineHeight: 16 },
  mono: { fontFamily: fonts.mono, fontSize: type.body, lineHeight: 20 },
  monoSm: { fontFamily: fonts.mono, fontSize: type.xs, lineHeight: 16 },
};

export interface TProps extends TextProps {
  variant?: TextVariant;
  color?: TextColorRole;
  weight?: "regular" | "medium" | "semibold" | "bold";
  align?: "auto" | "left" | "right" | "center";
  children?: ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

export function T({ variant = "body", color = "text", weight, align, style, ...rest }: TProps) {
  const p = usePalette();
  const tones = useStatusTones();
  const colorValue =
    color === "inherit"
      ? undefined
      : {
          text: p.text,
          secondary: p.textSecondary,
          muted: p.textMuted,
          faint: p.textFaint,
          accentInk: p.accentInk,
          accent: p.accent,
          onPrimary: p.primaryFg,
          onAccent: p.accentFg,
          gold: p.goldInk,
          danger: tones.rose.deep,
        }[color];
  const weightFamily =
    variant === "mono" || variant === "monoSm"
      ? weight === "medium"
        ? fonts.monoMedium
        : fonts.mono
      : weight === "bold"
        ? fonts.bodyBold
        : weight === "semibold"
          ? fonts.bodySemiBold
          : weight === "medium"
            ? fonts.bodyMedium
            : variant === "display"
              ? fonts.display
              : undefined;
  const variantStyle = sizes[variant];
  const family: TextStyle = weightFamily
    ? { fontFamily: weightFamily }
    : variant === "display"
      ? { fontFamily: fonts.display }
      : {};
  return (
    <Text
      {...rest}
      style={[
        variantStyle,
        family,
        colorValue ? { color: colorValue } : undefined,
        align ? { textAlign: align } : undefined,
        style,
      ]}
    />
  );
}

/** Mono drafting label — [01] index style, Latin, LTR. */
export function MonoLabel({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const p = usePalette();
  return (
    <Text style={[sizes.monoSm, { fontFamily: fonts.mono, color: p.textFaint, textAlign: "left" }, style]}>
      {children}
    </Text>
  );
}
