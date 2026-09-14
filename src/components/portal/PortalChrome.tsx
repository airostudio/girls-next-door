'use client'

import Logo from '@/components/layout/Logo'
import { signOutToHome } from '@/lib/siteUrl'
import { LogOut, Sparkles, Camera } from 'lucide-react'

/**
 * Frame for the member area. Deliberately its own chrome rather than the
 * agency sidebar: a model or supplier should never see the CRM's navigation,
 * even greyed out, because it advertises pages they cannot open.
 */
export default function PortalChrome({
  agencyName, accountType, name, children,
}: {
  agencyName: string
  accountType: 'TALENT' | 'SUPPLIER'
  name: string
  children: React.ReactNode
}) {
  const Icon = accountType === 'TALENT' ? Sparkles : Camera
  const label = accountType === 'TALENT' ? 'Model' : 'Supplier'

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-surface-border bg-surface-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="w-[150px] flex-shrink-0">
            <Logo alt={agencyName} />
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm text-stone-100 leading-tight">{name}</div>
              <div className="text-[10px] text-brand-500/90 uppercase tracking-widest flex items-center gap-1 justify-end mt-0.5">
                <Icon className="w-3 h-3" /> {label}
              </div>
            </div>
            <button
              onClick={() => signOutToHome()}
              className="text-stone-500 hover:text-red-400 transition-colors p-2"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
