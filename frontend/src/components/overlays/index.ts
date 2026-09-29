/**
 * Overlay primitives — populated per
 * specs/012-design-graphics-uplift/contracts/elevation-language.md.
 *
 * PLATFORM INVENTORY (refreshed 5-C4 per audit A10 P3-8 — the pre-5-B
 * wave list had gone stale):
 *   - Sheet → LibraryPage's ≤640px filter tray (since 23-a; 5-C4 moved
 *     it to the bottom presentation with header/body/footer slots).
 *   - CommandPalette → AppShell (⌘K / Ctrl+K, since 21-a).
 *   - ToastStack → the app-wide surface mounted at the App root; the
 *     controlled single <Toast /> itself stays unit-test-only.
 *   - Popover, Lightbox → still zero in-app consumers (rg-verified;
 *     only their unit tests keep the contract pinned). NOT dead code:
 *     they are the elevation language's contract-pinned API surface —
 *     Popover is the documented home of anchored non-menu panels,
 *     Lightbox of the first gallery/media consumer (A10 P3-1: extend
 *     it with zoom/prev-next when that consumer arrives). Do not
 *     delete or stub them.
 *
 * Cross-cutting platform behavior (wave 12-14):
 *   - Escape coordination via lib/overlayStack.ts: every interactive
 *     overlay registers while open; only the topmost layer answers
 *     Escape (one press dismisses one layer) and consumes the key.
 *   - Body scroll locking via lib/scrollLock.ts: Modal/Sheet/
 *     CommandPalette/Lightbox hold a ref-counted lock (one body class)
 *     so stacked overlays and shell drawers compose safely.
 *   - Anchored menus/dialogs sync aria-expanded/aria-haspopup onto
 *     their trigger unless the consumer declares them itself.
 */
export { Modal } from './Modal';
export type { ModalProps } from './Modal';

export { Sheet } from './Sheet';
export type { SheetProps, SheetSide } from './Sheet';

export { Toast, ToastStack } from './Toast';
export type { ToastProps, ToastVariant } from './Toast';

export { Popover } from './Popover';
export type { PopoverProps } from './Popover';

export { Dropdown, DropdownItem, DropdownSeparator } from './Dropdown';
export type { DropdownProps, DropdownItemProps } from './Dropdown';

export { Tooltip } from './Tooltip';
export type { TooltipProps } from './Tooltip';

export { Lightbox } from './Lightbox';
export type { LightboxProps } from './Lightbox';

export { CommandPalette } from './CommandPalette';
export type { CommandPaletteProps } from './CommandPalette';

export { NotificationPanel } from './NotificationPanel';
export type { NotificationPanelProps } from './NotificationPanel';
