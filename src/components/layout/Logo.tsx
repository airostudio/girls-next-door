import Image from 'next/image'

// Intrinsic size of public/logo.png — the wordmark trimmed to its artwork.
const LOGO_W = 1024
const LOGO_H = 772

const SIZES = {
  sm: 'w-full max-w-[200px]', // sidebar brand block
  md: 'w-full max-w-[320px]', // login screen
} as const

// The artwork is transparent and its "next door" lettering is ivory, so it's
// built to sit straight on the dark surface — no backing plate. That also
// means it needs a dark background to stay legible; the app icons composite it
// onto one for browser chrome that may not be dark.
export default function Logo({
  size = 'sm',
  alt = 'Girls next Door Talent Agency',
}: {
  size?: keyof typeof SIZES
  alt?: string
}) {
  return (
    <Image
      src="/logo.png"
      alt={alt}
      width={LOGO_W}
      height={LOGO_H}
      priority
      className={`${SIZES[size]} h-auto flex-shrink-0`}
    />
  )
}
