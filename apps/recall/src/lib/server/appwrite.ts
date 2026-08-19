// Server-only Appwrite clients for Recall.
//
// Recall keeps its Appwrite session secret in an encrypted cookie and
// rebuilds a session-scoped client for every request that needs one. The
// admin client (API key) is only used where a user session cannot be: signing
// users in and reading client details for the consent screen.
import '@tanstack/react-start/server-only'
import { useSession } from '@tanstack/react-start/server'
import { Account, Apps, Client, Embeddings, Oauth2, VectorsDB } from 'node-appwrite'

const endpoint = process.env.APPWRITE_ENDPOINT!
const project = process.env.APPWRITE_PROJECT_ID!

/** Client authenticated with Recall's API key. */
export function adminClient() {
  return new Client()
    .setEndpoint(endpoint)
    .setProject(project)
    .setKey(process.env.APPWRITE_API_KEY!)
}

/** Client that acts as the signed-in user. */
export function sessionClient(secret: string) {
  return new Client().setEndpoint(endpoint).setProject(project).setSession(secret)
}

export const services = {
  account: (client: Client) => new Account(client),
  apps: (client: Client) => new Apps(client),
  oauth2: (client: Client) => new Oauth2(client),
  vectorsDB: (client: Client) => new VectorsDB(client),
  embeddings: (client: Client) => new Embeddings(client),
}

export type SessionData = {
  /** The Appwrite session secret for the signed-in user. */
  secret?: string
  email?: string
  name?: string
  /** An OAuth2 authorize request waiting for the user to sign in. */
  pendingAuthorize?: Record<string, string>
}

/** Recall's own cookie session. */
export function recallSession() {
  return useSession<SessionData>({
    name: 'recall_session',
    password: process.env.SESSION_SECRET!,
  })
}

/** Returns the signed-in user's session secret, or null. */
export async function currentSecret(): Promise<string | null> {
  const session = await recallSession()
  return session.data.secret ?? null
}
