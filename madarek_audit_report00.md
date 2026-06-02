# Comprehensive UX/UI Audit Report

## Madarek — منصة التعليم الذكي | جامعة الزاوية

**URL:** [https://madarek.onrender.com/](https://madarek.onrender.com/)  
**Audit Date:** June 2, 2026  
**Auditor:** SkyClaw AI Agent

---

## Executive Summary

Madarek (مدارك) is an ambitious, feature-rich educational platform for Al-Zawiya University (جامعة الزاوية), Libya. The platform targets four academic roles — students, professors, administration, and quality assurance — and promises an integrated ecosystem spanning lectures, AI-assisted learning, exams, virtual labs, research integrity checking, and institutional analytics.

**Overall Assessment:** The platform demonstrates a strong conceptual foundation and an impressive feature vision. The landing page communicates the value proposition clearly with well-crafted Arabic copy. However, several critical gaps exist between the _promised_ experience and the _delivered_ experience — particularly around inner-page functionality, performance infrastructure, and interactive polish. The platform needs significant refinement to reach world-class standards comparable to platforms like Idraak (إدراك), Canvas, or Notion.

**Maturity Rating:** Early-stage / Pre-MVP landing page with incomplete inner application.

---

## 1\. Visual Design & Theming

### Strengths

| Aspect | Assessment |
| --- | --- |
| **Color Palette** | The cream/beige and gold (كريمي وذهبي) theme is elegant and appropriate for an academic institution. It conveys warmth and prestige without being overly corporate. |
| **RTL Implementation** | Full RTL support is correctly implemented — text direction, icon mirroring, and layout flow are proper for Arabic-first content. |
| **Typography Hierarchy** | Clear visual hierarchy with large hero headings, section titles, and body text. The use of bold Arabic calligraphy-style headings is distinctive. |
| **Institutional Branding** | The top banner showing the institutional hierarchy (دولة ليبيا → وزارة التعليم العالي → جامعة الزاوية) with the Libyan flag establishes credibility and official status. |
| **Whitespace Usage** | Generous spacing between sections creates a clean, uncluttered feel that avoids visual overload. |

### Weaknesses

| Issue | Severity | Detail |
| --- | --- | --- |
| **Limited Color Variety** | Medium | The cream/gold palette, while elegant, risks feeling monotonous across a large platform. World-class platforms (Idraak, Coursera, Notion) use accent colors strategically to differentiate sections, highlight actions, and create visual rhythm. |
| **No Dark Mode** | Medium | No evidence of a dark mode toggle or system-preference detection. Dark mode is now an expected feature on modern platforms, especially for students studying at night. |
| **Hero Typography Styling** | Low | The hero heading uses a mix of bold, colored, and highlighted text ("التعليم" in gold, "الزاوية" on a highlight background). While eye-catching, this approach can feel inconsistent with the otherwise clean design language. Consider a more unified typographic treatment. |
| **Card Design Uniformity** | Low | Feature cards across sections use similar styling without enough visual differentiation. Cards for different feature categories (matrix, AI assistant, analytics) should have distinct visual signatures. |

### Recommendations

1.  **Introduce a structured accent color system** — Define 2-3 accent colors (beyond the gold) for interactive elements, category differentiation, and status indicators. Consider a deep teal or indigo as a complementary accent to the cream/gold base.
2.  **Implement dark mode** — Add a toggle (preferably respecting `prefers-color-scheme`) with a carefully designed dark variant of the cream/gold palette. A warm dark gray (#1a1a1a) background with adjusted gold accents would maintain brand identity.
3.  **Create a design token system** — Formalize spacing, radius, shadow, and color values into CSS custom properties or a design token file for consistency across all future pages.
4.  **Refine hero heading treatment** — Move toward a cleaner, single-weight headline with the emphasis conveyed through layout and supporting elements rather than inline text styling variations.

---

## 2\. User Interface & Interaction Effects

### Current State

From the crawled content and screenshots, the platform's landing page appears to be primarily **static content** with:

-   A simulated chat UI showcasing the "Oasis" AI assistant (static mockup, not interactive on the landing page)
-   Statistic counters (40%, 70%, 30%, 90%) that may have entrance animations
-   Section-based scrolling layout
-   CTA buttons ("ابدأ مجاناً الآن", "شاهد كيف تعمل", "تسجيل الدخول")

### Weaknesses

| Issue | Severity | Detail |
| --- | --- | --- |
| **No Observable Animations** | High | From the static screenshots, there is no evidence of scroll-triggered animations, staggered reveals, or micro-interactions. The page appears to render all content at once. |
| **Static "Oasis" Chat Mockup** | High | The AI assistant showcase is a static screenshot/mockup rather than an interactive demo. This misses a major opportunity to demonstrate the platform's flagship feature. |
| **No Hover States Visible** | Medium | Buttons and cards lack visible hover/focus state descriptions in the crawled content. Interactive feedback is critical for desktop users. |
| **No Loading Skeletons** | Medium | The Render cold-start screen shows a generic "APPLICATION LOADING" message. There are no skeleton screens or progressive loading states for content. |
| **No Notion-Inspired Interactions** | High | The user requested Notion-inspired effects. Currently absent: inline editing feel, slash-command menus, collapsible sections, drag-and-drop reordering, smooth page transitions, breadcrumb navigation, and the characteristic "block-based" content editing experience. |

### Recommendations — Notion-Inspired Interaction Layer

1.  **Scroll-triggered section reveals** — Implement IntersectionObserver-based animations where each section fades/slides into view as the user scrolls. Use a subtle `opacity: 0 → 1` with `translateY(20px) → 0` transition, staggered by 100ms per card within a section.
    
2.  **Interactive Oasis Demo** — Replace the static chat mockup with a working mini-demo on the landing page. Pre-program 3-4 sample Q&A exchanges that play out automatically, then allow the visitor to type a question. This creates an "aha moment" and showcases the AI capability.
    
3.  **Notion-style collapsible sections** — For the feature descriptions (المصفوفة التعليمية, المساعد الأكاديمي, etc.), implement expandable/collapsible cards where the default state shows an icon + title + one-line description, and expanding reveals the full detail. This reduces initial cognitive load.
    
4.  **Smooth page transitions** — When navigating between pages (login → dashboard → course), use shared-element transitions or at minimum a fade/slide transition. Framework: consider Framer Motion (React) or View Transitions API.
    
5.  **Micro-interactions on interactive elements:**
    
    -   Buttons: subtle scale(1.02) on hover, press-down effect on click
    -   Cards: elevation change (shadow deepening) on hover
    -   Stat counters: animated count-up from 0 to final value on scroll-into-view
    -   Toggle switches: smooth spring animation for any on/off controls
6.  **Skeleton loading states** — Replace the generic Render loading screen with branded skeleton screens that mimic the actual page layout with pulsing placeholder rectangles. This reduces perceived wait time.
    

---

## 3\. Feature Set & Functionality

### Promised Features (from landing page content)

| # | Feature | Arabic Name | Status |
| --- | --- | --- | --- |
| 1 | Adaptive Learning Matrix | المصفوفة التعليمية | Promised |
| 2 | AI Academic Assistant "Oasis" | المساعد الأكاديمي | Promised |
| 3 | Academic Analytics Dashboard | تحليلات أكاديمية | Promised |
| 4 | Library & Research | مكتبة وبحوث | Promised |
| 5 | Plagiarism + AI Detection | فحص النزاهة العلمية | Promised |
| 6 | Unified System (lectures, attendance, grades) | منظومة موحَّدة | Promised |
| 7 | Institutional Quality Indicators | جودة مؤسسية | Promised |
| 8 | Weekly Smart Schedule | الجدول الدراسي | Promised |
| 9 | Electronic Exams (MCQ, T/F, short answer, essay) | الامتحانات الإلكترونية | Promised |
| 10 | Virtual Labs (Cisco, Arduino, AR/VR) | المعامل الافتراضية | Promised |
| 11 | Achievements & Badges | الإنجازات والشارات | Promised |
| 12 | Role-based Access (4 roles) | أربعة أدوار | Promised |

### Critical Finding: Inner Pages Not Functional

**All tested routes (/dashboard, /courses, /faculties) returned the same landing page content.** This indicates one of two scenarios:

-   The inner application is client-side rendered (SPA) and requires authentication to access
-   The inner pages have not yet been built

**This is the single most important finding of this audit.** The platform currently functions as a marketing landing page, not a working educational platform.

### Missing Features (compared to world-class benchmarks)

| Feature | Why It Matters | Benchmark |
| --- | --- | --- |
| **Discussion Forums** | Peer-to-peer learning is a cornerstone of engagement | Idraak has active discussion sections per course |
| **Live Video Integration** | Real-time lectures and office hours | Zoom/BigBlueButton integration is standard |
| **File Submission System** | Students need to upload assignments, projects, theses | Canvas, Moodle both have robust submission flows |
| **Gradebook with Weighted Categories** | Professors need flexible grading schemes | Standard LMS feature |
| **Notification Center** | Students and professors need timely alerts | Push/email/in-app notifications for deadlines, grades, messages |
| **Course Search & Discovery** | Browse and search available courses before enrolling | Idraak's homepage is course-discovery focused |
| **Certificates** | Automated certificate generation upon course completion | Idraak offers verified certificates |
| **Mobile App** | Native mobile experience for on-the-go learning | Idraak has a dedicated mobile app |
| **Multi-language Support** | English interface option for international students and English-taught courses | Idraak supports Arabic and English |
| **SSO / SAML Integration** | Enterprise-grade authentication for university identity systems | Standard for institutional deployments |

### Recommendations

1.  **Immediate Priority — Build Inner Application:** The landing page promises must be backed by working functionality. Prioritize the core student flow: Login → Dashboard → Course List → Course Content → Assignment Submission → Grade Viewing.
    
2.  **Phased Feature Rollout:**
    
    -   **Phase 1 (MVP):** Authentication, course browsing, lecture content (video/PDF), basic assignments, grade display
    -   **Phase 2:** AI assistant "Oasis", discussion forums, electronic exams, attendance tracking
    -   **Phase 3:** Virtual labs, plagiarism detection, achievements/badges, analytics dashboards
    -   **Phase 4:** Quality assurance portal, institutional reporting, AR/VR labs
3.  **Integrate Discussion Forums** — Add per-course and per-lecture discussion threads. This is the #1 missing engagement feature compared to Idraak and other successful platforms.
    
4.  **Add a Notification System** — Implement a unified notification center with in-app badges, email digests, and optional push notifications. Trigger notifications for: new lecture uploads, assignment deadlines, grade postings, forum replies, and AI assistant summaries.
    

---

## 4\. Responsiveness & Accessibility

### Responsiveness

**Observed:** The mobile screenshot (375×812 viewport) shows:

-   ✅ Hamburger menu icon present
-   ✅ Logo and branding adapt to mobile width
-   ✅ Top institutional banner compresses to a single line
-   ✅ Content appears to stack vertically

**Concerns:**

-   Only one mobile breakpoint was tested. Tablet (768px, 1024px) and large desktop (1920px+) views were not verified.
-   The simulated chat UI and dashboard mockup shown on the landing page need verification at all breakpoints.
-   The 26-faculty grid (mentioned in content) needs a responsive grid strategy (e.g., 4 columns → 2 columns → 1 column).

### Accessibility (a11y)

**Observed:**

-   ✅ RTL support is implemented
-   Content is text-based (crawlable), suggesting proper HTML semantics for headings and paragraphs

**Concerns:**

-   **No visible skip-to-content link** — Critical for keyboard/screen reader users
-   **Color contrast** — The cream/gold palette needs WCAG 2.1 AA verification. Gold text on cream backgrounds often fails contrast ratios (minimum 4.5:1 for normal text).
-   **No visible ARIA labels** — Cannot verify from crawled content, but the simulated chat UI and icon buttons likely need proper ARIA attributes.
-   **Keyboard navigation** — Cannot verify tab order, focus indicators, or keyboard trap prevention (especially for modal dialogs like login).
-   **No language attribute verification** — The page should declare `lang="ar"` and `dir="rtl"` on the `<html>` element.
-   **Image alt text** — The dashboard screenshot/mockup shown on the landing page needs descriptive alt text.
-   **No visible error messages** — The login form's validation and error states were not observable.

### Recommendations

1.  **Run automated a11y audits** — Use Lighthouse, axe DevTools, and WAVE to generate a comprehensive accessibility report. Fix all WCAG 2.1 AA violations.
    
2.  **Color contrast audit** — Specifically test the gold accent color against the cream background. If contrast is below 4.5:1, darken the gold or add a text shadow/outline.
    
3.  **Add skip navigation link** — First focusable element should be a "skip to main content" link that appears on focus.
    
4.  **Responsive testing matrix** — Test at minimum: 320px (small mobile), 375px (standard mobile), 768px (tablet portrait), 1024px (tablet landscape), 1280px (laptop), 1920px (desktop). Use Chrome DevTools responsive mode and real devices.
    
5.  **Focus indicator design** — Design custom focus rings that match the platform's aesthetic (e.g., a gold outline with 2px offset) rather than relying on the browser default.
    

---

## 5\. Navigation & User Flow

### Current Navigation Structure

```
Landing Page (/)
├── Top Banner: Institutional hierarchy (static)
├── Header: Logo + Hamburger menu
├── Hero: CTA buttons → "ابدأ مجاناً الآن", "شاهد كيف تعمل"
├── Sections (scroll): Features, Oasis demo, Roles, Study results, Testimonials
├── Footer CTAs: "تسجيل الدخول", "اكتشف المنصة"
└── Routes: /login, /about, /dashboard, /courses, /faculties

```

### Issues

| Issue | Severity | Detail |
| --- | --- | --- |
| **Hamburger Menu on Desktop** | Medium | The mobile screenshot shows a hamburger menu. If this is also used on desktop, it hides navigation options and reduces discoverability. Desktop should use a visible horizontal nav bar. |
| **No Breadcrumb Navigation** | Medium | Once inside the application (e.g., University → Faculty → Course → Lecture), breadcrumbs are essential for orientation. |
| **No Search Functionality** | High | No visible search bar on the landing page. Students need to search for courses, lectures, and resources. |
| **No User Profile/Settings Access** | Medium | No visible link to user profile, settings, or account management on the landing page. |
| **Single-Page Landing** | High | The entire landing experience is a long-scroll single page. While this is acceptable for a marketing page, it lacks the navigational structure of a working platform. |
| **CTA Ambiguity** | Low | "ابدأ مجاناً الآن" (Start for free now) and "تسجيل الدخول" (Login) serve different user states (new vs. returning) but look similar. Consider visually distinguishing them. |

### Recommended Navigation Architecture

```
Public Pages:
├── Home (/) — Landing page with feature overview
├── Courses (/courses) — Browse/search all available courses
├── Faculties (/faculties) — Browse by faculty/department
├── About (/about) — University and platform information
├── Login (/login) — Authentication
└── Register (/register) — New user registration (if applicable)

Authenticated — Student:
├── Dashboard (/dashboard) — Personal overview: GPA, attendance, tasks
├── My Courses (/courses/my) — Enrolled courses list
├── Course Detail (/courses/:id) — Lectures, assignments, grades, discussions
├── AI Assistant (/oasis) — Full-screen Oasis chat interface
├── Schedule (/schedule) — Weekly smart schedule
├── Library (/library) — Research library and book borrowing
├── Exams (/exams) — Active and past examinations
├── Achievements (/achievements) — Badges, points, certificates
├── Notifications (/notifications) — Unified notification center
└── Profile (/profile) — Settings, preferences, account info

Authenticated — Professor:
├── Dashboard — Class overview, at-risk students
├── My Courses — Manage courses, upload content
├── Gradebook — Enter and manage grades
├── Attendance — Track and analyze attendance
├── Exams — Create and manage examinations
├── Virtual Labs — Lab session management
└── Analytics — Student performance insights

Authenticated — Administration:
├── Dashboard — University-wide KPIs
├── Faculties — Manage faculties and departments
├── Professors — Manage faculty members
├── Courses — Oversee all courses
├── Reports — Generate institutional reports
└── Settings — System configuration

Authenticated — Quality Assurance:
├── Dashboard — Quality indicators overview
├── Course Quality — Evaluate course effectiveness
├── Professor Ratings — Review professor assessments
├── Exam Reviews — Audit examination quality
├── Curriculum Reviews — Review curriculum alignment
└── Reports — Generate quality reports

```

### Recommendations

1.  **Replace hamburger menu with horizontal nav on desktop** — Show primary navigation links (Home, Courses, Faculties, About, Login) in a visible top navigation bar on desktop. Reserve the hamburger menu for mobile only.
    
2.  **Add a global search bar** — Place a search input in the header that allows searching across courses, lectures, and resources. Implement fuzzy matching and autocomplete.
    
3.  **Implement breadcrumb navigation** — On all inner pages, show the navigation path (e.g., الرئيسية \> الكليات \> هندسة البرمجيات \> خوارزميات \> المحاضرة 4).
    
4.  **Add a sticky header** — Make the header fixed on scroll so navigation is always accessible without scrolling to the top.
    
5.  **Create a proper footer** — The current footer is minimal. Add links to: About, Contact, Privacy Policy, Terms of Service, Help/FAQ, Social Media, and institutional affiliations.
    

---

## 6\. Performance & Infrastructure

### Critical Issue: Render Free Tier Cold Starts

The screenshot captured the Render cold-start screen: "INCOMING HTTP REQUEST DETECTED... APPLICATION LOADING." This means:

-   **First load time: 30-60+ seconds** on the free tier after inactivity
-   **Every user's first visit is penalized** with an unacceptable wait time
-   **The generic Render loading screen** damages professional credibility

### Recommendations

1.  **Upgrade hosting immediately** — Move to Render's paid tier (eliminates cold starts) or migrate to a platform better suited for the workload:
    
    -   **Vercel** — Excellent for Next.js/React SPAs, free tier available
    -   **Railway** — Good for full-stack apps with database
    -   **AWS/GCP** — For production-scale institutional deployment
    -   **University servers** — Since this is an official university platform, hosting on university infrastructure would be ideal for data sovereignty and reliability
2.  **Implement edge caching** — The landing page content is largely static. Serve it from a CDN (Cloudflare, Vercel Edge Network) to eliminate origin server cold starts for the marketing pages.
    
3.  **Add a branded loading experience** — At minimum, replace the generic Render splash screen with a branded loading animation featuring the Madarek logo and a progress indicator.
    

---

## 7\. Comparison with Idraak (إدراك) — Reference Platform

| Dimension | Madarek (مدارك) | Idraak (إدراك) | Gap |
| --- | --- | --- | --- |
| **Course Catalog** | Not yet functional | 300+ courses with search, filters, categories | Critical |
| **User Base** | ~48K registered (claimed) | 10M+ learners | Scale gap |
| **Mobile App** | Not mentioned | Dedicated mobile app | High |
| **Discussion Forums** | Not visible | Active per-course discussions | High |
| **Certificates** | Promised (achievements/badges) | Verified certificates | Medium |
| **Content Partnerships** | University-only | Partnerships with IHG, Capital Bank, GHI Academy | Medium |
| **AI Features** | "Oasis" AI assistant (promised) | Not a primary feature | Madarek advantage |
| **Virtual Labs** | Promised (Cisco, Arduino, AR/VR) | Not available | Madarek advantage |
| **Institutional Integration** | Deep (attendance, grades, admin) | MOOC-style, less integrated | Madarek advantage |
| **Multi-language** | Arabic only (observed) | Arabic + English | Medium |
| **Blog/News** | Not visible | Active blog with updates | Low |

**Key Insight:** Madarek's differentiator is **deep institutional integration** (it's not a MOOC platform — it's a university LMS with AI). Idraak's differentiator is **open access and scale**. Madarek should lean into its institutional depth rather than trying to compete on course catalog breadth.

---

## 8\. Priority Action Items

### 🔴 Critical (Blockers to Launch)

| # | Action | Effort | Impact |
| --- | --- | --- | --- |
| 1 | **Build inner application pages** — Dashboard, courses, login flow must be functional | Very High | Without working inner pages, the platform is just a landing page |
| 2 | **Resolve Render cold-start issue** — Upgrade hosting or implement CDN caching | Medium | 30-60 second load times will drive users away |
| 3 | **Implement authentication flow** — University email / registration number login must work end-to-end | High | No platform functionality is accessible without auth |

### 🟠 High Priority (User Experience)

| # | Action | Effort | Impact |
| --- | --- | --- | --- |
| 4 | Add global search functionality | Medium | Users cannot find content without search |
| 5 | Implement discussion forums | High | Peer learning is essential for engagement |
| 6 | Add notification system | Medium | Users miss deadlines and updates without notifications |
| 7 | Design and implement dark mode | Medium | Expected feature for modern platforms |
| 8 | Add WCAG 2.1 AA accessibility compliance | Medium | Legal and ethical requirement; expands user base |

### 🟡 Medium Priority (Polish & Differentiation)

| # | Action | Effort | Impact |
| --- | --- | --- | --- |
| 9 | Implement Notion-inspired scroll animations and micro-interactions | Medium | Elevates perceived quality and modern feel |
| 10 | Make "Oasis" AI demo interactive on landing page | Medium | Showcases the platform's flagship feature |
| 11 | Add English language support | High | International students and English-taught courses |
| 12 | Build certificate generation system | Medium | Tangible value for students |
| 13 | Create mobile app (React Native or Flutter) | Very High | Mobile-first students need native experience |

### 🟢 Nice to Have

| # | Action | Effort | Impact |
| --- | --- | --- | --- |
| 14 | Blog/news section for platform updates | Low | Community engagement |
| 15 | Social media integration and sharing | Low | Organic growth |
| 16 | Content partnerships with other institutions | Very High | Expands course catalog |
| 17 | Live video integration (BigBlueButton/Zoom) | High | Real-time learning |

---

## 9\. Concluding Thoughts

Madarek has an **ambitious and well-conceived vision** for an AI-enhanced institutional learning management system. The Arabic copy is excellent — clear, professional, and persuasive. The feature set, if fully realized, would be among the most comprehensive Arabic-language educational platforms.

However, the gap between the **promised experience** (described on the landing page) and the **delivered experience** (a static landing page on a slow hosting platform) is currently very wide. The immediate priority must be:

1.  **Making the inner application work** — Students, professors, and administrators need functional dashboards, not descriptions of dashboards.
2.  **Fixing the hosting infrastructure** — No amount of good design can compensate for a 60-second cold start.
3.  **Adopting a phased rollout strategy** — Launch with a minimal but fully functional core (auth + courses + content + assignments), then iteratively add AI, labs, analytics, and quality assurance features.

The platform's institutional integration depth and AI assistant ("Oasis") are genuine differentiators that, when properly built and performed, could make Madarek a reference platform for Arabic-language higher education technology.

---

_Report prepared by SkyClaw AI Agent on behalf of the Madarek platform team._  
_Methodology: Automated web crawling, screenshot analysis at desktop and mobile viewports, content extraction, and comparative analysis against Idraak (إدراك) and industry benchmarks._