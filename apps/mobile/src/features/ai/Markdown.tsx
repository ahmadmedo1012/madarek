/**
 * features/ai/Markdown — assistant-flavoured markdown (R334 3-f).
 *
 * Prose is delegated to the shared `@/components/ui/markdown` renderer
 * (already RTL-safe: logical `paddingStart`/`borderStartWidth` seats) —
 * this wrapper adds what a chat reply needs and the shared one
 * deliberately lacks: fenced ``` code blocks rendered as LTR islands
 * (code is always Latin-direction; `writingDirection: "ltr"` pins iOS,
 * `direction` is derived from layout on Android), a hairline sunken
 * frame, and a per-block copy affordance. An unterminated fence during
 * streaming renders the accumulated lines as a live block — the caret
 * component rides beside it.
 */

import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Copy from "lucide-react-native/icons/copy";
import { useSemanticTheme } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T, MonoLabel } from "@/components/ui/text";
import { Markdown } from "@/components/ui/markdown";
import { copyTextWithToast } from "./clipboard";

/** One parsed segment: prose, or a fenced code block. */
type Segment = { kind: "prose"; text: string } | { kind: "code"; text: string; lang?: string };

/** Leading/trailing blank lines carry no markdown meaning — strip them. */
function proseText(lines: string[]): string {
  while (lines.length > 0 && lines[0].trim() === "") lines.shift();
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  return lines.join("\n");
}

/** Split on ``` fences; an unterminated fence stays open (streaming-safe). */
export function splitCodeFences(source: string): Segment[] {
  const segments: Segment[] = [];
  const lines = (source ?? "").split("\n");
  let prose: string[] = [];
  let code: string[] | null = null;
  let lang: string | undefined;
  const flushProse = () => {
    const text = proseText(prose);
    if (text.length > 0) segments.push({ kind: "prose", text });
    prose = [];
  };
  for (const line of lines) {
    if (code === null && line.trimStart().startsWith("```")) {
      const fence = line.trim().slice(3).trim();
      if (fence) lang = fence;
      flushProse();
      code = [];
      continue;
    }
    if (code !== null && line.trimEnd().endsWith("```") && !line.trimStart().startsWith("```")) {
      // closing fence on a line with content before it — rare; treat the
      // whole line as code and close (matches how students paste fences).
      code.push(line.trimEnd().slice(0, -3));
      segments.push({ kind: "code", text: code.join("\n"), lang });
      code = null;
      lang = undefined;
      continue;
    }
    if (code !== null && line.trim() === "```") {
      segments.push({ kind: "code", text: code.join("\n"), lang });
      code = null;
      lang = undefined;
      continue;
    }
    if (code !== null) code.push(line);
    else prose.push(line);
  }
  if (code !== null) {
    // still open — the reply is streaming (or the model forgot the fence):
    // render the accumulated code honestly, no closing decoration.
    segments.push({ kind: "code", text: code.join("\n"), lang });
  } else {
    flushProse();
  }
  return segments;
}

function CodeBlock({ text, lang }: { text: string; lang?: string }) {
  const { colors, hairlines } = useSemanticTheme();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    copyTextWithToast(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <View
      style={[
        {
          backgroundColor: colors.sunken,
          borderRadius: 8,
          padding: sp[12],
          gap: sp[8],
          marginVertical: sp[4],
        },
        hairlines.border,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
        <View style={{ flex: 1 }}>
          {lang ? <MonoLabel>{lang}</MonoLabel> : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copied ? "تم النسخ" : "نسخ الكود"}
          onPress={copy}
          hitSlop={6}
          style={{ minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" }}
        >
          <Copy size={14} color={copied ? colors.accent : colors.textSecondary} />
        </Pressable>
      </View>
      {/* Code is an LTR island inside RTL prose — never mirrored. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <T
          variant="mono"
          style={{ textAlign: "left", writingDirection: "ltr" }}
        >
          {text || " "}
        </T>
      </ScrollView>
    </View>
  );
}

export function AssistantMarkdown({
  source,
  onCitationPress,
  citations,
}: {
  source: string;
  /** Rendered citation chips under the reply (the done frame's list). */
  citations?: { label: string; openable: boolean; url?: string | null }[];
  onCitationPress?: (url: string) => void;
}) {
  const { colors, hairlines } = useSemanticTheme();
  const segments = splitCodeFences(source);
  const blocks: ReactNode[] = [];
  segments.forEach((seg, i) => {
    if (seg.kind === "code") {
      blocks.push(<CodeBlock key={`code-${i}`} text={seg.text} lang={seg.lang} />);
    } else if (seg.text.trim().length > 0) {
      blocks.push(<Markdown key={`prose-${i}`} source={seg.text} />);
    }
  });
  return (
    <View style={{ gap: sp[8] }}>
      {blocks}
      {citations && citations.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp[6], paddingTop: sp[4] }}>
          {citations.map((c, i) =>
            c.openable && c.url ? (
              <Pressable
                key={`${c.label}-${i}`}
                accessibilityRole="link"
                accessibilityLabel={`مصدر: ${c.label}`}
                onPress={() => onCitationPress?.(c.url as string)}
                style={[
                  {
                    backgroundColor: colors.sunken,
                    borderRadius: 999,
                    paddingVertical: sp[6],
                    paddingHorizontal: sp[12],
                  },
                  hairlines.border,
                ]}
              >
                <T variant="xs" color="accentInk">
                  {c.label}
                </T>
              </Pressable>
            ) : (
              <View
                key={`${c.label}-${i}`}
                style={[
                  {
                    backgroundColor: colors.sunken,
                    borderRadius: 999,
                    paddingVertical: sp[6],
                    paddingHorizontal: sp[12],
                  },
                  hairlines.border,
                ]}
              >
                <T variant="xs" color="secondary">
                  {c.label}
                </T>
              </View>
            ),
          )}
        </View>
      ) : null}
    </View>
  );
}
