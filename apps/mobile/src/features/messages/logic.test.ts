/**
 * logic.test.ts — pins the DM conversation model: correspondent grouping
 * (both directions), unread counting (only inbound), newest-first preview,
 * thread ordering, and the attachment-URL gate. Pure module → no React.
 */
import type { Message } from "@/api/types";
import { collectConversations, imageUrlsInBody, threadMessages } from "./logic";

const ME = "u-me";
const OTHER = "u-other";
const THIRD = "u-third";

function m(
  id: string,
  from: string,
  to: string,
  createdAt: string,
  extra: Partial<Message> = {},
): Message {
  return {
    id,
    fromUserId: from,
    toUserId: to,
    body: `نص ${id}`,
    createdAt,
    ...extra,
  };
}

function user(id: string, first: string, last: string) {
  return { id, firstName: first, lastName: last };
}

describe("collectConversations", () => {
  const rows: Message[] = [
    m("a1", ME, OTHER, "2026-01-15T10:00:00Z", { toUser: user(OTHER, "آية", "العلي") }),
    m("a2", OTHER, ME, "2026-01-15T11:00:00Z", {
      fromUser: user(OTHER, "آية", "العلي"),
      readAt: null,
    }),
    m("a3", OTHER, ME, "2026-01-15T09:00:00Z", {
      fromUser: user(OTHER, "آية", "العلي"),
      readAt: null,
    }),
    m("b1", THIRD, ME, "2026-01-14T18:00:00Z", {
      fromUser: user(THIRD, "سيف", "القاسم"),
      readAt: "2026-01-14T19:00:00Z",
    }),
    m("a4", ME, OTHER, "2026-01-14T08:00:00Z", { toUser: user(OTHER, "آية", "العلي") }),
  ];

  test("one conversation per correspondent, ordered by newest message", () => {
    const convos = collectConversations(rows, ME);
    expect(convos.map((c) => c.id)).toEqual([OTHER, THIRD]);
    expect(convos[0]?.last.id).toBe("a2"); // 11:00 beats 10:00
  });

  test("unread counts only inbound unread messages", () => {
    const convos = collectConversations(rows, ME);
    expect(convos[0]?.unread).toBe(2); // a2 + a3 (a1/a4 are mine)
    expect(convos[1]?.unread).toBe(0); // b1 was read
  });

  test("correspondent identity: name, initials, avatar color", () => {
    const convos = collectConversations(rows, ME);
    expect(convos[0]?.name).toBe("آية العلي");
    expect(convos[0]?.avatarInitials).toBe("آا"); // آ of آية + ا of العلي
  });

  test("my own messages never open a conversation with myself", () => {
    const solo = collectConversations([m("x", ME, OTHER, "2026-01-15T10:00:00Z")], ME);
    expect(solo).toHaveLength(1);
    expect(solo[0]?.id).toBe(OTHER);
    // If my message is the newest, the preview still knows it's mine.
    expect(solo[0]?.last.fromUserId).toBe(ME);
  });

  test("missing user payload falls back to «مستخدم» with no initials", () => {
    const anon = collectConversations([m("y", OTHER, ME, "2026-01-15T10:00:00Z")], ME);
    expect(anon[0]?.name).toBe("مستخدم");
    expect(anon[0]?.avatarInitials).toBeNull();
  });

  test("wire order never matters (defensive newest-first sort)", () => {
    expect(
      collectConversations(rows, ME).map((c) => c.last.id),
    ).toEqual(
      collectConversations([...rows].reverse(), ME).map((c) => c.last.id),
    );
  });
});

describe("threadMessages", () => {
  const rows: Message[] = [
    m("t3", ME, OTHER, "2026-01-15T11:00:00Z"),
    m("t1", OTHER, ME, "2026-01-15T09:00:00Z"),
    m("t2", ME, OTHER, "2026-01-15T10:00:00Z"),
    m("z9", ME, THIRD, "2026-01-15T12:00:00Z"), // different correspondent
  ];

  test("oldest-first thread with only that correspondent's messages", () => {
    expect(threadMessages(rows, OTHER).map((x) => x.id)).toEqual(["t1", "t2", "t3"]);
  });

  test("empty thread when nothing matches", () => {
    expect(threadMessages([], OTHER)).toEqual([]);
    expect(threadMessages(rows, "u-nobody")).toEqual([]);
  });
});

describe("imageUrlsInBody", () => {
  test("image-extension http(s) URLs pass, with and without query strings", () => {
    expect(imageUrlsInBody("انظر https://cdn.madarek.io/a.png من فضلك")).toEqual([
      "https://cdn.madarek.io/a.png",
    ]);
    expect(imageUrlsInBody("https://x.io/p.jpg?w=200")).toEqual(["https://x.io/p.jpg?w=200"]);
  });

  test("non-image URLs, duplicates and bare paths are ignored", () => {
    expect(
      imageUrlsInBody("رابط https://x.io/doc.pdf و https://x.io/a.png و https://x.io/a.png مكرر"),
    ).toEqual(["https://x.io/a.png"]);
    expect(imageUrlsInBody("نص بلا روابط /files/papers/x.png نسبي")).toEqual([]);
    expect(imageUrlsInBody("")).toEqual([]);
  });
});
