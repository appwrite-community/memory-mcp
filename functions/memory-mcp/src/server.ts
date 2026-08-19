// The MCP server surface: four tools over the signed-in user's memories.
//
// Each tool checks the scopes the user approved on Recall's consent screen
// before touching any data. Scopes are the contract between what the user
// agreed to and what the AI client can do.
import { McpServer, type CallToolResult } from '@modelcontextprotocol/server'
import * as z from 'zod'
import {
  deleteMemory,
  listMemories,
  searchMemories,
  storeMemory,
  type MemoryDocument,
} from './memories.js'

type Session = {
  userId: string
  scopes: string[]
  apiKey: string
}

export function buildServer(session: Session): McpServer {
  const server = new McpServer(
    { name: 'recall', version: '1.0.0' },
    { capabilities: { tools: {} } },
  )

  server.registerTool(
    'remember',
    {
      title: 'Remember',
      description:
        'Store a memory for the user: a fact, preference, or decision worth keeping across conversations.',
      inputSchema: z.object({
        text: z.string().min(1).max(2048).describe('The memory, written as one self-contained sentence or two'),
        tags: z.array(z.string().min(1).max(64)).max(8).default([]).describe('Optional labels, e.g. ["preferences", "work"]'),
      }),
    },
    async ({ text, tags }) => {
      const denied = requireScope(session, 'memories.write')
      if (denied) return denied
      const memory = await storeMemory(session.apiKey, session.userId, text, tags)
      return json({ memory: publicMemory(memory) })
    },
  )

  server.registerTool(
    'recall',
    {
      title: 'Recall',
      description:
        "Search the user's memories by meaning. Returns the closest matches even when the wording differs.",
      inputSchema: z.object({
        query: z.string().min(1).max(1024).describe('What you want to know, in plain language'),
        limit: z.number().int().min(1).max(20).default(5).describe('How many matches to return'),
      }),
    },
    async ({ query, limit }) => {
      const denied = requireScope(session, 'memories.read')
      if (denied) return denied
      const memories = await searchMemories(session.apiKey, session.userId, query, limit)
      return json({ memories: memories.map(publicMemory) })
    },
  )

  server.registerTool(
    'list_memories',
    {
      title: 'List memories',
      description: "List the user's most recent memories, newest first.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).default(20).describe('How many memories to return'),
      }),
    },
    async ({ limit }) => {
      const denied = requireScope(session, 'memories.read')
      if (denied) return denied
      const memories = await listMemories(session.apiKey, session.userId, limit)
      return json({ memories: memories.map(publicMemory) })
    },
  )

  server.registerTool(
    'forget',
    {
      title: 'Forget',
      description: 'Delete one of the user\'s memories. Only do this when the user asks.',
      inputSchema: z.object({
        memoryId: z.string().describe('The id of the memory, as returned by recall or list_memories'),
      }),
    },
    async ({ memoryId }) => {
      const denied = requireScope(session, 'memories.write')
      if (denied) return denied
      await deleteMemory(session.apiKey, session.userId, memoryId)
      return json({ deleted: memoryId })
    },
  )

  return server
}

/** Tool-level scope check. Returns an error result the model can read. */
function requireScope(session: Session, scope: string): CallToolResult | undefined {
  if (session.scopes.includes(scope)) return undefined
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: `This connection was not granted the "${scope}" permission. Ask the user to reconnect Recall and approve it.`,
      },
    ],
  }
}

function publicMemory(memory: MemoryDocument) {
  return {
    id: memory.$id,
    text: memory.metadata.text,
    tags: memory.metadata.tags,
    createdAt: memory.$createdAt,
  }
}

function json(value: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] }
}
