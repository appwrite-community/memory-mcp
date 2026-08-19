// Connected apps: the consents the signed-in user has given, and the ability
// to take them back. Removing a consent revokes the tokens that came with it.
import { currentSecret, services, sessionClient } from './appwrite'
import { describeClient } from './oauth'
import type { Connection } from '../connections'

export async function listConnectionsImpl(): Promise<Connection[]> {
  const secret = await currentSecret()
  if (!secret) throw new Error('Not signed in')
  const account = services.account(sessionClient(secret))
  const { consents } = await account.listConsents()

  return Promise.all(
    consents.map(async (consent) => {
      const client = await describeClient(consent.cimdUrl || consent.appId)
      return {
        id: consent.$id,
        clientName: client.name,
        scopes: consent.scopes,
        resources: consent.resources,
        createdAt: consent.$createdAt,
      }
    }),
  )
}

export async function revokeConnectionImpl(consentId: string): Promise<void> {
  const secret = await currentSecret()
  if (!secret) throw new Error('Not signed in')
  await services.account(sessionClient(secret)).deleteConsent({ consentId })
}
