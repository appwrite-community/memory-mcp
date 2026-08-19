import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { ArrowRight } from 'lucide-react'
import { login, signup } from '../lib/auth'
import { inputClass, primaryButtonClass } from './shell'

/** Sign-in / sign-up card. Calls `onDone` once a session exists. */
export function AuthCard({
  subtitle,
  onDone,
}: {
  subtitle: string
  onDone: () => Promise<void> | void
}) {
  const doLogin = useServerFn(login)
  const doSignup = useServerFn(signup)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <div className="rounded-2xl bg-white p-8 shadow-xl shadow-slate-900/[0.06] ring-1 ring-slate-200/70">
      <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">
        {mode === 'login' ? 'Sign in to Recall' : 'Create your Recall account'}
      </h1>
      <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>

      <form
        className="mt-7 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setError('')
          try {
            if (mode === 'login') await doLogin({ data: { email, password } })
            else await doSignup({ data: { email, password, name } })
            await onDone()
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
            setBusy(false)
          }
        }}
      >
        {mode === 'signup' && (
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Maya Chen"
            />
          </label>
        )}
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="••••••••"
          />
        </label>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className={`${primaryButtonClass} w-full`}>
          {busy ? 'One moment…' : 'Continue'}
          {!busy && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        {mode === 'login' ? 'New to Recall? ' : 'Already have an account? '}
        <button
          type="button"
          className="font-medium text-teal-600 hover:underline"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        >
          {mode === 'login' ? 'Create an account' : 'Sign in'}
        </button>
      </p>
    </div>
  )
}
