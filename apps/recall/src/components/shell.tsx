import { Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { LogOut } from 'lucide-react'
import { logout } from '../lib/auth'
import { RecallLogo } from './logos'

/** Header + content frame for signed-in pages. */
export function AppShell({
  email,
  children,
}: {
  email: string
  children: React.ReactNode
}) {
  const doLogout = useServerFn(logout)
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-6 px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <RecallLogo className="h-6 w-6" />
            <span className="text-[15px] font-semibold tracking-tight">Recall</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              to="/"
              className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100 [&.active]:bg-slate-100 [&.active]:text-slate-900"
              activeOptions={{ exact: true }}
            >
              Memories
            </Link>
            <Link
              to="/connections"
              className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100 [&.active]:bg-slate-100 [&.active]:text-slate-900"
            >
              Connected apps
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-slate-500">
            <span className="hidden sm:inline">{email}</span>
            <button
              type="button"
              onClick={() => doLogout()}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-slate-600 hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
    </div>
  )
}

/** Centered card frame for sign-in and consent pages. */
export function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-teal-300/30 blur-3xl" />
      <div className="relative w-full max-w-[26rem]">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <RecallLogo className="h-7 w-7" />
          <span className="text-[15px] font-semibold tracking-tight text-slate-900">Recall</span>
        </div>
        {children}
      </div>
    </div>
  )
}

export const inputClass =
  'mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100'

export const primaryButtonClass =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white shadow-lg shadow-teal-600/20 transition hover:bg-teal-700 disabled:opacity-60'

export const secondaryButtonClass =
  'inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60'
