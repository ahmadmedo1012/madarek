# PDF.js Viewer - Structure Documentation

> **Source**: `viewer.html` from Mozilla PDF.js  
> **License**: Apache License 2.0  
> **File Size**: ~44,723 characters | 637 lines

---

## Table of Contents

1. [Overview](#overview)
2. [File Structure](#file-structure)
3. [Head Section](#head-section)
4. [Main Layout](#main-layout)
5. [Sidebar Container](#sidebar-container)
6. [Main Container](#main-container)
7. [Toolbar](#toolbar)
8. [Dialogs](#dialogs)
9. [Editor Undo Bar](#editor-undo-bar)
10. [Print Container](#print-container)
11. [Key IDs Reference](#key-ids-reference)
12. [Localization Keys](#localization-keys)

---

## Overview

This is the **PDF.js Viewer** HTML template — a full-featured PDF rendering interface built by Mozilla. It provides a complete UI for viewing, navigating, searching, annotating, and printing PDF documents directly in the browser.

### Core Features
- 📄 PDF rendering with zoom & navigation
- 🔍 Text search with advanced options
- 📝 Annotation tools (Highlight, Free Text, Draw, Stamp)
- 🖨️ Print & download support
- ♿ Accessibility features (alt text, screen reader support)
- 🎨 Multiple scroll modes & spread layouts
- 📑 Document outline, thumbnails, attachments, layers

---

## File Structure

```
viewer.html
├── <head>
│   ├── Meta tags & viewport
│   ├── Title: "PDF.js viewer"
│   ├── Localization resource (locale.json)
│   ├── pdf.mjs (PDF.js core module)
│   ├── viewer.css
│   └── viewer.mjs (viewer module)
│
└── <body>
    └── #outerContainer
        ├── #sidebarContainer
        ├── #mainContainer
        ├── #dialogContainer
        └── #editorUndoBar
    └── #printContainer
```

---

## Head Section

```html
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<meta name="google" content="notranslate">
<title>PDF.js viewer</title>
```

### Resources Loaded

| Resource | Type | Purpose |
|----------|------|---------|
| `locale/locale.json` | l10n | Localization strings |
| `../build/pdf.mjs` | module | PDF.js rendering engine |
| `viewer.css` | stylesheet | Viewer styles |
| `viewer.mjs` | module | Viewer application logic |

---

## Main Layout

### `#outerContainer`
The root wrapper containing all visible UI elements.

```
#outerContainer
├── #sidebarContainer      (Left sidebar panel)
├── #mainContainer         (Main viewing area)
├── #dialogContainer       (Modal dialogs)
└── #editorUndoBar         (Undo notification)
```

---

## Sidebar Container

### `#toolbarSidebar`
Horizontal toolbar at the top of the sidebar with view buttons.

#### Sidebar View Buttons (Radio Group)

| Button ID | Label | Description |
|-----------|-------|-------------|
| `viewThumbnail` | Thumbnails | Show page thumbnails |
| `viewOutline` | Document Outline | Show bookmarks/outline (double-click to expand/collapse all) |
| `viewAttachments` | Attachments | Show embedded files |
| `viewLayers` | Layers | Show optional content groups (double-click to reset) |

#### Outline Options
- `currentOutlineItem` — "Find Current Outline Item" (disabled by default)

### `#sidebarContent`
Contains four view panels (only one visible at a time):

| Panel ID | Content |
|----------|---------|
| `thumbnailView` | Page thumbnail grid |
| `outlineView` | Document outline/bookmarks |
| `attachmentsView` | Attached files list |
| `layersView` | Layer visibility controls |

### `#sidebarResizer`
Draggable divider to resize the sidebar width.

---

## Main Container

### Toolbar (`#toolbarContainer` → `#toolbarViewer`)

#### Left Section (`#toolbarViewerLeft`)

| Element | ID | Purpose |
|---------|-----|---------|
| Sidebar Toggle | `sidebarToggleButton` | Show/hide sidebar |
| Find Button | `viewFindButton` | Open search panel |
| Find Bar | `findbar` | Search interface (door hanger) |
| Previous Page | `previous` | Navigate back |
| Next Page | `next` | Navigate forward |
| Page Number | `pageNumber` | Current page input |
| Total Pages | `numPages` | Display total count |

#### Find Bar (`#findbar`) Details

```
#findbar
├── #findInputContainer
│   ├── #findInput              (Search text field)
│   ├── #findPreviousButton     (Previous match)
│   └── #findNextButton         (Next match)
├── #findbarOptionsOneContainer
│   ├── #findHighlightAll       (Checkbox: Highlight All)
│   └── #findMatchCase          (Checkbox: Match Case)
├── #findbarOptionsTwoContainer
│   ├── #findMatchDiacritics    (Checkbox: Match Diacritics)
│   └── #findEntireWord         (Checkbox: Whole Words)
└── #findbarMessageContainer
    ├── #findResultsCount       (Match count display)
    └── #findMsg                (Status messages)
```

#### Middle Section (`#toolbarViewerMiddle`)

| Element | ID | Purpose |
|---------|-----|---------|
| Zoom Out | `zoomOutButton` | Decrease zoom |
| Zoom In | `zoomInButton` | Increase zoom |
| Zoom Select | `scaleSelect` | Zoom level dropdown |

**Zoom Options:**

| Value | Label |
|-------|-------|
| `auto` | Automatic Zoom |
| `page-actual` | Actual Size |
| `page-fit` | Page Fit |
| `page-width` | Page Width |
| `custom` | Custom % (dynamic) |
| `0.5` | 50% |
| `0.75` | 75% |
| `1` | 100% |
| `1.25` | 125% |
| `1.5` | 150% |
| `2` | 200% |
| `3` | 300% |
| `4` | 400% |

#### Right Section (`#toolbarViewerRight`)

##### Editor Mode Buttons (Radio Group)

| Button ID | Title | Params Toolbar | Controls |
|-----------|-------|----------------|----------|
| `editorHighlightButton` | Highlight | `editorHighlightParamsToolbar` | Color picker, thickness slider, visibility toggle |
| `editorFreeTextButton` | Text | `editorFreeTextParamsToolbar` | Color picker, font size slider |
| `editorInkButton` | Draw | `editorInkParamsToolbar` | Color, thickness, opacity sliders |
| `editorStampButton` | Add or edit images | `editorStampParamsToolbar` | Add image button |

##### Action Buttons

| Button ID | Title | Notes |
|-----------|-------|-------|
| `printButton` | Print | Hidden on medium view |
| `downloadButton` | Save | Hidden on medium view |

##### Secondary Toolbar (`#secondaryToolbar`)

Toggle button: `secondaryToolbarToggleButton` ("Tools")

**Menu Items:**

| Button ID | Label | Action |
|-----------|-------|--------|
| `secondaryOpenFile` | Open | Open local PDF file |
| `secondaryPrint` | Print | Print document |
| `secondaryDownload` | Save | Download PDF |
| `presentationMode` | Presentation Mode | Full-screen presentation |
| `viewBookmark` | Current Page | Link to current page |
| `firstPage` | Go to First Page | Jump to page 1 |
| `lastPage` | Go to Last Page | Jump to last page |
| `pageRotateCw` | Rotate Clockwise | +90° rotation |
| `pageRotateCcw` | Rotate Counterclockwise | -90° rotation |

**Cursor Tools (Radio Group):**
- `cursorSelectTool` — Text Selection Tool (default)
- `cursorHandTool` — Hand Tool (pan)

**Scroll Modes (Radio Group):**
- `scrollPage` — Page Scrolling
- `scrollVertical` — Vertical Scrolling (default)
- `scrollHorizontal` — Horizontal Scrolling
- `scrollWrapped` — Wrapped Scrolling

**Spread Modes (Radio Group):**
- `spreadNone` — No Spreads (default)
- `spreadOdd` — Odd Spreads
- `spreadEven` — Even Spreads

**Other:**
- `imageAltTextSettings` — Image alt text settings (hidden by default)
- `documentProperties` — Document Properties dialog trigger

### Loading Bar (`#loadingBar`)
Progress indicator with animated glimmer effect.

### Viewer Area (`#viewerContainer`)
```
#viewerContainer
└── #viewer (class="pdfViewer")
    → PDF pages are rendered here dynamically
```

---

## Dialogs

All dialogs are contained within `#dialogContainer`.

### 1. Password Dialog (`#passwordDialog`)
Prompts user to enter password for encrypted PDFs.

```
passwordDialog
├── #passwordText    (Label: "Enter the password...")
├── #password        (Password input field)
└── Button Row
    ├── #passwordCancel
    └── #passwordSubmit
```

### 2. Document Properties Dialog (`#documentPropertiesDialog`)
Displays PDF metadata and technical details.

**Fields Displayed:**

| Label ID | Field ID | Description |
|----------|----------|-------------|
| `fileNameLabel` | `fileNameField` | File name |
| `fileSizeLabel` | `fileSizeField` | File size |
| `titleLabel` | `titleField` | Document title |
| `authorLabel` | `authorField` | Author |
| `subjectLabel` | `subjectField` | Subject |
| `keywordsLabel` | `keywordsField` | Keywords |
| `creationDateLabel` | `creationDateField` | Creation date |
| `modificationDateLabel` | `modificationDateField` | Modification date |
| `creatorLabel` | `creatorField` | Creator software |
| `producerLabel` | `producerField` | PDF producer |
| `versionLabel` | `versionField` | PDF version |
| `pageCountLabel` | `pageCountField` | Number of pages |
| `pageSizeLabel` | `pageSizeField` | Page dimensions |
| `linearizedLabel` | `linearizedField` | Fast Web View status |

**Actions:**
- `documentPropertiesClose` — Close button

### 3. Alt Text Dialog (`#altTextDialog`)
For adding alternative text to images.

```
altTextDialog
├── #overallDescription
│   ├── #dialogLabel        ("Choose an option")
│   └── #dialogDescription  (Explanation of alt text)
├── #addDescription
│   ├── #descriptionButton  (Radio: "Add a description")
│   ├── #descriptionAreaLabel (Instructions)
│   └── #descriptionTextarea (Text input area)
├── #markAsDecorative
│   ├── #decorativeButton   (Radio: "Mark as decorative")
│   └── #decorativeLabel    (Explanation)
└── #buttons
    ├── #altTextCancel
    └── #altTextSave
```

### 4. New Alt Text Dialog (`#newAltTextDialog`)
Enhanced alt text editor with AI auto-generation.

```
newAltTextDialog
├── #newAltTextContainer
│   ├── #newAltTextTitle      ("Edit alt text")
│   └── #mainContent
│       ├── #descriptionAndSettings
│       │   ├── #newAltTextDescriptionContainer
│       │   │   ├── .altTextSpinner        (Loading indicator)
│       │   │   └── #newAltTextDescriptionTextarea
│       │   ├── #newAltTextDescription     (Help text)
│       │   ├── #newAltTextDisclaimer      (AI disclaimer + Learn More link)
│       │   ├── #newAltTextCreateAutomatically (Toggle)
│       │   └── #newAltTextDownloadModel   (Download progress, hidden)
│       └── #newAltTextImagePreview      (Image preview)
├── #newAltTextError          (Error message bar, hidden)
└── #newAltTextButtons
    ├── #newAltTextCancel     (hidden)
    ├── #newAltTextNotNow
    └── #newAltTextSave
```

### 5. Alt Text Settings Dialog (`#altTextSettingsDialog`)
Configuration for automatic alt text generation.

```
altTextSettingsDialog
├── #altTextSettingsContainer
│   ├── #altTextSettingsTitle   ("Image alt text settings")
│   ├── #automaticAltText
│   │   ├── #createModelSetting
│   │   │   ├── #createModelButton    (Toggle: auto-create)
│   │   │   └── #createModelDescription
│   │   └── #aiModelSettings
│   │       ├── Model info (180MB)
│   │       ├── #aiModelDescription
│   │       ├── #deleteModelButton
│   │       └── #downloadModelButton
│   ├── .dialogSeparator
│   └── #altTextEditor
│       ├── #showAltTextEditor
│       │   ├── #showAltTextDialogButton (Toggle)
│       │   └── #showAltTextDialogDescription
│       └── #buttons
│           └── #altTextSettingsCloseButton
```

### 6. Print Service Dialog (`#printServiceDialog`)
Shows print preparation progress.

```
printServiceDialog
├── Progress message ("Preparing document for printing…")
├── <progress> bar (0-100)
├── #print-progress-percent (Percentage text)
└── #printCancel — Cancel button
```

---

## Editor Undo Bar

### `#editorUndoBar`
Notification bar for editor actions with undo capability.

```
#editorUndoBar
├── #editorUndoBarMessage    (Status description)
├── #editorUndoBarUndoButton  (Undo action)
└── #editorUndoBarCloseButton (Dismiss)
```

---

## Print Container

### `#printContainer`
Hidden container used for print layout rendering.

---

## Key IDs Reference

### Top-Level Containers

| ID | Description |
|----|-------------|
| `outerContainer` | Root wrapper |
| `sidebarContainer` | Left sidebar |
| `mainContainer` | Main viewing area |
| `dialogContainer` | All modal dialogs |
| `editorUndoBar` | Undo notification |
| `printContainer` | Print rendering area |
| `viewerContainer` | Scrollable viewer |
| `viewer` | PDF page container |

### Toolbar Elements

| ID | Type | Purpose |
|----|------|---------|
| `toolbarContainer` | div | Toolbar wrapper |
| `toolbarViewer` | div | Main toolbar |
| `toolbarViewerLeft` | div | Left section |
| `toolbarViewerMiddle` | div | Middle section |
| `toolbarViewerRight` | div | Right section |
| `toolbarSidebar` | div | Sidebar toolbar |
| `loadingBar` | div | Progress indicator |

### Navigation Controls

| ID | Element | Action |
|----|---------|--------|
| `previous` | button | Previous page |
| `next` | button | Next page |
| `pageNumber` | input | Page number entry |
| `numPages` | span | Total pages display |
| `firstPage` | button | Go to first page |
| `lastPage` | button | Go to last page |

### Zoom Controls

| ID | Element | Action |
|----|---------|--------|
| `zoomOutButton` | button | Zoom out |
| `zoomInButton` | button | Zoom in |
| `scaleSelect` | select | Zoom level dropdown |

### Search Elements

| ID | Element | Purpose |
|----|---------|---------|
| `viewFindButton` | button | Toggle find bar |
| `findbar` | div | Search panel |
| `findInput` | input | Search text |
| `findPreviousButton` | button | Previous match |
| `findNextButton` | button | Next match |
| `findHighlightAll` | checkbox | Highlight all |
| `findMatchCase` | checkbox | Case sensitive |
| `findMatchDiacritics` | checkbox | Match diacritics |
| `findEntireWord` | checkbox | Whole words only |
| `findResultsCount` | span | Match count |
| `findMsg` | span | Status message |

### Editor Tools

| ID | Element | Tool |
|----|---------|------|
| `editorHighlightButton` | button | Highlight |
| `editorFreeTextButton` | button | Free text |
| `editorInkButton` | button | Ink/Draw |
| `editorStampButton` | button | Stamp/Image |
| `editorHighlightParamsToolbar` | div | Highlight settings |
| `editorFreeTextParamsToolbar` | div | Text settings |
| `editorInkParamsToolbar` | div | Ink settings |
| `editorStampParamsToolbar` | div | Stamp settings |

### Dialogs

| ID | Type | Purpose |
|----|------|---------|
| `passwordDialog` | dialog | Password entry |
| `documentPropertiesDialog` | dialog | PDF metadata |
| `altTextDialog` | dialog | Simple alt text |
| `newAltTextDialog` | dialog | AI alt text editor |
| `altTextSettingsDialog` | dialog | Alt text settings |
| `printServiceDialog` | dialog | Print progress |

---

## Localization Keys

The viewer uses `data-l10n-id` attributes for internationalization. Key patterns:

### Prefix Categories

| Prefix | Category | Count |
|--------|----------|-------|
| `pdfjs-thumbs-*` | Thumbnails | 2 |
| `pdfjs-document-outline-*` | Outline | 2 |
| `pdfjs-attachments-*` | Attachments | 2 |
| `pdfjs-layers-*` | Layers | 2 |
| `pdfjs-toggle-sidebar-*` | Sidebar | 2 |
| `pdfjs-findbar-*` | Find bar | 7 |
| `pdfjs-find-*` | Search options | 6 |
| `pdfjs-previous-*` / `pdfjs-next-*` | Navigation | 2 |
| `pdfjs-page-input` | Page input | 1 |
| `pdfjs-zoom-*` | Zoom controls | 3 |
| `pdfjs-page-scale-*` | Scale options | 9 |
| `pdfjs-editor-*` | Editor tools | ~40 |
| `pdfjs-print-*` | Print | 4 |
| `pdfjs-save-*` | Save/Download | 2 |
| `pdfjs-tools-*` | Tools menu | 2 |
| `pdfjs-open-file-*` | Open file | 2 |
| `pdfjs-presentation-mode-*` | Presentation | 2 |
| `pdfjs-bookmark-*` | Bookmark | 2 |
| `pdfjs-first-page-*` / `pdfjs-last-page-*` | Page jump | 4 |
| `pdfjs-page-rotate-*` | Rotation | 4 |
| `pdfjs-cursor-*` | Cursor tools | 4 |
| `pdfjs-scroll-*` | Scroll modes | 8 |
| `pdfjs-spread-*` | Spread modes | 6 |
| `pdfjs-image-alt-text-*` | Alt text | 4 |
| `pdfjs-document-properties-*` | Properties | 20 |
| `pdfjs-password-*` | Password | 3 |
| `pdfjs-editor-alt-text-*` | Alt text editor | ~20 |
| `pdfjs-editor-new-alt-text-*` | New alt text | ~15 |
| `pdfjs-editor-undo-bar-*` | Undo bar | 4 |

---

## Accessibility Features

- `role="radiogroup"` for mutually exclusive options
- `aria-checked` for radio button states
- `aria-expanded` for toggle panels
- `aria-controls` linking controls to content
- `aria-labelledby` / `aria-describedby` for context
- `aria-live="polite"` for dynamic updates
- `tabindex="0"` for keyboard navigation
- `title` attributes for tooltips
- Alt text support for images

---

## CSS Classes

### Layout
- `toolbarHorizontalGroup` — Horizontal flex layout
- `hidden` — Display none
- `hiddenSmallView` / `hiddenMediumView` — Responsive hiding
- `toggled` — Active/selected state

### Components
- `toolbarButton` — Standard button style
- `toolbarButtonWithContainer` — Button with dropdown
- `toolbarField` — Input fields
- `toolbarLabel` — Text labels
- `dropdownToolbarButton` — Select dropdown style
- `doorHanger` / `doorHangerRight` — Floating panels
- `menu` / `menuContainer` — Dropdown menus
- `dialog` — Modal dialog style
- `messageBar` — Notification bar

---

## Notes

- The file is designed to work with `viewer.mjs` which attaches event listeners and manages state.
- All interactive elements have unique IDs for JavaScript selection.
- The `data-l10n-id` system allows full localization without modifying HTML.
- Editor buttons are `disabled="disabled"` by default until PDF.js initializes.
- The `mozdisallowselectionprint` attribute prevents text selection during printing.
- Dialogs use the native HTML `<dialog>` element.
- The AI alt text feature requires downloading a 180MB model that runs locally.

---

*Generated from PDF.js viewer.html analysis*
