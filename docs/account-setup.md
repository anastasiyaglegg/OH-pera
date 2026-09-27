# OH-pera account backend setup

The account interface uses Supabase Auth for Google and email/password sign-in.

## 1. Create the Supabase project

1. Create a project at <https://database.new/>.
2. In the project dashboard, open **Connect** and copy the Project URL and publishable key.
3. Create `.env.local` in the repository root using `.env.example` as the template:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
   ```

Never add the service-role or secret key to a `NEXT_PUBLIC_` variable.

## 2. Configure email/password accounts

1. Open **Authentication → Providers → Email** and enable Email.
2. Keep email confirmation enabled for real users.
3. Under **Authentication → URL Configuration**, set the production Site URL when deployed.
4. Add `http://localhost:3000/**` and the production URL to the redirect allow list.

## 3. Configure Google

1. In Google Cloud, configure the OAuth consent screen and create a Web OAuth client.
2. Add the Supabase callback URL shown under **Authentication → Providers → Google** as an authorized redirect URI. It has the form `https://PROJECT_REF.supabase.co/auth/v1/callback`.
3. Paste the Google client ID and secret into the Supabase Google provider and enable it.

## 4. Restart and verify

Restart the development server after creating `.env.local`, then test account creation, email confirmation, login, Google login, sign-out, and invalid-password errors.

Supabase does not provide a built-in ChatGPT/OpenAI social provider. Do not label another authentication flow “Log in with ChatGPT” unless OpenAI supplies a standards-compliant identity provider and the application is registered for it.
