import { NextAuthOptions } from 'next-auth'
import type { Adapter } from 'next-auth/adapters'
import GoogleProvider from 'next-auth/providers/google'
import EmailProvider from 'next-auth/providers/email'
import CredentialsProvider from 'next-auth/providers/credentials'
import { SupabaseAdapter } from '@auth/supabase-adapter'
import nodemailer from 'nodemailer'
import { createHash, timingSafeEqual } from 'crypto'
import { resolveAccess, normalizeEmail, getStaffByEmail } from '@/lib/rbac'
import { verifyPassword } from '@/lib/password'
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
      // as an existing account (e.g. a magic link first, then Google later) throws
      // OAuthAccountNotLinked instead of just linking it. Since the staff
      // table is already the real access gate, trusting the email match here
      // is safe for this app.
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
    // Email + password sign-in for staff. Two sources of truth, in order:
    //
    //   1. staff.password_hash — set by an admin from Settings > Team. This is
    //      the normal path for everyone on the team.
    //   2. ADMIN_EMAIL / ADMIN_PASSWORD env vars — a permanent break-glass
    //      account that works before anyone exists in `staff`, and still works
    //      if the database is unreachable. Keep that password strong.
    //
    // Every failure returns the same null, and a wrong email still does the
    // full key derivation, so neither the response nor its timing reveals
    // whether an address is on the team.
    CredentialsProvider({
      id: 'password',
      name: 'Email and password',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const submitted = normalizeEmail(credentials?.email ?? '')
        const password  = credentials?.password
        if (!submitted || !password) return null

        const adminEmail    = process.env.ADMIN_EMAIL
        const adminPassword = process.env.ADMIN_PASSWORD
        const normalizedAdmin = adminEmail ? normalizeEmail(adminEmail) : null

        if (normalizedAdmin && submitted === normalizedAdmin && adminPassword) {
          // Env-var credential, so there's no stored hash to verify against —
          // a fixed-length digest comparison is the right tool here.
          return safeEqual(password, adminPassword)
            ? { id: adminEmail!, email: adminEmail!, name: 'Admin' }
            : null
        }

        const staff = await getStaffByEmail(submitted)
        const ok = await verifyPassword(password, staff?.password_hash)
        if (!ok || !staff || staff.status !== 'ACTIVE') return null

        return { id: staff.id, email: staff.email, name: staff.name ?? staff.email }
      },
    }),
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
