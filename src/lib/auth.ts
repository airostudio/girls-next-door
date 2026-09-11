import { NextAuthOptions } from 'next-auth'
import type { Adapter } from 'next-auth/adapters'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import EmailProvider from 'next-auth/providers/email'
import CredentialsProvider from 'next-auth/providers/credentials'
import { SupabaseAdapter } from '@auth/supabase-adapter'
import nodemailer from 'nodemailer'
import { createHash, timingSafeEqual } from 'crypto'
import { resolveAccess, normalizeEmail } from '@/lib/rbac'
import { getAgencyBranding } from '@/lib/agency'

// Fixed-length digest comparison so a mismatched-length input can't short-circuit
// timingSafeEqual (which throws on unequal-length buffers) or leak length via timing.
function safeEqual(a: string, b: string): boolean {
  const digestA = createHash('sha256').update(a).digest()
  const digestB = createHash('sha256').update(b).digest()
  return timingSafeEqual(digestA, digestB)
}

// SupabaseAdapter() constructs its client eagerly, which throws at build time
// (and at every cold import) if the Supabase env vars aren't set yet — same
// class of bug as the plain Supabase client in src/lib/supabase.ts. Deferring
// construction until NextAuth actually calls an adapter method keeps module
// import side-effect-free.
let _adapter: Adapter | null = null
function getAdapter(): Adapter {
  if (!_adapter) {
    _adapter = SupabaseAdapter({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    })
  }
  return _adapter
}

const lazyAdapter = new Proxy({} as Adapter, {
  get(_, prop) {
    return (getAdapter() as any)[prop]
  },
})

export const authOptions: NextAuthOptions = {
  adapter: lazyAdapter,
  // Credentials logins always issue a JWT regardless of this setting — with
  // strategy 'database' they'd appear to succeed but the session cookie
  // wouldn't match anything in next_auth.sessions on the next request, so
  // the admin would just get bounced back to login. OAuth/Email still work
  // fine under 'jwt': the adapter still persists their users/accounts and
  // verification tokens either way, only the session cookie format changes.
  session: { strategy: 'jwt' },
  pages: { signIn: '/auth/login' },
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Without this, signing in with a second provider under the same email
      // as an existing account (e.g. Google first, then GitHub later) throws
      // OAuthAccountNotLinked instead of just linking it. Since the staff
      // table is already the real access gate, trusting the email match here
      // is safe for this app.
      allowDangerousEmailAccountLinking: true,
    }),
    GitHubProvider({
      clientId:     process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from:   process.env.EMAIL_FROM,
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
    }),
    // Admin-only password login for testing, alongside the OAuth/magic-link
    // flows above. Backed by a single fixed credential pair in env vars —
    // not a per-user password table — since this exists purely so one person
    // can get in without depending on OAuth or an email service being wired
    // up correctly.
    CredentialsProvider({
      name: 'Admin password',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const adminEmail    = process.env.ADMIN_EMAIL
        const adminPassword = process.env.ADMIN_PASSWORD
        if (!adminEmail || !adminPassword) return null
        if (!credentials?.email || !credentials?.password) return null

        const submitted = normalizeEmail(credentials.email)
        const expected   = normalizeEmail(adminEmail)
        if (!submitted || !expected) return null

        const emailMatches    = safeEqual(submitted, expected)
        const passwordMatches = safeEqual(credentials.password, adminPassword)
        if (!emailMatches || !passwordMatches) return null

        return { id: adminEmail, email: adminEmail, name: 'Admin' }
      },
    }),
  ],
  callbacks: {
    // Resolves the role here and stashes it on the same `user` object that
    // the jwt callback receives next (same reference — mutating it is how
    // data flows from signIn into jwt in NextAuth v4), so this stays a single
    // access-control lookup per sign-in rather than repeating it per callback.
    async signIn({ user }) {
      const { allowed, role } = await resolveAccess(user.email)
      if (allowed) (user as any).role = role
      return allowed
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.role = (user as any).role
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
        ;(session.user as any).role = token.role
      }
      return session
    },
  },
}
