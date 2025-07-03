'use client'

import { Menu, Search, Bell, Moon, Sun } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void
}

export function Header({ setSidebarOpen }: HeaderProps) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  
  // Get page title from pathname
  const getPageTitle = (path: string) => {
    const segments = path.split('/').filter(Boolean)
    if (segments.length === 0 || segments[0] === 'dashboard') return 'Dashboard'
    
    const titles: { [key: string]: string } = {
      'target-users': 'Target Users',
      'analytics': 'Analytics',
      'queue-manager': 'Queue Manager',
      'templates': 'Templates',
      'settings': 'Settings',
      'compose': 'Compose',
      'calendar': 'Calendar',
      'feeds': 'Feeds',
      'autopilot': 'Autopilot'
    }
    
    return titles[segments[0]] || segments[0].charAt(0).toUpperCase() + segments[0].slice(1)
  }

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-card/80 backdrop-blur-xl px-4 sm:gap-x-6 sm:px-6 lg:px-8">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-muted-foreground lg:hidden hover:text-foreground transition-colors rounded-lg hover:bg-accent focus-ring"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-5 w-5" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-border lg:hidden" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* Page title */}
        <div className="flex flex-1 items-center">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {getPageTitle(pathname)}
          </h1>
        </div>
        
        <div className="flex items-center gap-x-3">
          {/* Search */}
          <Button
            variant="ghost"
            size="sm"
            className="relative h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <Search className="h-4 w-4" />
            <span className="sr-only">Search</span>
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            className="relative h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full animate-pulse"></span>
            <span className="sr-only">Notifications</span>
          </Button>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          
          {/* User menu */}
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-9 w-9 rounded-full border border-border shadow-sm",
                userButtonPopoverCard: "border border-border shadow-xl glass",
                userButtonPopoverActionButton: "hover:bg-accent text-foreground hover:text-accent-foreground rounded-lg",
                userButtonPopoverActionButtonText: "text-sm font-medium",
                userButtonPopoverFooter: "hidden"
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}