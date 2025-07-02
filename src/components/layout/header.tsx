'use client'

import { Menu } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void
}

export function Header({ setSidebarOpen }: HeaderProps) {
  const pathname = usePathname()
  
  // Get page title from pathname
  const getPageTitle = (path: string) => {
    const segments = path.split('/').filter(Boolean)
    if (segments.length === 0 || segments[0] === 'dashboard') return 'Dashboard'
    
    const titles: { [key: string]: string } = {
      'target-users': 'Target Users',
      'analytics': 'Analytics',
      'queue-manager': 'Queue Manager',
      'templates': 'Templates',
      'settings': 'Settings'
    }
    
    return titles[segments[0]] || segments[0].charAt(0).toUpperCase() + segments[0].slice(1)
  }

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-100 bg-white px-4 sm:gap-x-6 sm:px-6 lg:px-8">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-gray-700 lg:hidden hover:text-black transition-colors"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-gray-100 lg:hidden" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* Page title */}
        <div className="flex flex-1 items-center">
          <h1 className="text-xl font-semibold text-black">
            {getPageTitle(pathname)}
          </h1>
        </div>
        
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* User menu */}
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-8 w-8 rounded-full border border-gray-200",
                userButtonPopoverCard: "border border-gray-100 shadow-lg",
                userButtonPopoverActionButton: "hover:bg-gray-50 text-gray-700 hover:text-black",
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