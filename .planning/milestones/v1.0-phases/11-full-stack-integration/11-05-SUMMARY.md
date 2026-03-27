# Plan 11-05 Summary: Stripe SetupIntents, Resend Bounce Webhook, Vercel Blob Client Uploads

## What was done

### Task 1: Stripe + Resend
- Added `createSetupIntent` and `listPaymentMethods` helpers to `src/lib/stripe.ts`
- Created `src/app/api/webhooks/resend/route.ts` for email bounce/complaint handling
- Added `RESEND_WEBHOOK_SECRET` to env validation
- Added `X-Entity-Ref-ID` idempotency headers to payment request and order confirmation emails

### Task 2: Vercel Blob Client Uploads
- Created `src/app/api/upload/token/route.ts` with `handleUpload` for client-side token generation
- Auth check ensures only staff can upload
- Switched `MediaUploader` from server-side `fetch('/api/upload')` to `@vercel/blob/client` direct upload
- Added `Progress` component for upload progress display
- Kept server-side upload endpoint as fallback

## Files Modified
- `src/lib/stripe.ts` (setupIntents + listPaymentMethods)
- `src/lib/env.ts` (RESEND_WEBHOOK_SECRET)
- `src/app/api/webhooks/resend/route.ts` (new)
- `src/lib/email/resend.ts` (idempotency headers)
- `src/app/api/upload/token/route.ts` (new)
- `src/components/dashboard/media-uploader.tsx` (client-side upload + progress)

## Commit
`f92f173` feat(11-05): Stripe setupIntents, Resend bounce webhook, Vercel Blob client uploads
