const SIZES = {
  sm: { box: 'w-9 h-9',  text: 'text-base' },
  md: { box: 'w-14 h-14', text: 'text-2xl' },
} as const

export default function Logo({ size = 'sm', mark = 'C' }: { size?: keyof typeof SIZES; mark?: string }) {
  const { box, text } = SIZES[size]
  return (
    <div className={`${box} rounded-lg border border-brand-500/50 bg-black flex items-center justify-center flex-shrink-0`}>
      <span className={`font-display ${text} font-semibold text-brand-400`}>{mark}</span>
    </div>
  )
}
