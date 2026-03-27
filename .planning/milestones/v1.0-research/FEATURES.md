# Feature Landscape

**Domain:** Tattoo Studio Platform (single-studio, consolidated public + admin)
**Researched:** 2026-03-20
**Confidence:** MEDIUM-HIGH (multiple industry sources, competitor analysis, platform feature sets)

## Table Stakes

Features users (both clients and the studio owner) expect. Missing any of these makes the product feel incomplete or unprofessional compared to competitors like Porter ($79-249/mo), Venue Ink, TattooPro, and Tattoogenda.

### Client-Facing Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Portfolio gallery with style filtering** | Clients browse by style (traditional, realism, fine line, blackwork, etc.), not chronologically. Category-organized galleries outperform unsorted feeds for both clients and SEO. | Medium | Already have gallery; needs filtering by style, placement, and curation tools. 20-30 best pieces per category beats 200 unsorted. |
| **Online booking with deposit collection** | Deposits filter out unserious bookings. Industry standard: fixed amount or percentage, applied to final price, with clear cancellation/reschedule rules. Deposit auto-holds slot with timed expiry. | Medium | Cal.com already supports Stripe payments per event type. Enhance with deposit-specific UX (clear policies, auto-cancel on non-payment). |
| **Booking intake forms with reference uploads** | Clients upload reference images, specify style, placement, size, cover-up status, and medical conditions at booking time. Artists need this to estimate time and prep stencils. | Medium | Cal.com supports custom booking questions. Build richer intake with image upload capability via Vercel Blob. |
| **Automated appointment reminders** | 72-hour and 24-hour reminders reduce no-shows significantly. Should include prep instructions (eat beforehand, avoid alcohol, arrive early). | Low | Cal.com handles basic reminders. Enhance with custom content (prep instructions, aftercare preview). |
| **Digital consent/waiver forms** | Legal requirement in most states. Combined consent + liability waiver with e-signature, timestamped, tied to IP/email for ESIGN/UETA compliance. Must be searchable and stored 2-5+ years. | Medium | Build as pre-appointment flow. Client signs digitally before arrival. Include medical history, ID verification acknowledgment, photo release, aftercare acknowledgment. |
| **Mobile-responsive design** | 70%+ of visitors are on phones. Gallery images must auto-resize, booking must work seamlessly on mobile. | Low | Next.js + Tailwind handles this. Already responsive in current sites. Non-negotiable. |
| **Contact/inquiry form** | Basic communication path for non-booking inquiries. | Low | Already built with Resend integration. Keep as-is. |
| **SEO infrastructure** | Local SEO (tattoo artist in [city]), image SEO (descriptive filenames, alt text), structured data, sitemaps. Organic search is primary discovery channel. | Low | Already built. Maintain and enhance with gallery image SEO. |
| **Client profiles with history** | Store tattoo history, preferences, skin type, past stencil placements, aftercare notes, medical info. Repeat clients (70% of tattooed people get more) expect the artist to remember them. | Medium | Admin already has customer CRUD. Extend with richer tattoo-specific fields and make accessible via client portal. |
| **Appointment management** | View, reschedule, cancel appointments. Status tracking (pending deposit, confirmed, in-progress, completed). | Medium | Already built in admin. Needs client-facing view in portal. |

### Admin-Facing Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Dashboard with core KPIs** | Revenue (daily/weekly/monthly), booking conversion rate, client retention rate, average revenue per session, no-show rate. Studios tracking KPIs see 20% increase in sales within a year. | Medium | Already built with Recharts. Enhance with tattoo-specific metrics (revenue per tattoo, session utilization). |
| **Payment processing (full sessions)** | Accept card, Apple Pay, Google Pay for session payments. Track deposits applied to final totals. | Medium | Stripe integration. Deposit collected at booking via Cal.com/Stripe, remainder collected at session completion. |
| **Session tracking** | Track pricing, design details, time spent, consent status, aftercare delivery. Per-session notes and photos (fresh work). | Low | Already built. Maintain. |
| **Media management** | Upload, organize, tag portfolio images. Manage gallery content. | Low | Already built with Vercel Blob. Enhance with tagging/categorization for gallery filtering. |
| **Analytics and reporting** | Revenue reports, booking trends, popular styles/services, client acquisition sources. | Medium | Already built. Enhance with the specific KPIs mentioned above. |
| **Settings and configuration** | Business hours, service types, pricing, policies, artist profiles. | Low | Already built. |
| **Auth with role-based access** | SUPER_ADMIN, ADMIN, MANAGER, STAFF, USER roles. Audit logging. | Low | Already built with Better Auth + 5 RBAC levels. Extend USER role for client portal access. |

## Differentiators

Features that set the platform apart from generic booking tools (Calendly, Square) and even tattoo-specific SaaS (Porter, Venue). Not expected, but valued -- these justify a custom-built platform.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Client portal (self-service)** | Clients log in to view their appointment history, upcoming bookings, tattoo designs in progress, consent form status, and aftercare instructions. Reduces artist DM load. Most tattoo platforms lack a true client-facing portal. | High | Core differentiator. Build on Better Auth USER role. Portal at /portal route group. |
| **Aftercare tracking with healed photo requests** | Automated day-by-day aftercare instructions post-session. Request healed photos at 2-week and 6-week marks. Builds portfolio content and shows care. Tattoo Healer proved 28% drop in aftercare-related calls when studios digitized this. | Medium | Automated email/SMS sequence post-session. Client uploads healed photos to their profile. Artist can approve for gallery use (photo release already in consent form). |
| **Flash sheet management and flash drops** | Upload flash designs, mark as available/claimed/non-repeatable. Run "flash day" events where clients browse and book specific designs. Flashbook.ink built an entire platform around this alone. | Medium | Flash gallery page with availability status. Clients select design and book in one flow. Notify waitlist when new flash drops. |
| **Design approval workflow** | Artist uploads design concept to client portal. Client reviews, requests changes, or approves before appointment. Eliminates surprises on tattoo day, reduces revision time in-studio. | Medium | In-portal messaging/approval flow tied to appointment. Reduces back-and-forth over Instagram DMs. |
| **Waitlist management** | When artist is fully booked, clients join waitlist. Auto-notify when cancellations open slots. Also useful for guest artist return visits. Tattoogenda and Anolla both highlight this as a high-value feature. | Medium | Priority queue with auto-notification. Integrates with Cal.com webhooks (BOOKING_CANCELLED triggers waitlist notification). |
| **Online store (merch, prints, gift cards)** | Sell branded merchandise, art prints, and digital/physical gift cards. Gift cards are extremely common across tattoo studios (nearly every studio website has them). Prints and merch add passive revenue. | High | Lightweight ecommerce: product catalog, cart, Stripe checkout. Gift cards as store credit codes redeemable against bookings/sessions. |
| **Gift card system** | Digital gift cards with unique codes, redeemable for services or merch. Common across tattoo studios: Black Diamond, Electric Lotus, 717 Tattoo, First Place all offer them. Standard denominations + custom amounts. Never-expire or 1-year expiry options. | Medium | Stripe-powered purchase. Generate unique codes stored in DB. Redeem at checkout or in-studio. Track balance, usage history. |
| **Smart gallery curation** | Before/after comparison views. Fresh vs. healed photos side-by-side. Behind-the-scenes content (sketches, stencils, process videos). This is what converts browsers into bookers -- trust building through process transparency. | Medium | Gallery enhancements beyond basic image grid. Comparison slider component. Process galleries (sketch > stencil > fresh > healed). |
| **Email marketing campaigns** | Targeted campaigns: flash announcements, re-engagement for dormant clients, birthday/anniversary messages, new portfolio drops. Email is 40x more effective than social media for client acquisition. 91% of US adults accept promotional emails from trusted brands. | Medium | Integration with Resend (already in stack). Client segments based on visit history, style preferences, last visit date. |
| **Loyalty program** | Track visits, offer perks at milestones (free touch-up after 5th session, priority booking, merch discount). Client lifetime value of $1,500-3,000+ means retention is far cheaper than acquisition. | Low-Medium | Points/visit tracking. Simple tier system. Admin configures rewards. |
| **Review/testimonial collection** | Automated post-session review requests. Display curated reviews on public site. Social proof is critical for tattoo businesses. Studios with active review collection see referral rates above 70%. | Low | Automated email post-session. Approval workflow before public display. Link to Google Reviews for SEO benefit. |

## Anti-Features

Features to explicitly NOT build. These are either out of scope (per PROJECT.md), over-engineered for a single-studio platform, or actively harmful.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Multi-artist marketplace / discovery** | This is a single-studio platform (per PROJECT.md "Out of Scope"). Building marketplace discovery, artist search, and multi-studio management adds enormous complexity for zero value. | Focus on showcasing the single studio's work. SEO and social media handle discovery. |
| **Real-time chat / messaging** | Per PROJECT.md: "Cal.com and contact form cover communication." Building real-time chat requires WebSocket infrastructure, moderation, notification systems, and ongoing maintenance. Instagram DMs already serve this purpose for most tattoo studios. | Contact form for inquiries, Cal.com for booking communication, email for follow-ups, design approval workflow for in-portal communication on specific appointments. |
| **Custom CMS / blog engine** | Per PROJECT.md: "Admin dashboard handles content management needs." A full CMS is overkill. The gallery IS the content. Blog posts rarely drive tattoo bookings. | Gallery management serves as the primary content system. If blog is ever needed, use MDX files in the repo -- not a CMS. |
| **Mobile native app** | Per PROJECT.md: "Web-first, responsive design handles mobile." Native app development doubles maintenance burden. PWA covers offline/home screen needs. | Keep PWA support (already in tattoo-website). Responsive web handles 100% of client needs. |
| **AI-powered design generation** | Trendy but legally and artistically fraught. Tattoo artists value original work. AI-generated designs undermine the artist's brand and skill. Copyright issues are unresolved. | Reference image upload and design approval workflow serve the design collaboration need without AI complications. |
| **Inventory management** | Adds significant complexity (supply categories, reorder points, expiry tracking, vendor management) for a single-artist studio. Enterprise-level feature that most solo studios handle with simple spreadsheets or even mental tracking. | Track COGS and basic expenses in analytics. If needed later, integrate with a dedicated inventory tool rather than building from scratch. |
| **Commission tracking / payroll** | Single-studio, single-artist platform. Commission splits and payroll are multi-artist features. Adds accounting complexity and potential legal liability. | Track revenue and expenses. Use separate accounting software (QuickBooks, Wave) for tax/payroll. |
| **Walk-in queue management** | Digital walk-in queue management is for high-traffic multi-artist shops. A single artist knows who is in their studio. Adds complexity without value for this context. | Accept walk-ins informally. If the artist wants to accept walk-ins, they can open short-notice Cal.com slots. |
| **Dynamic pricing / AI pricing** | Algorithmic pricing based on style, placement, complexity is a feature of platforms like Anolla that serve many artists. For a single artist, pricing is a personal/artistic decision, not an algorithm. | Settings-based pricing for service types. Artist sets their own rates. |
| **Social media auto-posting** | Tight coupling to Instagram/TikTok APIs is fragile (API changes, rate limits, content policies). Social media management tools (Later, Buffer) do this better. | Gallery media is download-ready for manual posting. Consider "share to social" convenience links but not automated posting. |

## Feature Dependencies

```
Digital Consent Forms --> Client Portal (forms accessible from portal)
Booking Intake Forms --> Reference Image Upload (Vercel Blob storage)
Client Portal --> Auth System Extension (USER role in Better Auth)
Client Portal --> Appointment Management (client views their appointments)
Client Portal --> Design Approval Workflow (requires portal for review)
Client Portal --> Aftercare Tracking (instructions and photo upload via portal)
Deposit Collection --> Payment Processing (Stripe integration)
Online Store --> Payment Processing (Stripe integration)
Gift Cards --> Online Store (gift cards sold through store)
Gift Cards --> Payment Processing (Stripe for purchase + redemption)
Flash Sheet Management --> Gallery System (flash designs displayed in gallery)
Flash Sheet Management --> Booking Integration (book specific flash design)
Waitlist Management --> Cal.com Webhooks (BOOKING_CANCELLED triggers notification)
Waitlist Management --> Email System (Resend for notifications)
Email Marketing --> Client Profiles (segmentation based on history)
Email Marketing --> Email System (Resend infrastructure)
Loyalty Program --> Client Profiles (visit tracking, milestone calculation)
Review Collection --> Email System (automated post-session requests)
Healed Photo Requests --> Aftercare Tracking (part of post-session flow)
Healed Photo Requests --> Gallery System (approved healed photos enter gallery)
Gallery Filtering --> Media Management (tags, categories on images)
```

## MVP Recommendation

### Phase 1: Consolidation + Core Enhancement (Table Stakes)
Prioritize first -- these complete the existing feature set:
1. **Portfolio gallery with style/placement filtering** -- transforms existing gallery from archive to sales tool
2. **Digital consent/waiver forms** -- legal necessity, eliminates paper, enables pre-arrival workflow
3. **Enhanced booking intake** (reference image upload, detailed custom questions via Cal.com)
4. **Payment processing for session completion** (Stripe, deposit already via Cal.com)
5. **Media tagging and categorization** (foundation for gallery filtering)

### Phase 2: Client Portal + Engagement
Build the differentiating client experience:
1. **Client portal** (view appointments, history, consent forms, aftercare)
2. **Aftercare tracking with automated instructions**
3. **Design approval workflow** (design review within portal)
4. **Review/testimonial collection** (automated post-session)

### Phase 3: Revenue Expansion
Monetization features that drive additional revenue:
1. **Gift card system** (most common tattoo studio ecommerce feature)
2. **Online store** (merch, prints)
3. **Flash sheet management with flash drops**

### Phase 4: Retention + Growth
Marketing and retention features:
1. **Email marketing campaigns** (re-engagement, flash announcements, birthday offers)
2. **Waitlist management** (fill cancellations, guest artist booking)
3. **Loyalty program** (visit milestone rewards)
4. **Smart gallery curation** (before/after, process galleries)

**Defer indefinitely:** Inventory management, commission tracking, walk-in queue, dynamic pricing, social media auto-posting, AI anything.

## Complexity Budget

| Complexity | Feature Count | Notes |
|------------|---------------|-------|
| Low | 9 | Contact form, SEO, mobile responsive, session tracking, settings, media management, review collection, loyalty program, reminders |
| Medium | 16 | Gallery filtering, booking intake, consent forms, payment processing, client profiles, dashboard KPIs, aftercare tracking, flash management, design approval, waitlist, email marketing, gift cards, smart gallery, analytics, appointment management, media tagging |
| High | 2 | Client portal (cross-cutting, touches auth/appointments/designs/aftercare), Online store (product catalog, cart, checkout, order management) |

## Sources

- [Porter - Tattoo Shop Management Software](https://www.getporter.io/)
- [Tattoo Studio Pro - Features](https://tattoostudiopro.com/)
- [Anolla - Best Tattoo Software 2026](https://anolla.com/en/best-tattoo-software)
- [Tattoogenda - Tattoo CRM](https://tattoogenda.com/tattoo-software/tattoo-crm/)
- [Venue Ink - Tattoo Booking](https://www.venue.ink)
- [Flashbook - Flash Drops Platform](https://flashbook.ink/)
- [Cal.com - Tattoo Artist Booking](https://cal.com/blog/tattoo-artist-booking-scheduling-calcom)
- [Cal.com - Webhooks Documentation](https://cal.com/docs/developing/guides/automation/webhooks)
- [Tattoo Studio Pro - Consent Forms](https://tattoostudiopro.com/tattoo-consent-form/)
- [Tattoo Studio Pro - Email Marketing](https://tattoostudiopro.com/email-marketing/)
- [Tattoo Studio Pro - KPIs](https://tattoostudiopro.com/kpis/)
- [Tattoo Healer - Digital Aftercare](https://tattoo-healer.com/)
- [Studioflo - CRM for Tattoo Business](https://www.studioflo.io/blog/why-you-need-a-crm-for-your-tattoo-business-and-how-to-choose-one)
- [TattooBizGuide - Portfolio Websites 2026](https://tattoobizguide.com/blog/best-portfolio-websites-tattoo-artists)
- [Capterra - Tattoo Studio Software 2026](https://www.capterra.com/tattoo-studio-software/)
- [Tattoo Studio Pro - Point of Sale](https://tattoostudiopro.com/software-playbook/point-of-sale/)
- [eWaiverPro - Tattoo Digital Waivers](https://ewaiverpro.com/tattoo/)
- [WaiverSign - Digitize Consent Forms](https://www.waiversign.com/how-to-digitize-tattoo-piercing-consent-forms)
- [Business Plan Templates - Tattoo KPIs](https://businessplan-templates.com/blogs/metrics/tattoo-artist)
