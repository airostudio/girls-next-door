'use client'

import { signOut } from 'next-auth/react'

/**
 * Signs out and returns to this site's own home page.
 *
 * Deliberately does NOT hand the destination to next-auth. Its default redirect
 * callback resolves any callbackUrl against NEXTAUTH_URL and discards one whose
 * origin doesn't match — so when that variable is wrong (pointed at the
 * Supabase URL, say) sign-out lands on whatever NEXTAUTH_URL names, and the
 * user sees a PostgREST "No API key found in request" page instead of the
 * login screen. Passing an absolute same-origin URL doesn't help: next-auth
 * replaces it with its own baseUrl.
 *
 * Clearing the session with redirect:false and then navigating ourselves keeps
 * the user on the domain they're actually browsing, whatever NEXTAUTH_URL says.
 *
 * NEXTAUTH_URL still has to be correct for OAuth callbacks and magic links —
 * this only makes sign-out independent of it.
 */
export async function signOutToHome(): Promise<void> {
  await signOut({ redirect: false })
  window.location.href = new URL('/', window.location.origin).toString()
}
