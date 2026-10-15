# Noizy Hub Marketplace

Noizy Hub is a Next.js event ticketing and vendor marketplace application. It supports event discovery, ticket checkout, M-Pesa payments through Safaricom Daraja, ticket scanning, vendor applications, marketplace profiles, messaging, notifications, and Africa's Talking SMS notifications.

## Requirements

- Node.js 20 or newer
- npm
- PostgreSQL database
- Safaricom Daraja sandbox credentials for M-Pesa payments
- An Africa's Talking account for SMS

## Install

```powershell
npm install
npx prisma generate
```

Copy the environment template and fill in the values:

```powershell
Copy-Item .env.example .env
```

Never commit `.env`. It contains database credentials and private API keys.

## Environment Variables

Database and authentication:

```env
DATABASE_URL=
DIRECT_URL=
NEXTAUTH_URL=http://localhost:4000
NEXTAUTH_SECRET=
```

Application integrations:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
GMAIL_USER=
GMAIL_APP_PASSWORD=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
EMAIL_FROM_NAME=Noizy Hub
```

Ticket confirmation emails include the scannable QR inline and a link to the
online ticket. Configure Resend for production by verifying the sender domain
and publishing the SPF and DKIM records Resend provides, plus a DMARC policy.
Use a `RESEND_FROM_EMAIL` address on that verified domain; production refuses
to send through the Resend test sender domain or fall back to Gmail. Gmail SMTP
is available as a non-production fallback, but no sending method can guarantee inbox placement;
domain authentication, accurate recipient addresses, and recipient mail
provider filtering affect delivery. Failed Daraja ticket-email deliveries are
retried by the authenticated reconciliation cron, which runs once daily on
Vercel Hobby. Payment callbacks and checkout status checks still reconcile
payments as they happen; the daily cron handles older pending payments and
failed email deliveries that have not otherwise been retried.

Africa's Talking SMS:

```env
AT_API_KEY=
AT_USERNAME=sandbox
AT_SENDER_ID=
AT_ENVIRONMENT=sandbox
```

Use phone numbers in international format, for example `+2547XXXXXXXX`. The shared helper also normalizes common Kenyan formats. SMS failures are logged and do not block the main API response.

Safaricom Daraja:

```env
DARAJA_ENVIRONMENT=sandbox
DARAJA_CONSUMER_KEY=
DARAJA_CONSUMER_SECRET=
DARAJA_SHORTCODE=
DARAJA_PASSKEY=
DARAJA_CALLBACK_URL=https://YOUR_PUBLIC_DOMAIN/api/payment/webhook
DARAJA_B2C_SHORTCODE=
DARAJA_INITIATOR_NAME=
DARAJA_INITIATOR_PASSWORD=
DARAJA_CERTIFICATE=
DARAJA_QUEUE_TIMEOUT_URL=https://YOUR_PUBLIC_DOMAIN/api/payouts/timeout
DARAJA_B2C_RESULT_URL=https://YOUR_PUBLIC_DOMAIN/api/payouts/webhook
```

Use Safaricom sandbox credentials and public HTTPS callback URLs for sandbox testing. Set `DARAJA_ENVIRONMENT=live` only after sandbox collection and B2C payout checks pass and Safaricom has approved the live shortcode, passkey, initiator, and certificate.

Other security settings:

```env
ENCRYPTION_KEY=
TICKET_SIGNING_SECRET=
WAITLIST_MODE=false
CRON_SECRET=
```

Generate secrets with Node.js:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Local Development

Start the application on port 4000:

```powershell
npm run dev
```

Open <http://localhost:4000>.

Useful commands:

```powershell
npm run build
npm run lint
npx prisma validate
npx prisma migrate status
npx prisma generate
```

## Database Migrations

Apply committed migrations to a connected database:

```powershell
npx prisma migrate deploy
```

The reminder/SMS migration adds promo expiry support and the `EventReminder` idempotency table. The database must be reachable before running migrations.

## Daraja Sandbox Testing

Daraja callbacks need a publicly reachable callback URL. Use a secure HTTPS tunnel while testing locally.

1. Install ngrok if needed:

	```powershell
	winget install Ngrok.Ngrok
	```

2. Configure the ngrok token from the ngrok dashboard:

	```powershell
	ngrok config add-authtoken YOUR_REAL_NGROK_TOKEN
	```

3. Start the app:

	```powershell
	npm run dev
	```

4. In a second terminal, expose port 4000:

	```powershell
	ngrok http 4000
	```

5. Find the HTTPS forwarding URL in the ngrok terminal or at <http://127.0.0.1:4040>. It will look like:

	```text
	https://example.ngrok-free.app
	```

6. Set the URL in `.env` and restart Next.js:

	```env
	NEXT_PUBLIC_BASE_URL=https://example.ngrok-free.app
	```

7. Set the collection callback URL:

	```text
	https://example.ngrok-free.app/api/payment/webhook
	```

8. Set the B2C result URL to:

	```text
	https://example.ngrok-free.app/api/payouts/webhook
	```

9. Set the B2C queue-timeout URL to:

	```text
	https://example.ngrok-free.app/api/payouts/timeout
	```

Keep both terminals running. Update all three Daraja callback URLs whenever the tunnel address changes. Daraja live mode rejects non-HTTPS callback URLs.

## Payment Test Checklist

1. Confirm the app is running and the public URL is reachable.
2. Select a paid event and enter a sandbox-supported M-Pesa number.
3. Confirm the terminal logs the STK request.
4. Complete or reject the payment prompt.
5. Confirm the Daraja STK callback reaches `/api/payment/webhook` and is verified through the STK status query.
6. The checkout waits actively for up to 60 seconds. Stale requests are reconciled by Daraja status query; only a verified terminal failure fails the order and releases its attendee reservation. If Daraja has no final result, the payment stays pending and the buyer must not submit it again.
7. Confirm `/api/payment/status` changes the payment to `successful` or `failed` and the order state follows.
8. Confirm the ticket code is available and the SMS/email confirmation is sent.
9. Test an approved marketplace booking and vending slot payment.
10. Test B2C payout success and failure callbacks using separately funded organiser and vendor wallets.

For reminder endpoint testing, use:

```powershell
curl.exe -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:4000/api/reminders
```

The endpoint only sends reminders for confirmed orders attached to events beginning 24 to 25 hours from the current time. `EventReminder` prevents duplicate sends.

## Deployment

The project is configured for Vercel. Add all production environment variables in **Vercel → Project Settings → Environment Variables**. Set the production values for:

```env
NEXTAUTH_URL=https://YOUR_DOMAIN
NEXT_PUBLIC_BASE_URL=https://YOUR_DOMAIN
DARAJA_ENVIRONMENT=live
DARAJA_CALLBACK_URL=https://YOUR_DOMAIN/api/payment/webhook
DARAJA_QUEUE_TIMEOUT_URL=https://YOUR_DOMAIN/api/payouts/timeout
DARAJA_B2C_RESULT_URL=https://YOUR_DOMAIN/api/payouts/webhook
CRON_SECRET=YOUR_RANDOM_SECRET
```

Daraja pending-payment reconciliation runs daily at 06:00 UTC (09:00 East
Africa Time) and requires `CRON_SECRET` to be configured in the deployment
environment. The reminder cron runs at 05:00 UTC (08:00 East Africa Time).
Both schedules are once daily, as required by Vercel Hobby. Checkout status
checks and Daraja callbacks continue to handle payments outside the cron run.

Before deploying:

```powershell
npx prisma migrate deploy
npm run build
```

## Security Notes

- Never commit `.env` or paste credentials into source control.
- Rotate credentials immediately if they are exposed.
- Keep Daraja credentials, `DATABASE_URL`, `AT_API_KEY`, `CRON_SECRET`, and signing/encryption secrets private.
- Use sandbox credentials for development and live credentials only in production.
