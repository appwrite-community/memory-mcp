import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Check, Lock } from 'lucide-react'
import { SCOPE_LABELS, approveGrant, loadConsent, rejectGrant, type ConsentView } from '../lib/oauth'
import { AuthCard } from '../components/auth-card'
import { ClientMark, RecallLogo } from '../components/logos'
import { CardShell, primaryButtonClass, secondaryButtonClass } from '../components/shell'

export const Route = createFileRoute('/oauth/consent')({
  loader: () => loadConsent(),
  component: Consent,
})

function Consent() {
  const data = Route.useLoaderData()
  const router = useRouter()
  return (
    <CardShell>
      {data.view === 'login' ? (
        <AuthCard
          subtitle="Sign in to continue to the app that sent you here."
          // Re-run the loader: it now finds the session and resumes the
          // authorization request it saved before sign-in.
          onDone={() => router.invalidate()}
        />
      ) : (
        <ConsentCard data={data} />
      )}
      <p className="mt-6 text-center text-xs text-slate-400">Protected by Recall · OAuth 2.0</p>
    </CardShell>
  )
}

function ConsentCard({ data }: { data: Extract<ConsentView, { view: 'consent' }> }) {
  const doApprove = useServerFn(approveGrant)
  const doReject = useServerFn(rejectGrant)
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)

  let destination = data.redirectUri
  try {
    destination = new URL(data.redirectUri).host
  } catch {
    // keep the raw value
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-900/[0.06] ring-1 ring-slate-200/70">
      <div className="px-8 pt-8">
        <div className="flex items-center justify-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <ClientMark className="h-8 w-8" />
          </div>
          <div className="flex items-center gap-1 text-slate-300">
            <span className="h-1 w-1 rounded-full bg-current" />
            <span className="h-1 w-1 rounded-full bg-current" />
            <span className="h-1 w-1 rounded-full bg-current" />
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <RecallLogo className="h-8 w-8" />
          </div>
        </div>

        <h1 className="mt-6 text-center text-[22px] font-semibold tracking-tight text-slate-900">
          Connect {data.client.name}
        </h1>
        <p className="mx-auto mt-1.5 max-w-xs text-center text-sm text-slate-500">
          {data.client.name} wants to access your Recall account.
        </p>

        <div className="mt-5 flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-3 ring-1 ring-slate-200/70">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 text-xs font-bold text-white">
            {initials(data.email)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-slate-900">{data.email}</div>
            <div className="text-xs text-slate-400">Signed in to Recall</div>
          </div>
        </div>
      </div>

      <div className="mt-6 px-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {data.client.name} will be able to
        </p>
        <ul className="mt-3 space-y-1">
          {data.scopes.map((scope) => (
            <li key={scope} className="flex items-center gap-3 px-2 py-2">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-teal-100 text-teal-600">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <span className="text-sm text-slate-700">{SCOPE_LABELS[scope] ?? scope}</span>
            </li>
          ))}
        </ul>
        {data.resources.length > 0 && (
          <p className="mt-3 px-2 text-xs text-slate-400">
            Access is limited to {data.resources.join(', ')}
          </p>
        )}
      </div>

      <div className="mt-7 grid grid-cols-2 gap-3 px-8">
        <button
          type="button"
          disabled={busy !== null}
          className={secondaryButtonClass}
          onClick={async () => {
            setBusy('reject')
            await doReject({ data: { grantId: data.grantId } })
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={busy !== null}
          className={primaryButtonClass}
          onClick={async () => {
            setBusy('approve')
            await doApprove({ data: { grantId: data.grantId } })
          }}
        >
          {busy === 'approve' ? 'Connecting…' : 'Allow access'}
        </button>
      </div>

      <div className="mt-6 flex items-center justify-center gap-1.5 border-t border-slate-100 px-8 py-4 text-xs text-slate-400">
        <Lock className="h-3 w-3" />
        You will return to {destination} after this step
      </div>
    </div>
  )
}

function initials(email: string) {
  const handle = email.split('@')[0] ?? '?'
  const parts = handle.split(/[._-]/).filter(Boolean)
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase()
}
