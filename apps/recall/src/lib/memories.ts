// Memory server functions for the dashboard. The implementations live in
// ./server/memories and are imported inside the handlers, so the server-only
// SDK stays out of the client bundle.
import { createServerFn } from '@tanstack/react-start'

export type Memory = {
  id: string
  text: string
  tags: string[]
  createdAt: string
}

export const listMemories = createServerFn().handler(async (): Promise<Memory[]> => {
  const { listMemoriesImpl } = await import('./server/memories')
  return listMemoriesImpl()
})

export const searchMemories = createServerFn()
  .validator((data: { query: string }) => data)
  .handler(async ({ data }): Promise<Memory[]> => {
    const { searchMemoriesImpl } = await import('./server/memories')
    return searchMemoriesImpl(data.query)
  })

export const addMemory = createServerFn({ method: 'POST' })
  .validator((data: { text: string }) => data)
  .handler(async ({ data }): Promise<Memory> => {
    const { addMemoryImpl } = await import('./server/memories')
    return addMemoryImpl(data.text)
  })

export const removeMemory = createServerFn({ method: 'POST' })
  .validator((data: { memoryId: string }) => data)
  .handler(async ({ data }) => {
    const { removeMemoryImpl } = await import('./server/memories')
    await removeMemoryImpl(data.memoryId)
  })
