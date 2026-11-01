# VLM review — the red-team Assessment A (takeover)

> The three dispatched reviewers died mid-run (reports unwritten); their 250+ captures survived. This is the orchestrator's VLM pass over a curated high-signal set, judged against the committed canon. Generated 2026-11-01T00:52:07.448Z.

## guest-landing (light+dark)

**Defects**

*   **[P0 | landing-1440-light.png | Main content area] Massive vertical dead space:** The page body is almost entirely empty (approx. 80% of the viewport height) between the header and the footer, with only a small illustration floating in the top-right. **Fix:** Populate the main container with actual educational content, or drastically reduce the page height to match the sparse content.**
*   **[P1 | landing-1440-dark.png | Footer links area] Low-contrast text:** The secondary link text in the footer (e.g., "عن المدارك", "الشروط والأحكام") is extremely faint against the dark background (#282828), failing accessibility standards. **Fix:** Lighten the footer text color to at least #AAAAAA to ensure readability.**
*   **[P2 | Both images | Header navigation] Inconsistent alignment/spacing:** The nav items ("المكتبة", "المسودات", etc.) appear slightly misaligned or have uneven spacing relative to the search icon on the far right. **Fix:** Apply strict `justify-content: space-between` or fixed padding to the nav list to ensure perfect rhythmic spacing.**
*   **[P3 | landing-1440-light.png | Hero section] Clipped/Misaligned tag labels:** The tags below the hero title (e.g., "[03] محاضرة") feel slightly cramped and the brackets may be rendering inconsistently with the Geist Mono font weight. **Fix:** Ensure `font-feature-settings` for tabular numbers is active and increase letter-spacing slightly.**

**What is WORKING well**
The strict adherence to the "paper & ink" color palette is flawless; the #F6F6EE warmth in light mode and the deep charcoal in dark mode create a sophisticated, distraction-free reading environment that perfectly suits an academic archive.

## guest-auth (light+dark+mobile)

**CONCRETE DEFECTS**

*   **[P1 | auth-1440-light.png, auth-390-light.png] Element: "تسجيل الدخول" (Sign In) button.**
    *   **Defect:** The primary action button is a hollow outline with no background fill or signal color (#FA3600), making it look like a secondary/disabled action and lacking visual hierarchy.
    *   **Fix:** Apply the signal orange #FA3600 as the background fill with white text to establish clear affordance.
*   **[P2 | auth-390-light.png] Element: User list rows (e.g., "طالب", "أستاذ").**
    *   **Defect:** The "تغيير" (Change) buttons are floated to the far right edge while the text content is left-aligned, creating an awkward, disconnected layout and excessive internal row width on mobile.
    *   **Fix:** Stack the "تغيير" button below the email/ID text or align it tightly to the left of the content block for better mobile density.
*   **[P2 | All images] Element: Modal/Panel container ("حسابات تجريبية – بديل التسجيل").**
    *   **Defect:** The container uses a full border instead of the specified hairline seam (#B3B3AF). The border weight looks visually heavy compared to the minimal craft standard.
    *   **Fix:** Reduce border width to 1px (or 0.5px) using color #B3B3AF.
*   **[P3 | All images] Element: Footer links ("سياسة الخصوصية", "شروط الاستخدام").**
    *   **Defect:** The underlines on these links appear to be standard browser defaults (often offset or thick) rather than a refined hairline decoration.
    *   **Fix:** Style underlines with `text-decoration-thickness: 1px` and `text-underline-offset: 4px` using the ink/hairline colors.

**WHAT IS WORKING WELL**

The strict typographic discipline is excellent—Geist Mono is perfectly applied to all codes and numbers (`[01]`, emails, IDs) with correct LTR directionality, and the Arabic UI text maintains strong readability and hierarchy within the monochrome palette.

## guest-info pages (about/contact/help — line-length suspects)

**CONCRETE DEFECTS**

*   **[P1 | about-1440-light.png] Footer Date/Text Alignment:** The footer text ("آخر تحديث: 2026-10-27") and the line above it are center-aligned, while all main content is strictly right-aligned (RTL). This breaks the grid. **Fix:** Right-align the footer content to match the page container.
*   **[P2 | about-1440-light.png] Section 03 Box Content Alignment:** The text inside the "من نحن" box appears slightly indented or centered relative to the box border, unlike Sections 01 and 02 where text is flush with the padding. **Fix:** Ensure consistent `padding` (e.g., 24px) and `text-align: start` for all content boxes.
*   **[P3 | help-1440-light.png] Inline Code/Email Directionality:** The email address `@test.ly` and ID `12345678` are rendered visually LTR within the Arabic sentence flow. While readable, strict RTL canon requires explicit `dir="ltr"` or `<bdi>` tags to prevent punctuation/spacing glitches on varying viewports. **Fix:** Wrap Latin strings in `<span dir="ltr">`.
*   **[P3 | All Images] Section Number Bracket Spacing:** The section numbers (e.g., `[01]`) have a very tight gap between the bracket and the Arabic text (e.g., `[01]البيان`). **Fix:** Add a small margin-left (in RTL context) to the number element for better breathability.

**WHAT IS WORKING WELL**

The design perfectly executes the "paper & ink" aesthetic: the background color (#F6F6EE) is warm and matte, the typography hierarchy is crystal clear, and the use of the single orange signal (#FA3600) for links is restrained and effective.

## guest-legal+404+colleges-mobile

**Review Report**

*   **[P1 | privacy-1440-light.png] Footer Date/Time:** The date `2026-10-27` and the text "آخر تحديث" are rendered in standard Arabic font, violating the canon requirement for **Geist Mono** on numbers/codes. Fix: Apply `font-family: Geist Mono` to the footer timestamp.
*   **[P1 | notfound-1440-light.png] 404 Illustration:** The central graphic (dotted circle/box) uses a **solid black stroke** for the box, which feels heavy compared to the "hairline #B3B3AF seams" rule. Fix: Reduce stroke weight to 1px and use the seam color or ink color with low opacity.
*   **[P2 | colleges-390-light.png] List Item Badges:** The badges showing counts (e.g., "31 كلية", "2 قسم") use a **light beige/grey background fill**, which introduces a new background color not defined in the strict palette (#F6F6EE ground). Fix: Remove background fill; rely on hairline borders or text-only styling.
*   **[P2 | colleges-390-light.png] Search Bar Alignment:** The search icon (magnifying glass) is positioned on the **left** of the input field. In a strictly RTL interface, functional icons usually sit on the right or the text alignment should be strictly RTL. Fix: Move search icon to the right side of the input container.

**What is WORKING well:**
The typographic hierarchy is excellent—bold headers paired with restrained body copy create a very readable, academic "paper" feel, and the orange signal color is used sparingly and effectively for CTAs and indices.

## student dashboard (ink-island suspect — DARK)

**Defects**

*   **[P1 | Both images] Element:** The "01/03" pagination text inside the course card.
    *   **Fix:** Ensure this uses `dir="ltr"` and the Geist Mono font to align with the design canon for numbers/codes; currently, it looks like a standard Arabic proportional font.
*   **[P2 | stu-dashboard-1440-dark.png] Element:** The "01/03" pagination text on the light-colored card.
    *   **Fix:** Increase contrast or darken the ink color (`#282828`); it is currently too faint against the `#F6F6EE` background.
*   **[P1 | Both images] Element:** The "الأحد 25" (Sunday 25) column header in the schedule table.
    *   **Fix:** Apply `dir="ltr"` and Geist Mono to the number "25"; currently, the number is rendered in the standard body font, breaking typographic consistency with other codes (e.g., SE301).
*   **[P3 | Both images] Element:** The progress bar tick marks ("المقرر الأسبوعي").
    *   **Fix:** Verify the visual weight of the hairline ticks against the background; in the dark theme, they are barely visible, potentially failing accessibility standards for UI components.

**What is Working Well**
The strict adherence to the "paper/ink" color palette and the single orange signal (`#FA3600`) creates a highly disciplined, academic atmosphere that feels both modern and timeless.

## student core (courses/ai/results)

**Concrete Defects**

*   **[P1 | stu-results-1440-light.png | Progress Bar & Score Colors]** The progress bar and the "88%" scores use a **green** color (#4CAF50 approx). This violates the canon: there is only **ONE orange signal (#FA3600)**. Green is not a defined brand color. Fix: Replace green with the signal orange #FA3600 or a monochrome shade of ink #282828.
*   **[P1 | stu-ai-1440-light.png | AI Badge Color]** The "AI" badge next to the page title uses a **light beige/tan background**. This deviates from the strict palette (Paper, Ink, Orange). Fix: Use a hairline border (#B3B3AF) with paper background, or a subtle ink tint.
*   **[P2 | stu-courses-1440-light.png | Course Icon Backgrounds]** The course icons (CT301, IS301, etc.) have **pastel colored backgrounds** (mint, yellow, purple, blue, pink). The canon specifies minimal craft and no decorative gradients/colors beyond the signal. Fix: Remove fill colors; use outlined icons on the paper ground.
*   **[P2 | stu-ai-1440-light.png | Percentage Text Color]** The percentages "45%", "40%", "35%" are rendered in **orange/red**. While orange is allowed as *one* signal, using it for standard data values dilutes its meaning for critical actions/errors. Fix: Render data numbers in Ink #282828; reserve Orange for active states/CTAs.
*   **[P2 | All Images | Sidebar Active State]** The active sidebar icon has a **solid black/dark grey background** with an orange accent line. This creates a heavy visual weight ("heavy block") inconsistent with "restrained minimal craft". Fix: Use a hairline indicator or text color change instead of a solid fill block.

**What is Working Well**
The typographic hierarchy and generous whitespace are excellent—the Arabic body text is highly legible against the warm paper ground, and the RTL layout logic (including the correct placement of LTR course codes like `CT301`) is flawlessly executed.

## student profile+library+mobile

### 1. CONCRETE DEFECTS

*   **[P1 | stu-profile-1440-light.png | Profile Avatar (Blue Box)]** The avatar background is a bright, saturated blue (`#4A90E2` approx), violating the "ONE orange signal" and monochrome color canon. **Fix:** Replace blue with a neutral ink/grey tone or the paper ground; use orange only for the single active signal.**
*   **[P2 | stu-profile-1440-light.png | Profile Card Progress Bar]** The progress bar fill is a standard red/orange gradient, not the flat `#FA3600` signal color. **Fix:** Use a solid flat fill of `#FA3600` with no gradient.**
*   **[P1 | stu-library-1440-light.png | Course List Item Thumbnails (Purple/Blue boxes)]** The course thumbnails use decorative purple/blue gradients/illustrations, violating the "no gradients-as-decoration" and restricted palette rules. **Fix:** Replace with a solid light-grey placeholder or a minimal monochrome icon on the paper ground.**
*   **[P2 | stu-library-1440-light.png | "الكل" (All) Tab Indicator]** The active tab underline is a thick red bar that feels heavy compared to the "hairline seams" requirement. **Fix:** Reduce the indicator to a 1-2px hairline in `#FA3600` or `#282828`.**
*   **[P3 | stu-courses-390-light.png | Mobile Course Cards (CT301, IS301, NET301)]** The course code text (e.g., CT301) appears to be using a standard sans-serif font instead of the mandated **Geist Mono** for codes/numbers. **Fix:** Apply `font-family: Geist Mono` to all course codes and numeric values.**
*   **[P2 | All Images | Right Sidebar / Bottom Nav Icons]** Some icons (e.g., the "Library" or "Courses" icons) appear slightly misaligned or inconsistent in stroke weight against the strict "minimal craft" grid. **Fix:** Audit all icon SVGs to ensure uniform 1.5px stroke weight and perfect centering within their hit areas.**

---

### 2. WHAT IS WORKING WELL

The typographic hierarchy is exceptionally clean, the generous whitespace around the "Profile Completion" card creates excellent focus, and the RTL layout logic (text alignment, list ordering) is flawlessly implemented across both desktop and mobile viewports.

## teacher surfaces

*   **[P1] tea-teacher-profile-1440-light.png | Teacher Status Badge (Green Box)**: The "سبي" (Active) status uses a **green** background (`#2ECC71`), which violates the design canon that allows only **ONE orange signal** (#FA3600). *Fix: Replace the green background with the official orange #FA3600 or a neutral ink/grey tone.*
*   **[P1] tea-teacher-profile-1440-light.png | "إشارة مغلقة" Tag**: The tag next to the teacher's name uses a **light red/pink** background. This introduces a second, unapproved signal color. *Fix: Use the single allowed orange #FA3600 for active signals or a hairline border for neutral states.*
*   **[P2] tea-teacher-profile-1440-light.png | Statistics Numbers ("216", "8", "كوكوان")**: The numbers and the Latin email `teacher@test.ly` appear to be in a standard sans-serif font rather than the mandated **Geist Mono**. *Fix: Apply `font-family: Geist Mono` to all numeric values and code/email strings.*
*   **[P3] tea-teacher-profile-1440-light.png | Header Search Bar**: The placeholder text inside the search input is left-aligned while the UI is RTL. Although search inputs often keep text LTR, the label positioning feels slightly disconnected from the surrounding Arabic flow. *Fix: Ensure explicit `dir="ltr"` is set on the input field if not already applied.*

**What is WORKING well:** The overall layout strictly adheres to the "paper ground" aesthetic with excellent use of generous whitespace, clean hairline separators, and a highly readable typographic hierarchy that feels crafted and minimal.

## registrar/admin surfaces

**Defects**

*   **[P1 | admin-00-home.png] Orphaned red pixel:** A single red dot (likely a stray `div` or icon fragment) floats in the upper-left content area above the skeleton cards. **Fix:** Remove the stray element or ensure the intended component renders fully.**
*   **[P2 | admin-06-admin-students.png] Signal color violation:** The student list uses blue (`#4A90E2` approx) for the "با" (View) buttons and status tags ("نشط"). **Fix:** Replace all non-neutral accent colors with the canon signal orange #FA3600.**
*   **[P1 | admin-06-admin-students.png] Font family inconsistency:** Student IDs, emails, and numbers (e.g., "31", "DEMO-2026-030") appear to be rendered in a standard sans-serif or system font, not Geist Mono. **Fix:** Apply `font-family: 'Geist Mono', monospace; dir=ltr;` to all code/numeric strings.**
*   **[P3 | admin-00-home.png] Skeleton loader density:** The skeleton cards and wide list items lack the "generous whitespace" feel of the final design, looking slightly cramped vertically. **Fix:** Increase vertical padding/margins within the skeleton blocks to match the breathing room of the populated state.**

**What is Working Well**

The layout structure is solid: the RTL alignment of the sidebar (icons right), header elements, and breadcrumbs is correct; the paper background (#F6F6EE) and ink color (#282828) are accurately applied; and the overall typographic hierarchy (Headings vs Body) establishes a clear, minimal craft aesthetic.

## admin reports+sync (owner oversight)

**1. CONCRETE DEFECTS**

*   **[P1] admin-08-admin-reports.png — Chart bars (orange, green, brown):** The chart uses **green and brown fills**, violating the strict "ONE orange signal #FA3600" canon. Secondary data must use monochrome (grayscale/ink) or hairline outlines, not competing hues.  
    *Fix:* Restrain non-primary bars to `#282828` at varying opacities or use hollow bars.

*   **[P2] admin-08-admin-reports.png — Numbers in stat cards & chart (38, 31, 3, 7, 1, 4):** These appear to be rendered in a **proportional sans-serif** (likely the UI body font), not the mandated **Geist Mono**. Monospace is required for all codes/numbers per the design canon.  
    *Fix:* Apply `font-family: Geist Mono, monospace; direction: ltr;` to every numeric string.

*   **[P2] admin-10-admin-sync.png — "نجاح" (Success) badges:** The light green background (`#E8F5E9` approx) introduces a **second signal color**. Status indicators should rely on the single orange for alerts/errors, or use ink/hairline for neutral states.  
    *Fix:* Replace green fill with a subtle ink-tinted background or a simple hairline border in `#B3B3AF`.

*   **[P3] admin-08-admin-reports.png — Bottom of chart area:** The x-axis label for the longest bar (**"أخري"**) and its value (**4**) are **clipped/cut off** by the bottom edge of the content container.  
    *Fix:* Increase bottom padding of the chart wrapper or reduce bar height to ensure full visibility.

*   **[P3] admin-10-admin-sync.png — Table column "الحالة" (Status):** All rows show **"أنت من تقرر"** (You decide / placeholder text), indicating **missing or fallback data** in a production-like report view.  
    *Fix:* Populate with real status strings or display an intentional empty-state dash (`—`) rather than raw copy.

---

**2. WHAT IS WORKING WELL**

The **paper-ground (#F6F6EE) and ink (#282828) palette** is applied cleanly across both screens, delivering the intended "restrained minimal craft" feel; the **RTL layout** (headers, breadcrumbs, table columns) is correct; **whitespace** around the stat cards and main containers is generous and well-balanced; and the **hairline separators** (`#B3B3AF`) on tables/tabs correctly follow the canon.
