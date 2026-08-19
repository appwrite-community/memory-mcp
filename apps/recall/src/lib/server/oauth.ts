// Recall's side of the OAuth2 authorization flow.
//
// Appwrite handles the protocol: it validates the client, the redirect URI,
// PKCE, the requested scopes, and mints the tokens. Recall only hosts the
// page where the user sees who is asking and decides.
import { redirect } from '@tanstack/react-router'
import { getRequestUrl } from '@tanstack/react-start/server'
import { AppwriteException } from 'node-appwrite'
import { adminClient, recallSession, services, sessionClient } from './appwrite'
import type { ClientInfo, ConsentView } from '../oauth'

// Query parameters Appwrite forwards to the consent page when a user who is
// not signed in starts an authorization. They map onto the authorize call.
const AUTHORIZE_PARAMS: Record<string, string> = {
  client_id: 'clientId',
  redirect_uri: 'redirectUri',
  response_type: 'responseType',
  scope: 'scope',
  state: 'state',
  nonce: 'nonce',
  code_challenge: 'codeChallenge',
  code_challenge_method: 'codeChallengeMethod',
  prompt: 'prompt',
  max_age: 'maxAge',
  authorization_details: 'authorizationDetails',
  resource: 'resource',
  audience: 'audience',
  request_uri: 'requestUri',
}

export async function loadConsentImpl(): Promise<ConsentView> {
  const url = getRequestUrl()
  const session = await recallSession()

  const incoming: Record<string, string> = {}
  for (const [param, sdkKey] of Object.entries(AUTHORIZE_PARAMS)) {
    const value = url.searchParams.get(param)
    if (value) incoming[sdkKey] = value
  }

  if (!session.data.secret) {
    // Remember the request, sign the user in, and resume it afterwards.
    if (Object.keys(incoming).length) await session.update({ pendingAuthorize: incoming })
    return { view: 'login' }
  }

  const client = sessionClient(session.data.secret)
  const oauth2 = services.oauth2(client)

  let grantId = url.searchParams.get('grant_id')
  if (!grantId) {
    const params = { ...session.data.pendingAuthorize, ...incoming }
    await session.update({ pendingAuthorize: undefined })
    const result = await oauth2.authorize({
      ...params,
      maxAge: params.maxAge ? Number(params.maxAge) : undefined,
    })
    // Appwrite skips consent when the user already approved these scopes
    // for this client, and hands back the redirect straight away.
    if (result.redirectUrl) throw redirect({ href: result.redirectUrl })
    grantId = result.grantId
  }

  const grant = await oauth2.getGrant({ grantId })
  return {
    view: 'consent',
    grantId: grant.$id,
    scopes: grant.scopes,
    resources: grant.resources,
    redirectUri: grant.redirectUri,
    client: await describeClient(grant.appId),
    email: session.data.email ?? '',
  }
}

/** Look up the requesting client's name for the consent card.
 *
 *  Two kinds of clients can ask for access. Apps registered on the project
 *  are looked up through the Apps service. Clients that identify themselves
 *  with a URL host their details at that URL, so Recall fetches them.
 */
export async function describeClient(appId: string): Promise<ClientInfo> {
  if (appId.startsWith('https://') || appId.startsWith('http://')) {
    try {
      const response = await fetch(appId, { headers: { Accept: 'application/json' } })
      const metadata = (await response.json()) as { client_name?: string; client_uri?: string }
      return { id: appId, name: metadata.client_name ?? appId, uri: metadata.client_uri }
    } catch {
      return { id: appId, name: appId }
    }
  }
  try {
    const app = await services.apps(adminClient()).get({ appId })
    return { id: app.$id, name: app.name, uri: app.clientUri || undefined }
  } catch (error) {
    if (error instanceof AppwriteException) return { id: appId, name: appId }
    throw error
  }
}

export async function approveGrantImpl(grantId: string): Promise<never> {
  const session = await recallSession()
  const oauth2 = services.oauth2(sessionClient(session.data.secret!))
  const result = await oauth2.approve({ grantId })
  throw redirect({ href: result.redirectUrl })
}

export async function rejectGrantImpl(grantId: string): Promise<never> {
  const session = await recallSession()
  const oauth2 = services.oauth2(sessionClient(session.data.secret!))
  const result = await oauth2.reject({ grantId })
  throw redirect({ href: result.redirectUrl })
}
