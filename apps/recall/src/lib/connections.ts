// Connected-apps server functions. The implementations live in
// ./server/connections and are imported inside the handlers, so the
// server-only SDK stays out of the client bundle.
import { createServerFn } from '@tanstack/react-start'

export type Connection = {
  id: string
  clientName: string
  scopes: string[]
  resources: string[]
  createdAt: string
}

export const listConnections = createServerFn().handler(async (): Promise<Connection[]> => {
  const { listConnectionsImpl } = await import('./server/connections')
  return listConnectionsImpl()
})

export const revokeConnection = createServerFn({ method: 'POST' })
  .validator((data: { consentId: string }) => data)
  .handler(async ({ data }) => {
    const { revokeConnectionImpl } = await import('./server/connections')
    await revokeConnectionImpl(data.consentId)
  })
