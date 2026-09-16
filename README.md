# Noizy Hub Marketplace

Noizy Hub is a Next.js event ticketing and vendor marketplace application. It supports event discovery, ticket checkout, M-Pesa payments through IntaSend, ticket scanning, vendor applications, marketplace profiles, messaging, notifications, and Africa's Talking SMS notifications.

## Requirements

- Node.js 20 or newer
- npm
- PostgreSQL database
- An IntaSend account for M-Pesa payments
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
```

Africa's Talking SMS:

```env
AT_API_KEY=
AT_USERNAME=sandbox
AT_SENDER_ID=
AT_ENVIRONMENT=sandbox
```

Use phone numbers in international format, for example `+2547XXXXXXXX`. The shared helper also normalizes common Kenyan formats. SMS failures are logged and do not block the main API response.

IntaSend payments:

```env
INTASEND_PUBLISHABLE_KEY=
INTASEND_SECRET_KEY=
INTASEND_TEST_MODE=true
INTASEND_WEBHOOK_CHALLENGE=
NEXT_PUBLIC_BASE_URL=http://localhost:4000
```

Use sandbox IntaSend keys with `INTASEND_TEST_MODE=true`. For live payments, use live keys, set `INTASEND_TEST_MODE=false`, and set `NEXT_PUBLIC_BASE_URL` to a public HTTPS URL.

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

## IntaSend Local Testing

IntaSend needs a public callback URL for payment status webhooks. Use ngrok while the local server is running.

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

7. Configure the IntaSend webhook endpoint as:

	```text
	https://example.ngrok-free.app/api/payment/webhook
	```

Keep both the Next.js and ngrok terminals running. The free ngrok URL may change when the tunnel restarts, so update `.env` and the IntaSend webhook whenever it changes.

## IntaSend Activation Pending

The IntaSend webhook URL has not yet been added because the IntaSend account activation is still pending.

After activation:

- Add the webhook URL in the correct IntaSend dashboard, sandbox or live:
  `https://YOUR_PUBLIC_DOMAIN/api/payment/webhook`
- Ensure the dashboard challenge matches `INTASEND_WEBHOOK_CHALLENGE`.
- Set `NEXT_PUBLIC_BASE_URL` to the deployed public HTTPS domain.
- Use live keys only after sandbox checkout and webhook delivery have been verified.

## Payment Test Checklist

1. Confirm the app is running and the public URL is reachable.
2. Select a paid event and enter a sandbox-supported M-Pesa number.
3. Confirm the terminal logs the STK request.
4. Complete or reject the payment prompt.
5. Confirm the IntaSend webhook reaches `/api/payment/webhook`.
6. Confirm `/api/payment/status` changes the order to `confirmed` or `failed`.
7. Confirm the ticket code is available and the SMS/email confirmation is sent.

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
INTASEND_TEST_MODE=false
CRON_SECRET=YOUR_RANDOM_SECRET
```

The daily reminder cron is configured in `vercel.json` for 05:00 UTC, which is 08:00 East Africa Time.

Before deploying:

```powershell
npx prisma migrate deploy
npm run build
```

## Security Notes

- Never commit `.env` or paste credentials into source control.
- Rotate credentials immediately if they are exposed.
- Keep `INTASEND_SECRET_KEY`, `DATABASE_URL`, `AT_API_KEY`, `CRON_SECRET`, and signing/encryption secrets private.
- Use sandbox credentials for development and live credentials only in production.
