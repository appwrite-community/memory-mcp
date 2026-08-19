import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Unplug } from 'lucide-react'
import { currentUser } from '../lib/auth'
import { listConnections, revokeConnection } from '../lib/connections'
import { SCOPE_LABELS } from '../lib/oauth'
import { AppShell, secondaryButtonClass } from '../components/shell'

export const Route = createFileRoute('/connections')({
  loader: async () => {
    const user = await currentUser()
    if (!user) throw redirect({ to: '/' })
    return { user, connections: await listConnections() }
  },
  component: Connections,
})

function Connections() {
  const { user, connections } = Route.useLoaderData()
  const router = useRouter()
  const doRevoke = useServerFn(revokeConnection)

  return (
    <AppShell email={user.email}>
      <h1 className="text-2xl font-semibold tracking-tight">Connected apps</h1>
      <p className="mt-1 text-sm text-slate-500">
        Apps and AI tools you have allowed to use your Recall account. Disconnecting one
        stops it from renewing its access, and its current access ends when its short-lived
        token expires.
      </p>

      <ul className="mt-6 space-y-3">
        {connections.length === 0 && (
          <li className="rounded-2xl bg-white px-5 py-10 text-center text-sm text-slate-400 ring-1 ring-slate-200/70">
            No connected apps yet.
          </li>
        )}
        {connections.map((connection) => (
          <li
            key={connection.id}
            className="flex items-start gap-4 rounded-2xl bg-white px-5 py-4 ring-1 ring-slate-200/70"
          >
            <div className="min-w-0 flex-1">
              <div className="font-medium text-slate-900">{connection.clientName}</div>
              <div className="mt-0.5 text-xs text-slate-400">
                Connected {new Date(connection.createdAt).toLocaleDateString()}
              </div>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {connection.scopes.map((scope) => (
                  <li
                    key={scope}
                    className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600"
                  >
                    {SCOPE_LABELS[scope] ?? scope}
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              className={`${secondaryButtonClass} h-9 gap-1.5 text-red-600 hover:bg-red-50`}
              onClick={async () => {
                await doRevoke({ data: { consentId: connection.id } })
                await router.invalidate()
              }}
            >
              <Unplug className="h-4 w-4" />
              Disconnect
            </button>
          </li>
        ))}
      </ul>
    </AppShell>
  )
}
