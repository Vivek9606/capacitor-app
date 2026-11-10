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
        <aside className="no-print sticky top-0 hidden h-screen w-[268px] shrink-0 flex-col border-r border-line/70 bg-glass px-4 py-6 lg:flex">
          <Logo tag={tag} className="px-2" />
          {createSheet && (
            <button
              onClick={openCreate}
              className="pressable mt-7 flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#7a2a6c] to-brand font-semibold text-white shadow-brand hover:to-brand-ink cursor-pointer"
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
          <div className="mt-auto flex items-center gap-3 rounded-2xl border border-line/70 bg-surface p-3 shadow-card">
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
          className={cx('min-w-0 flex-1 safe-top', showTabs ? 'pb-[calc(96px+env(safe-area-inset-bottom))] lg:pb-0' : '')}
          style={{ ['--tabbar-h' as string]: showTabs ? 'calc(80px + env(safe-area-inset-bottom))' : '0px' }}
        >
          <div key={loc.pathname} className="anim-page">
            <Outlet />
          </div>
        </main>

        {/* Phone tab bar */}
        {showTabs && (
          <nav className="no-print fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(10px,env(safe-area-inset-bottom))] lg:hidden">
            <div className="bg-glass mx-auto flex h-[66px] max-w-[520px] items-center rounded-[26px] border border-white/70 px-1.5 shadow-float">
              {mobileItems.slice(0, half).map((i) => (
                <TabLink key={i.to} item={i} />
              ))}
              {createSheet && (
                <div className="flex flex-1 justify-center">
                  <button
                    aria-label="Create"
                    onClick={openCreate}
                    className="pressable grid h-[52px] w-[52px] -translate-y-3 place-items-center rounded-[18px] bg-gradient-to-br from-brand-bright to-brand text-white shadow-brand ring-4 ring-bg cursor-pointer hover:rotate-90 transition-transform duration-300"
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
      className={({ isActive }) => cx('group relative flex flex-1 flex-col items-center gap-0.5 text-[11px] transition-colors', isActive ? 'font-bold text-brand' : 'font-medium text-muted')}
    >
      {({ isActive }) => (
        <>
      <span className={cx('relative grid h-8 w-14 place-items-center rounded-full transition-all duration-300', isActive ? 'bg-brand-soft' : 'group-active:scale-90')}>
        <Icon size={21} strokeWidth={isActive ? 2.3 : 1.8} className={cx('transition-transform duration-300', isActive && 'scale-105')} />
        {item.soon && (
          <span className="absolute -right-6 -top-2">
            <SoonBadge />
          </span>
        )}
      </span>
      {item.label}
        </>
      )}
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
          'flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-all duration-200',
          isActive ? 'bg-brand-soft font-bold text-brand shadow-[inset_3px_0_0_var(--color-brand)]' : 'font-medium text-ink/80 hover:bg-bg hover:text-ink hover:translate-x-0.5',
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
    <div className={cx('stagger mx-auto w-full px-5 pt-5 lg:px-10 lg:pt-9', wide ? 'max-w-[480px] lg:max-w-[1120px]' : 'max-w-[480px] lg:max-w-[720px]', className)}>
      {children}
    </div>
  )
}
