import { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "./text";

/**
 * Minimal markdown block renderer for training lesson content
 * (contentMarkdown from the backend). Supports: # headings, paragraphs,
 * - lists, 1. lists, `code`, **bold**, and line breaks. Deliberately small —
 * the training authoring format stays simple; complex HTML is out of scope.
 */

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push(
        <T key={`${keyPrefix}-b${i}`} variant="body" weight="bold">
          {token.slice(2, -2)}
        </T>,
      );
    } else {
      parts.push(
        <T key={`${keyPrefix}-c${i}`} variant="mono" color="accentInk">
          {token.slice(1, -1)}
        </T>,
      );
    }
    last = m.index + token.length;
    i++;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function Markdown({ source }: { source: string }) {
  const p = usePalette();
  const lines = (source ?? "").split("\n");
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let ordered = false;

  const flushList = (key: string) => {
    if (list.length === 0) return;
    blocks.push(
      <View key={key} style={{ gap: 6, paddingStart: sp[8], borderStartWidth: 2, borderStartColor: p.rule, marginBottom: sp[8] }}>
        {list.map((item, idx) => (
          <View key={idx} style={{ flexDirection: "row", gap: sp[8] }}>
            <T variant="body" color="accentInk">
              {ordered ? `${idx + 1}.` : "—"}
            </T>
            <View style={{ flex: 1 }}>
              <T variant="body" color="secondary">
                {renderInline(item, `${key}-${idx}`)}
              </T>
            </View>
          </View>
        ))}
      </View>,
    );
    list = [];
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (/^#{1,3}\s/.test(line)) {
      flushList(`l${i}`);
      const level = (line.match(/^#+/) ?? ["#"])[0].length;
      const text = line.replace(/^#+\s*/, "");
      blocks.push(
        <T key={`h${i}`} variant={level === 1 ? "h4" : "body"} weight="bold" style={{ marginTop: i === 0 ? 0 : sp[8], marginBottom: sp[4] }}>
          {text}
        </T>,
      );
    } else if (/^[-*]\s+/.test(line)) {
      if (ordered) flushList(`l${i}`);
      ordered = false;
      list.push(line.replace(/^[-*]\s+/, ""));
    } else if (/^\d+\.\s+/.test(line)) {
      if (!ordered) flushList(`l${i}`);
      ordered = true;
      list.push(line.replace(/^\d+\.\s+/, ""));
    } else if (line.trim() === "") {
      flushList(`l${i}`);
    } else {
      flushList(`l${i}`);
      blocks.push(
        <View key={`p${i}`} style={{ marginBottom: sp[8] }}>
          <T variant="body" color="secondary" style={{ lineHeight: 22 }}>
            {renderInline(line, `p${i}`)}
          </T>
        </View>,
      );
    }
  });
  flushList("l-final");
  return <View>{blocks}</View>;
}
