import type { Adapter, AdapterAccount, AdapterUser, VerificationToken } from 'next-auth/adapters'
import { supabase } from '@/lib/supabase'

/**
 * NextAuth adapter backed by the `public` schema.
 *
 * Replaces @auth/supabase-adapter, which stores everything in a dedicated
 * `next_auth` schema. Supabase's REST API only serves schemas listed under
 * Project Settings → API → Exposed schemas, and `next_auth` is not on that list
 * by default — so every auth call failed with
 *
 *   PGRST106  Invalid schema: next_auth
 *
 * surfacing to the user as "Sign-in failed (Callback)". `public` is exposed on
 * every Supabase project, and the rest of this app already reads and writes it,
 * so storing auth rows there removes a dashboard setting from the set of things
 * that can break sign-in.
 *
 * Sessions are JWTs (see authOptions.session.strategy), so the session methods
 * below are never called. They are present because the Adapter type requires
 * them, and throw rather than silently returning null — a silent no-op would
 * turn a strategy misconfiguration into a confusing sign-in loop.
 */

const USERS = 'auth_users'
const ACCOUNTS = 'auth_accounts'
const TOKENS = 'auth_verification_tokens'

type UserRow = {
  id: string
  name: string | null
  email: string | null
  email_verified: string | null
  image: string | null
}

function toUser(row: UserRow): AdapterUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email as string,
    emailVerified: row.email_verified ? new Date(row.email_verified) : null,
    image: row.image,
  }
}

const USER_COLUMNS = 'id, name, email, email_verified, image'

const sessionsAreJWTs = (method: string): never => {
  throw new Error(
    `${method} was called, but sessions are JWTs — no database session should ever be created. ` +
    'Check authOptions.session.strategy.',
  )
}

export function PublicSchemaAdapter(): Adapter {
  return {
    async createUser(user: Omit<AdapterUser, 'id'>) {
      const { data, error } = await supabase
        .from(USERS)
        .insert({
          name:           user.name ?? null,
          email:          user.email,
          email_verified: user.emailVerified?.toISOString() ?? null,
          image:          user.image ?? null,
        })
        .select(USER_COLUMNS)
        .single()

      if (error) throw error
      return toUser(data as UserRow)
    },

    async getUser(id) {
      const { data, error } = await supabase
        .from(USERS).select(USER_COLUMNS).eq('id', id).maybeSingle()
      if (error) throw error
      return data ? toUser(data as UserRow) : null
    },

    async getUserByEmail(email) {
      const { data, error } = await supabase
        .from(USERS).select(USER_COLUMNS).eq('email', email).maybeSingle()
      if (error) throw error
      return data ? toUser(data as UserRow) : null
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const { data, error } = await supabase
        .from(ACCOUNTS)
        .select(`user:${USERS}(${USER_COLUMNS})`)
        .eq('provider', provider)
        .eq('provider_account_id', providerAccountId)
        .maybeSingle()

      if (error) throw error
      const user = (data as any)?.user
      return user ? toUser(user as UserRow) : null
    },

    async updateUser(user) {
      const row: Record<string, unknown> = {}
      if (user.name          !== undefined) row.name           = user.name
      if (user.email         !== undefined) row.email          = user.email
      if (user.image         !== undefined) row.image          = user.image
      if (user.emailVerified !== undefined) {
        row.email_verified = user.emailVerified?.toISOString() ?? null
      }

      const { data, error } = await supabase
        .from(USERS).update(row).eq('id', user.id!).select(USER_COLUMNS).single()

      if (error) throw error
      return toUser(data as UserRow)
    },

    async deleteUser(userId) {
      // auth_accounts cascades via its foreign key.
      const { error } = await supabase.from(USERS).delete().eq('id', userId)
      if (error) throw error
    },

    async linkAccount(account: AdapterAccount) {
      const { error } = await supabase.from(ACCOUNTS).insert({
        user_id:             account.userId,
        type:                account.type,
        provider:            account.provider,
        provider_account_id: account.providerAccountId,
        refresh_token:       account.refresh_token  ?? null,
        access_token:        account.access_token   ?? null,
        expires_at:          account.expires_at     ?? null,
        token_type:          account.token_type     ?? null,
        scope:               account.scope          ?? null,
        id_token:            account.id_token       ?? null,
        session_state:       (account.session_state as string | undefined) ?? null,
      })
      if (error) throw error
    },

    async unlinkAccount({ provider, providerAccountId }) {
      const { error } = await supabase
        .from(ACCOUNTS).delete()
        .eq('provider', provider)
        .eq('provider_account_id', providerAccountId)
      if (error) throw error
    },

    async createVerificationToken(token: VerificationToken) {
      const { error } = await supabase.from(TOKENS).insert({
        identifier: token.identifier,
        token:      token.token,
        expires:    token.expires.toISOString(),
      })
      if (error) throw error
      return token
    },

    /**
     * Consumes a magic-link token. Deleting and returning in one statement is
     * what makes the link single-use: a second click finds no row and next-auth
     * rejects it, so a link that leaks from an inbox after it has been used is
     * worthless.
     */
    async useVerificationToken({ identifier, token }) {
      const { data, error } = await supabase
        .from(TOKENS).delete()
        .eq('identifier', identifier)
        .eq('token', token)
        .select('identifier, token, expires')
        .maybeSingle()

      if (error) throw error
      if (!data) return null
      return {
        identifier: data.identifier,
        token:      data.token,
        expires:    new Date(data.expires),
      }
    },

    createSession:     () => sessionsAreJWTs('createSession'),
    getSessionAndUser: () => sessionsAreJWTs('getSessionAndUser'),
    updateSession:     () => sessionsAreJWTs('updateSession'),
    deleteSession:     () => sessionsAreJWTs('deleteSession'),
  }
}
