# Changes Implemented Log

This document tracks all changes made to the website during the local development session.

## Session: 26-01-2026

| Date | File(s) Modified | Description of Change | Rationale |
|------|------------------|-----------------------|-----------|
| 26-01-2026 21:42 | index.html | Removed Snowflakes Effect script | Cleanup; out of season |
| 26-01-2026 21:44 | *.html (Global) | Replaced 'fa-comments' with 'fa-headset' in Chat Widget | Visual consistency update requested by user |

## Session: 27-01-2026 - Quiz Section Refinement & UI Updates

| Date | File(s) Modified | Description of Change | Rationale |
|------|------------------|-----------------------|-----------|
| 27-01-2026 09:05 | assets/components/quiz/quiz.css | Changed `.quiz-cta-section` background to `rgba(40, 150, 205, 0.05)` | Visual consistency; matches "Our Courses" section background |
| 27-01-2026 09:10 | index.html, assets/components/quiz/quiz.css | Optimized quiz card: Reduced padding from 50px to 45px; Increased content width from 55% to 65%; Reduced font size from 2.25rem to 1.95rem; Increased line-height from 1.3 to 1.4 | Improved typography and text flow without wrapping |
| 27-01-2026 09:15 | index.html, assets/components/quiz/quiz.css | Updated quiz button styling: Changed icon from fa-magic to fa-play; Applied light blue gradient `linear-gradient(135deg, #0984e3 0%, #53abd7 100%)`; Changed text color to white | Better visual hierarchy and brand consistency |
| 27-01-2026 09:20 | index.html | Split quiz CTA title into two separate lines: "Unlock Your Potential" (line 1) and "Find Your Ideal Career Path" (line 2) | Improved visual hierarchy and readability |
| 27-01-2026 09:25 | *.html (45 files global) | Replaced all 'fa-comments' chat widget icons with 'fa-headset' across index, about, contact, portfolio, all 27 course pages, and all 6 service pages | Consistent visual branding for chat functionality |

## Session: 27-01-2026 - Testimonials Component (Templatify)

| Date | File(s) Modified | Description of Change | Rationale |
|------|------------------|-----------------------|-----------|
| 27-01-2026 | assets/css/components/testimonials.css | Removed unused avatar/icon hiding CSS rules | Cleanup; HTML elements were already removed |
| 27-01-2026 | index.html | Removed hidden avatar divs and icon spans from testimonial HTML | Cleanup; unused elements |
| 27-01-2026 | assets/components/testimonials/testimonials-data.js | Created new data file with 10 testimonials (stars, quote, name, role) | Component data layer for easy editing |
| 27-01-2026 | assets/components/testimonials/testimonials.js | Created builder script: generates cards from data, handles marquee duplication, star ratings (1-5 customizable) | Component logic layer |
| 27-01-2026 | assets/css/components/testimonials.css | Rewrote CSS: new card design (stars → quote → name/role), single row marquee, removed track-right | New card layout matching approved design |
| 27-01-2026 | index.html | Replaced ~130 lines of hardcoded testimonial cards with component container + script tags | Templatified; data-driven approach |
| 27-01-2026 | assets/css/components/testimonials.css | Updated card background to match Advantage cards: `linear-gradient(135deg, var(--primary-50) 0%, var(--white) 100%)` | Visual consistency with site design |
| 27-01-2026 | testimonials.js, testimonials.css | Added decorative quote watermark (fa-quote-right) with subtle blue color `rgba(40, 150, 205, 0.1)` positioned top-right | Visual polish; classic testimonial styling |
