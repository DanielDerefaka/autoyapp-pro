'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { 
  Home, 
  Users, 
  BarChart3, 
  Clock, 
  FileText,
  Settings,
  X,
  Zap,
  MessageSquare,
  Bot,
  PenTool,
  Calendar,
  Sparkles,
  User
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Compose', href: '/compose', icon: PenTool },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Feeds', href: '/feeds', icon: MessageSquare },
  { name: 'Autopilot', href: '/autopilot', icon: Bot },
  { name: 'Target Users', href: '/target-users', icon: Users },
  { name: 'My Analysis', href: '/user-feed', icon: User },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Queue Manager', href: '/queue-manager', icon: Clock },
  { name: 'Templates', href: '/templates', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
]

interface SidebarProps {
  open: boolean
  setOpen: (open: boolean) => void
}

export function Sidebar({ open, setOpen }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile sidebar */}
      <Transition.Root show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/20" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <button
                    type="button"
                    className="-m-2.5 p-2.5 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    <span className="sr-only">Close sidebar</span>
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>

                <div className="flex grow flex-col gap-y-6 overflow-y-auto bg-sidebar border-r border-sidebar-border px-6 pb-6 glass">
                  <div className="flex h-20 shrink-0 items-center">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary rounded-xl">
                        <Sparkles className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <span className="text-xl font-semibold text-sidebar-foreground">AutoYapp Pro</span>
                    </div>
                  </div>
                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-2">
                      <li>
                        <ul role="list" className="space-y-1">
                          {navigation.map((item) => (
                            <li key={item.name}>
                              <Link
                                href={item.href}
                                className={cn(
                                  pathname === item.href
                                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                                  'group flex gap-x-3 rounded-xl p-3 text-sm font-medium transition-all duration-200 hover:scale-[1.02]'
                                )}
                              >
                                <item.icon
                                  className={cn(
                                    pathname === item.href ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-sidebar-accent-foreground',
                                    'h-5 w-5 shrink-0'
                                  )}
                                />
                                {item.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>
                    </ul>
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-80 lg:flex-col">
        <div className="flex grow flex-col gap-y-6 overflow-y-auto border-r border-sidebar-border bg-sidebar px-6 pb-6 glass">
          <div className="flex h-20 shrink-0 items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary rounded-xl shadow-lg shadow-primary/25">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold text-sidebar-foreground">AutoYapp Pro</span>
            </div>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-2">
              <li>
                <ul role="list" className="space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          pathname === item.href
                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                          'group flex gap-x-3 rounded-xl p-3 text-sm font-medium transition-all duration-200 hover:scale-[1.02] focus-ring'
                        )}
                      >
                        <item.icon
                          className={cn(
                            pathname === item.href ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-sidebar-accent-foreground',
                            'h-5 w-5 shrink-0'
                          )}
                        />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </>
  )
}