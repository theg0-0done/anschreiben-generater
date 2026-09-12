# Gmail API Setup Guide

To enable automatic email sending in the application, you need to configure the Gmail API in Google Cloud and set up the corresponding environment variables.

## Step 1: Create a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown in the top left and select **New Project**.
3. Name it (e.g., "InvoApp Gmail") and click **Create**.

## Step 2: Enable the Gmail API
1. In your new project, go to **APIs & Services > Library** from the left menu.
2. Search for "Gmail API" and click on it.
3. Click the **Enable** button.

## Step 3: Configure the OAuth Consent Screen
1. Go to **APIs & Services > OAuth consent screen**.
2. Choose **External** user type and click **Create**.
3. Fill in the required fields:
   - App name: "InvoApp"
   - User support email: (Your email)
   - Developer contact email: (Your email)
4. Click **Save and Continue**.
5. On the **Scopes** screen, click **Add or Remove Scopes**.
6. Manually add the scope `https://www.googleapis.com/auth/gmail.send`. Click **Update**, then **Save and Continue**.
7. On the **Test users** screen, click **Add Users** and add your own Gmail address. (While in testing mode, only test users can authenticate). Click **Save and Continue**.

> **Note on "Testing" mode**: Apps in Testing mode have their refresh tokens expire every 7 days. You will need to re-authenticate weekly unless you publish the app (which requires verification). For personal use, the weekly re-auth is usually acceptable.

## Step 4: Create OAuth Credentials
1. Go to **APIs & Services > Credentials**.
2. Click **Create Credentials** at the top and select **OAuth client ID**.
3. Set the **Application type** to **Web application**.
4. Set a name (e.g., "Next.js App").
5. Under **Authorized redirect URIs**, click **Add URI** and enter:
   `http://localhost:3000/api/auth/callback`
   *(Note: When you deploy to production, you will need to add your production URL here as well, e.g., `https://your-app.com/api/auth/callback`)*
6. Click **Create**.
7. You will see a popup with your **Client ID** and **Client Secret**. Copy these!

## Step 5: Configure Environment Variables
Create a `.env.local` file in the root of your project (or use the provided `.env.example` as a template) and add the following:

```env
GOOGLE_CLIENT_ID=your_client_id_from_step_4
GOOGLE_CLIENT_SECRET=your_client_secret_from_step_4
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Generate a random 32+ character string for token encryption
GMAIL_COOKIE_SECRET=your_random_secret_here
```

To generate a random secret for `GMAIL_COOKIE_SECRET`, you can run this command in your terminal:
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## Step 6: Authenticate
1. Start your local development server (`npm run dev`).
2. Go to the dashboard. You should see a **"Mit Gmail verbinden"** button in the top right.
3. Click it, log in with your Gmail account, and grant the requested permissions.
4. If successful, you will be redirected back to the dashboard, and the badge will show **"Gmail ✅"**.
5. You can now use the "Bewerbung senden" button to automatically send emails with the generated PDF!
