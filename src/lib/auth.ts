import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import EmailProvider from 'next-auth/providers/email'
import CredentialsProvider from 'next-auth/providers/credentials'
import nodemailer from 'nodemailer'
import { resolveAccess, normalizeEmail } from '@/lib/rbac'
import { PublicSchemaAdapter } from '@/lib/authAdapter'
import { createHash, timingSafeEqual } from 'crypto'
import { getAgencyBranding } from '@/lib/agency'

/**
 * Fixed-length digest comparison, so a mismatched-length input can't
 * short-circuit timingSafeEqual (which throws on unequal-length buffers) or
 * leak length through timing.
 */
function safeEqual(a: string, b: string): boolean {
  const digestA = createHash('sha256').update(a).digest()
  const digestB = createHash('sha256').update(b).digest()
  return timingSafeEqual(digestA, digestB)
}

/** True when the break-glass admin credential is configured. */
export function breakGlassEnabled(): boolean {
  return Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD)
}

/** True when EMAIL_SERVER and EMAIL_FROM are both set, so magic links can send. */
export function emailSignInEnabled(): boolean {
  return Boolean(process.env.EMAIL_SERVER && process.env.EMAIL_FROM)
}

export const authOptions: NextAuthOptions = {
  // Stores users, linked accounts and magic-link tokens in the `public`
  // schema. The previous @auth/supabase-adapter used a dedicated `next_auth`
  // schema, which Supabase does not expose over its REST API by default —
  // every auth call failed with "PGRST106 Invalid schema: next_auth", which the
  // user only ever saw as "Sign-in failed (Callback)". `public` is exposed
  // everywhere and the rest of the app already uses it.
  adapter: PublicSchemaAdapter(),
  // Credentials logins always issue a JWT regardless of this setting — with
  // strategy 'database' they'd appear to succeed but the session cookie
  // wouldn't match anything in auth_sessions on the next request, so
  // the admin would just get bounced back to login. OAuth/Email still work
  // fine under 'jwt': the adapter still persists their users/accounts and
  // verification tokens either way, only the session cookie format changes.
  session: {
    strategy: 'jwt',
    // 24 hours rather than next-auth's 30-day default. This app exposes the
    // agency's finances, so a stolen or forgotten session shouldn't stay valid
    // for a month; with Google SSO, signing back in is one click.
    maxAge: 24 * 60 * 60,
    updateAge: 60 * 60,
  },
  pages: { signIn: '/auth/login' },
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Without this, signing in with a second provider under the same email
      // as an existing account (e.g. a magic link first, then Google later) throws
      // OAuthAccountNotLinked instead of just linking it. Since the staff
      // table is already the real access gate, trusting the email match here
      // is safe for this app.
      allowDangerousEmailAccountLinking: true,
      // Always show the account chooser. Without it Google silently reuses
      // whichever account the browser is already signed into, which on a shared
      // machine signs the previous person back in.
      authorization: { params: { prompt: 'select_account' } },
    }),
    // Registered only when a mail transport is configured. Without it,
    // nodemailer.createTransport(undefined) throws inside
    // sendVerificationRequest and /api/auth/signin/email returns a 500 with an
    // empty body, which the client then fails to parse — the user just sees
    // "Sending…" forever. Not offering the option at all is the honest
    // behaviour.
    ...(emailSignInEnabled() ? [EmailProvider({
      server: process.env.EMAIL_SERVER,
      from:   process.env.EMAIL_FROM,
      // 15 minutes, not next-auth's 24-hour default. A sign-in link sitting in
      // an inbox is a bearer credential for this whole app; a day is far longer
      // than anyone needs to click it, and long enough for a forwarded or
      // synced mailbox to leak one.
      maxAge: 15 * 60,
      // Gate the actual send on the allow-list ourselves. NextAuth's default
      // flow would email anyone who types a request in, before it ever knows
      // whether that email will pass the signIn callback below — that's both
      // an open mail-relay (arbitrary inboxes get "sign in to Clarity 4K"
      // messages) and an oracle for probing who's on staff. Silently no-op-ing
      // for disallowed emails means the UI always shows the same "check your
      // inbox" response either way.
      async sendVerificationRequest({ identifier, url }) {
        const { allowed } = await resolveAccess(identifier)
        if (!allowed) return

        const { agencyName } = await getAgencyBranding()
        const transport = nodemailer.createTransport(process.env.EMAIL_SERVER)
        await transport.sendMail({
          to: identifier,
          from: process.env.EMAIL_FROM,
          subject: `Sign in to ${agencyName}`,
          text: `Sign in to ${agencyName}\n\n${url}\n\nThis link expires in 24 hours. If you didn't request it, ignore this email.`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2 style="color: #1f2937;">Sign in to ${agencyName}</h2>
              <p style="color: #4b5563;">Click the button below to sign in. This link expires in 24 hours.</p>
              <a href="${url}" style="display: inline-block; background: #c8912a; color: #000; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
                Sign in to ${agencyName}
              </a>
              <p style="color: #9ca3af; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
          `,
        })
      },
    })] : []),
    // Break-glass admin. Deliberately the ONLY password in the system: it lives
    // in env vars, so there is no password column, no stored hash, and nothing
    // to leak from the database or reset through the UI. It exists so a fresh
    // install, an unreachable database, a broken Google config or an unset mail
    // server can never lock everyone out.
    //
    // Keep ADMIN_PASSWORD strong — anyone holding it has full access.
    ...(breakGlassEnabled() ? [CredentialsProvider({
      id: 'breakglass',
      name: 'Admin access',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const submitted = normalizeEmail(credentials?.email ?? '')
        const password  = credentials?.password
        const adminEmail    = process.env.ADMIN_EMAIL!
        const adminPassword = process.env.ADMIN_PASSWORD!
        const expected = normalizeEmail(adminEmail)

        if (!submitted || !password || !expected) return null

        // Compare both halves every time, and never reveal which one failed.
        const emailOk    = safeEqual(submitted, expected)
        const passwordOk = safeEqual(password, adminPassword)
        if (!emailOk || !passwordOk) return null

        return { id: adminEmail, email: adminEmail, name: 'Admin' }
      },
    })] : []),
  ],
  callbacks: {
    // Resolves the role here and stashes it on the same `user` object that
    // the jwt callback receives next (same reference — mutating it is how
    // data flows from signIn into jwt in NextAuth v4), so this stays a single
    // access-control lookup per sign-in rather than repeating it per callback.
    async signIn({ user }) {
      const { allowed, role, accountType } = await resolveAccess(user.email)
      if (allowed) {
        ;(user as any).role = role
        ;(user as any).accountType = accountType
      }
      return allowed
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.role = (user as any).role
        token.accountType = (user as any).accountType
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
        ;(session.user as any).role = token.role
        ;(session.user as any).accountType = token.accountType
      }
      return session
    },
  },
}
