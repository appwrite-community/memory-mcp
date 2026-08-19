// Sign-in, sign-up, and sign-out for Recall. Runs on the server only; the
// browser never sees the API key or the Appwrite session secret.
import { AppwriteException, ID } from 'node-appwrite'
import { adminClient, recallSession, services } from './appwrite'

export type Credentials = { email: string; password: string; name?: string }

async function signIn(email: string, password: string) {
  const account = services.account(adminClient())
  // With an API key the response includes the session secret, which is what
  // Recall stores in its own cookie.
  const appwriteSession = await account.createEmailPasswordSession({ email, password })
  const session = await recallSession()
  await session.update({ secret: appwriteSession.secret, email })
}

export async function loginImpl(data: Credentials) {
  try {
    await signIn(data.email, data.password)
  } catch (error) {
    if (error instanceof AppwriteException) throw new Error('Invalid email or password')
    throw error
  }
}

export async function signupImpl(data: Credentials) {
  const account = services.account(adminClient())
  try {
    await account.create({
      userId: ID.unique(),
      email: data.email,
      password: data.password,
      name: data.name,
    })
  } catch (error) {
    if (error instanceof AppwriteException) throw new Error(error.message)
    throw error
  }
  await signIn(data.email, data.password)
}

export async function logoutImpl() {
  const session = await recallSession()
  await session.clear()
}

/** The signed-in user, or null. */
export async function currentUserImpl() {
  const session = await recallSession()
  if (!session.data.secret) return null
  return { email: session.data.email ?? '', name: session.data.name ?? '' }
}
