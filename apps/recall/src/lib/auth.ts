// Auth server functions. The implementations live in ./server/auth and are
// imported inside the handlers, so the server-only SDK stays out of the
// client bundle.
import { createServerFn } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'

type Credentials = { email: string; password: string; name?: string }

export const login = createServerFn({ method: 'POST' })
  .validator((data: Credentials) => data)
  .handler(async ({ data }) => {
    const { loginImpl } = await import('./server/auth')
    await loginImpl(data)
  })

export const signup = createServerFn({ method: 'POST' })
  .validator((data: Credentials) => data)
  .handler(async ({ data }) => {
    const { signupImpl } = await import('./server/auth')
    await signupImpl(data)
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const { logoutImpl } = await import('./server/auth')
  await logoutImpl()
  throw redirect({ to: '/' })
})

/** The signed-in user, or null. */
export const currentUser = createServerFn().handler(async () => {
  const { currentUserImpl } = await import('./server/auth')
  return currentUserImpl()
})
