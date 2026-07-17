'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Wallet,
  Users,
  FileText,
  Home,
} from 'lucide-react'

const LINKS = [
  { href: '/accounting', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/outstanding', label: 'Outstanding', icon: Wallet },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/invoices', label: 'Invoices', icon: FileText },
]

export function AccountingNav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b bg-slate-900 text-white shadow-lg">
      <div className="mx-auto max-w-[1400px] flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/80">
              <Wallet className="h-5 w-5" />
            </span>
            <span className="hidden sm:inline">Accounting</span>
          </Link>
          <nav className="flex items-center gap-1">
            {LINKS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                    active
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <Home className="h-4 w-4" />
          <span className="hidden sm:inline">Fleet Home</span>
        </Link>
      </div>
    </header>
  )
}
