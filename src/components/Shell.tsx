import { LogOut, Plus, type LucideIcon } from 'lucide-react'
import { createContext, useContext, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { haptic } from '../lib/platform'
import { useStore } from '../lib/store'
import { Logo } from './Logo'
import { Avatar, cx, SoonBadge } from './ui'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  soon?: boolean
  end?: boolean
  mobile?: boolean // shown in the phone tab bar
  desktop?: boolean // shown in the desktop sidebar
}

interface ShellCtx {
  openCreate: () => void
}
const Ctx = createContext<ShellCtx>({ openCreate: () => {} })
export const useShell = () => useContext(Ctx)

/**
 * Responsive app frame.
 * - Phones/tablets: single column, bottom tab bar (optional centre "+" action).
 * - Desktop (lg+): left sidebar with the same destinations plus extras; content gets real width.
 */
export function Shell({
  items,
  extraItems = [],
  onCreate,
  createSheet,
  hideTabsOn,
  user,
  tag,
}: {
  items: NavItem[]
  extraItems?: NavItem[]
  onCreate?: () => void
  createSheet?: (open: boolean, close: () => void) => ReactNode
  hideTabsOn: (path: string) => boolean
  user: { name: string; sub: string; photo?: string }
  tag?: string
}) {
  const loc = useLocation()
  const nav = useNavigate()
  const { logout } = useStore()
  const [createOpen, setCreateOpen] = useState(false)
  const showTabs = !hideTabsOn(loc.pathname)
  const mobileItems = items.filter((i) => i.mobile !== false)
  const half = Math.ceil(mobileItems.length / 2)
  const openCreate = () => {
    haptic('light')
    if (onCreate) onCreate()
    else setCreateOpen(true)
  }

  return (
    <Ctx.Provider value={{ openCreate }}>
      <div className="min-h-full lg:flex">
        {/* Desktop sidebar */}
        <aside className="no-print sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
          <Logo tag={tag} className="px-2" />
          {createSheet && (
            <button
              onClick={openCreate}
              className="mt-7 flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand font-semibold text-white hover:bg-brand-ink cursor-pointer"
            >
              <Plus size={20} /> Create
            </button>
          )}
          <nav className="mt-6 flex flex-col gap-1">
            {items
              .filter((i) => i.desktop !== false)
              .map((i) => (
                <SideLink key={i.to} item={i} />
              ))}
          </nav>
          {extraItems.length > 0 && (
            <>
              <div className="mx-3 my-4 border-t border-line" />
              <nav className="flex flex-col gap-1">
                {extraItems.map((i) => (
                  <SideLink key={i.to} item={i} />
                ))}
              </nav>
            </>
          )}
          <div className="mt-auto flex items-center gap-3 rounded-2xl bg-bg p-3">
            <Avatar name={user.name} photo={user.photo} size={38} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-semibold">{user.name}</div>
              <div className="truncate text-[12px] text-muted">{user.sub}</div>
            </div>
            <button
              aria-label="Log out"
              title="Log out"
              onClick={() => {
                logout()
                nav('/welcome')
              }}
              className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface hover:text-ink cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          </div>
        </aside>

        {/* Content */}
        <main
          className={cx('min-w-0 flex-1 safe-top', showTabs ? 'pb-[calc(84px+env(safe-area-inset-bottom))] lg:pb-0' : '')}
          style={{ ['--tabbar-h' as string]: showTabs ? 'calc(76px + env(safe-area-inset-bottom))' : '0px' }}
        >
          <Outlet />
        </main>

        {/* Phone tab bar */}
        {showTabs && (
          <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur safe-bottom lg:hidden">
            <div className="mx-auto flex h-[76px] max-w-[520px] items-center px-2">
              {mobileItems.slice(0, half).map((i) => (
                <TabLink key={i.to} item={i} />
              ))}
              {createSheet && (
                <div className="flex flex-1 justify-center">
                  <button
                    aria-label="Create"
                    onClick={openCreate}
                    className="grid h-[54px] w-[54px] place-items-center rounded-full bg-brand text-white shadow-[0_6px_16px_rgba(31,92,78,0.35)] active:scale-95 transition-transform cursor-pointer"
                  >
                    <Plus size={26} />
                  </button>
                </div>
              )}
              {mobileItems.slice(half).map((i) => (
                <TabLink key={i.to} item={i} />
              ))}
            </div>
          </nav>
        )}
        {createSheet?.(createOpen, () => setCreateOpen(false))}
      </div>
    </Ctx.Provider>
  )
}

function TabLink({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) => cx('relative flex flex-1 flex-col items-center gap-1 pt-1 text-[12px]', isActive ? 'font-semibold text-brand' : 'text-muted')}
    >
      <span className="relative">
        <Icon size={23} strokeWidth={1.8} />
        {item.soon && (
          <span className="absolute -right-6 -top-2">
            <SoonBadge />
          </span>
        )}
      </span>
      {item.label}
    </NavLink>
  )
}

function SideLink({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cx(
          'flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors',
          isActive ? 'bg-brand-soft font-semibold text-brand' : 'text-ink hover:bg-bg',
        )
      }
    >
      <Icon size={20} strokeWidth={1.8} />
      <span className="flex-1">{item.label}</span>
      {item.soon && <SoonBadge />}
    </NavLink>
  )
}

/** Standard page container: phone-width on mobile, wide on desktop. */
export function Page({ children, wide, className }: { children: ReactNode; wide?: boolean; className?: string }) {
  return (
    <div className={cx('mx-auto w-full px-5 pt-5 lg:px-10 lg:pt-9', wide ? 'max-w-[480px] lg:max-w-[1120px]' : 'max-w-[480px] lg:max-w-[720px]', className)}>
      {children}
    </div>
  )
}
