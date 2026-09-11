import Image from 'next/image'

// Intrinsic size of public/logo.png — the wordmark trimmed to its artwork.
const LOGO_W = 1024
const LOGO_H = 749

const SIZES = {
  sm: 'w-full max-w-[200px]', // sidebar brand block
  md: 'w-full max-w-[320px]', // login screen
} as const

export default function Logo({
  size = 'sm',
  alt = 'Girls next Door Talent Agency',
}: {
  size?: keyof typeof SIZES
  alt?: string
}) {
  return (
    <div
      className={`${SIZES[size]} rounded-xl bg-[#fdfcfb] ring-1 ring-brand-500/25 shadow-lg shadow-black/40 p-2.5 flex-shrink-0`}
    >
      <Image
        src="/logo.png"
        alt={alt}
        width={LOGO_W}
        height={LOGO_H}
        priority
        className="w-full h-auto"
      />
    </div>
  )
}
