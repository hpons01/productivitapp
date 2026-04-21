# Auth and Supabase Setup

## Quick setup

1. Run:
   npm run setup:dev
2. Open .env and fill:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
3. Start the app:
   npm run dev

## Supabase dashboard setup

1. Create a new Supabase project.
2. In Project Settings -> API:
   - Copy Project URL to SUPABASE_URL.
   - Copy anon public key to SUPABASE_ANON_KEY.
3. In Authentication -> Providers:
   - Enable Google.
   - Configure Google OAuth client id/secret.
4. In Authentication -> URL Configuration:
   - Add redirect URL: productivitapp://auth/callback

## Remote database setup (profiles)

1. Install Supabase CLI locally.
2. Link project:
   supabase link --project-ref <project-ref>
3. Apply migrations:
   supabase db push
4. Confirm in SQL editor:
   - public.profiles exists
   - RLS enabled
   - profile policies are present

## Edge Function setup (account deletion)

1. Deploy function:
   supabase functions deploy delete-user-account
2. Add required function secrets:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
3. Verify endpoint is available:
   /functions/v1/delete-user-account

## Registration model

Registration is OAuth-first:
- A user account is created in auth.users by Supabase on first successful Google sign-in.
- A profile row is auto-created in public.profiles via database trigger.
- The desktop app stores only session tokens in OS keychain and user metadata locally.

## Next steps for full account lifecycle

1. Add first-login profile completion (display name) in renderer.
2. Add account deletion flow via a server-side Edge Function.
3. Add global session revocation UI (sign out all devices).
4. Add cloud sync strategy for local productivity tables (separate phase).
