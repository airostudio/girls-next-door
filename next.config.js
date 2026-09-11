// A NEXTAUTH_URL that is *defined but blank* (easy to do in a hosting dashboard:
// add the variable, leave the value empty) crashes every page. next-auth builds
// its __NEXTAUTH config at import time via parseUrl(process.env.NEXTAUTH_URL),
// and parseUrl only defaults away null/undefined — "" falls through to
// new URL("") and throws TypeError [ERR_INVALID_URL] before any page renders.
// Unsetting a blank value restores the intended VERCEL_URL fallback.
if (typeof process.env.NEXTAUTH_URL === 'string' && process.env.NEXTAUTH_URL.trim() === '') {
  delete process.env.NEXTAUTH_URL
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
}

module.exports = nextConfig
