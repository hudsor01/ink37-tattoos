# Phase 5: Online Store - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-22
**Phase:** 05-online-store
**Areas discussed:** Product catalog & management, Cart & checkout flow, Gift card mechanics, Digital product delivery

---

## Product Catalog & Management

| Option | Description | Selected |
|--------|-------------|----------|
| Admin dashboard only | Full CRUD in admin UI with Stripe Products synced behind the scenes | ✓ |
| Stripe Dashboard primary | Create products in Stripe, sync to DB via webhooks | |
| Both with sync | Bidirectional sync between admin and Stripe | |

**User's choice:** Admin dashboard only
**Notes:** Consistent with existing admin management patterns for customers, appointments, etc.

| Option | Description | Selected |
|--------|-------------|----------|
| Physical + digital + gift cards | Merch, art prints, and gift cards. Full STORE scope. | ✓ |
| Digital + gift cards only | No physical shipping complexity | |
| Gift cards only to start | Minimum viable store | |

**User's choice:** Physical + digital + gift cards

| Option | Description | Selected |
|--------|-------------|----------|
| Grid of product cards | Clean grid with image, name, price. Click for detail page. | ✓ |
| Category tabs + grid | Tabs filtering a product grid | |
| Single scrollable page | All products in sections | |

**User's choice:** Grid of product cards

| Option | Description | Selected |
|--------|-------------|----------|
| Under 20 products | No pagination needed, simple filter by type | ✓ |
| 20-50 products | Category filtering, maybe pagination | |
| 50+ products | Search, filtering, and pagination | |

**User's choice:** Under 20 products

---

## Cart & Checkout Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Guest checkout allowed | No registration required. Stripe Checkout collects email. | ✓ |
| Account required | Must register/login before checkout | |
| Guest with optional account | Guest by default, offer account after purchase | |

**User's choice:** Guest checkout allowed

| Option | Description | Selected |
|--------|-------------|----------|
| Session-based cart | localStorage cart. No auth needed. | ✓ |
| Server-side cart | Database cart. Persists across devices. | |
| No cart — buy now only | Direct to Stripe Checkout per item | |

**User's choice:** Session-based cart

| Option | Description | Selected |
|--------|-------------|----------|
| Flat rate shipping | Single flat fee for physical items | ✓ |
| Stripe shipping rates | Stripe's built-in shipping calculation | |
| Local pickup only | No shipping — studio pickup | |

**User's choice:** Flat rate shipping

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, at both store and booking | Gift cards work at store checkout AND tattoo booking deposits | ✓ |
| Store checkout only | Gift cards only in online store | |
| Booking only | Gift cards only for tattoo deposits | |

**User's choice:** Yes, at both store and booking

---

## Gift Card Mechanics

| Option | Description | Selected |
|--------|-------------|----------|
| Preset amounts | Fixed options: $25, $50, $100, $200, $500 | ✓ |
| Custom amount | Buyer enters any dollar amount | |
| Both preset and custom | Quick-select buttons plus custom field | |

**User's choice:** Preset amounts

| Option | Description | Selected |
|--------|-------------|----------|
| Random alphanumeric | 16-char: INK37-XXXX-XXXX-XXXX | ✓ |
| Short codes | 8-char: INK-XXXXXX | |
| UUID-based | Full UUID codes | |

**User's choice:** Random alphanumeric

| Option | Description | Selected |
|--------|-------------|----------|
| No expiration | Gift cards never expire | ✓ |
| 1 year expiration | 12-month expiry | |
| You decide | Claude picks | |

**User's choice:** No expiration

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, name + message | Recipient name, email, optional message in delivery email | ✓ |
| Just the code | Code and amount only | |
| You decide | Claude picks | |

**User's choice:** Yes, name + message

---

## Digital Product Delivery

| Option | Description | Selected |
|--------|-------------|----------|
| Vercel Blob | Consistent with existing media uploads. Signed URLs. | ✓ |
| Stripe file hosting | Upload files to Stripe metadata | |
| External CDN | Cloudflare R2 or S3 | |

**User's choice:** Vercel Blob

| Option | Description | Selected |
|--------|-------------|----------|
| Time-limited link | 72-hour expiry. Re-request via email. | ✓ |
| Unlimited downloads | Link never expires | |
| Download count limit | 3-5 downloads per purchase | |

**User's choice:** Time-limited link

| Option | Description | Selected |
|--------|-------------|----------|
| High-res PNG/JPEG | Standard print-quality formats | ✓ |
| Multiple formats | PNG, JPEG, and PDF per purchase | |
| You decide | Claude picks | |

**User's choice:** High-res PNG/JPEG

| Option | Description | Selected |
|--------|-------------|----------|
| Low-res preview only | Full resolution only after purchase | ✓ |
| Visible watermark | Full-size with watermark overlay | |
| No protection | Show full images | |

**User's choice:** Low-res preview only

---

## Claude's Discretion

- Product detail page layout and design
- Admin product form field design
- Cart UI component design
- Gift card email template visual design
- Order management table columns and filtering
- Flat shipping rate amount and free shipping threshold
- Product image upload flow in admin

## Deferred Ideas

- Inventory tracking — not enough volume per PROJECT.md
- Product reviews/ratings — v2 MKT-03
- Discount codes beyond gift cards
- Product bundles
- Subscription boxes
