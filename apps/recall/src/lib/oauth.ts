// Consent-screen server functions and shared types. The implementations live
// in ./server/oauth and are imported inside the handlers, so the server-only
// SDK stays out of the client bundle.
import { createServerFn } from '@tanstack/react-start'

export type ClientInfo = { id: string; name: string; uri?: string }

export type ConsentView =
  | { view: 'login' }
  | {
      view: 'consent'
      grantId: string
      scopes: string[]
      resources: string[]
      redirectUri: string
      client: ClientInfo
      email: string
    }

export const loadConsent = createServerFn().handler(async (): Promise<ConsentView> => {
  const { loadConsentImpl } = await import('./server/oauth')
  return loadConsentImpl()
})

export const approveGrant = createServerFn({ method: 'POST' })
  .validator((data: { grantId: string }) => data)
  .handler(async ({ data }) => {
    const { approveGrantImpl } = await import('./server/oauth')
    await approveGrantImpl(data.grantId)
  })

export const rejectGrant = createServerFn({ method: 'POST' })
  .validator((data: { grantId: string }) => data)
  .handler(async ({ data }) => {
    const { rejectGrantImpl } = await import('./server/oauth')
    await rejectGrantImpl(data.grantId)
  })

// Plain-language descriptions for the scopes the consent card shows.
export const SCOPE_LABELS: Record<string, string> = {
  openid: 'Confirm who you are',
  profile: 'See your name and profile details',
  email: 'See your email address',
  phone: 'See your phone number',
  'memories.read': 'Search and read your memories',
  'memories.write': 'Save new memories and delete ones it saved',
}
