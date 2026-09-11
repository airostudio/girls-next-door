'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, Users, Megaphone, DollarSign,
  Settings, LogOut, ChevronRight, Handshake,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Logo from '@/components/layout/Logo'

const nav = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/talent',      label: 'Talent Pool',  icon: Users },
  { href: '/clients',     label: 'Clients',      icon: Handshake },
  { href: '/marketing',   label: 'Marketing',    icon: Megaphone },
  { href: '/accounting',  label: 'Accounting',   icon: DollarSign },
  { href: '/settings',    label: 'Settings',     icon: Settings },
]

interface Props { agencyName: string }

export default function Sidebar({ agencyName }: Props) {
  const pathname = usePathname()

  return (
    <aside className="w-60 flex-shrink-0 bg-surface-card border-r border-surface-border flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="p-4 border-b border-surface-border">
        <Link href="/dashboard" className="block">
          <Logo size="sm" alt={agencyName} />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn('nav-link', active && 'active')}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-surface-border">
        <button
          onClick={() => signOut({ callbackUrl: '/auth/login' })}
          className="nav-link w-full text-red-400 hover:text-red-300 hover:bg-red-400/10"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
