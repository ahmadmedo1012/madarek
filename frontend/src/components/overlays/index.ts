/**
 * Overlay primitives — populated per
 * specs/012-design-graphics-uplift/contracts/elevation-language.md.
 *
 * PLATFORM INVENTORY (audit 11-e P2-1, wave 12-14 decision — KEEP):
 * Sheet, Popover, Lightbox, CommandPalette and the controlled <Toast />
 * currently have no in-app consumers (rg-verified; only their unit
 * tests). They are NOT dead code: they are the elevation language's
 * contract-pinned API surface — every primitive is covered by a
 * contract suite (tests/unit/*), and consuming them is the documented
 * way to add a new overlay surface (CommandPalette is the designated
 * future home of global search, Popover of anchored non-menu panels).
 * Do not delete or stub them.
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
