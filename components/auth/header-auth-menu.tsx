'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LogIn, LogOut, User } from 'lucide-react'

interface Props {
  userEmail: string | null
}

export function HeaderAuthMenu({ userEmail }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    setIsLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
    setIsLoading(false)
  }

  if (!userEmail) {
    return (
      <Button
        asChild
        size="sm"
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Link href="/auth/login">
          <LogIn className="mr-2 h-4 w-4" />
          Login
        </Link>
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div className="hidden items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-1.5 sm:flex">
        <User className="h-4 w-4 text-slate-400" />
        <span className="max-w-[160px] truncate text-sm text-slate-200">{userEmail}</span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleLogout}
        disabled={isLoading}
        className="text-slate-300 hover:bg-slate-800 hover:text-white"
      >
        <LogOut className="mr-2 h-4 w-4" />
        {isLoading ? 'Signing out...' : 'Logout'}
      </Button>
    </div>
  )
}
