// Recall's memory data. The dashboard reads and writes through the same
// VectorsDB collection the MCP server uses, so a memory saved from an AI tool
// shows up here and a memory saved here is searchable from the AI tool.
//
// Runs with Recall's API key and scopes every call to the signed-in user
// through the memory's metadata.
import { EmbeddingModel, ID, Permission, Query, Role, type Models } from 'node-appwrite'
import { adminClient, currentSecret, services, sessionClient } from './appwrite'
import type { Memory } from '../memories'

export const DATABASE_ID = 'recall'
export const COLLECTION_ID = 'memories'

type MemoryDocument = Models.Document & {
  embeddings: number[]
  metadata: { userId: string; text: string; tags: string[] }
}

async function currentUserId(): Promise<string> {
  const secret = await currentSecret()
  if (!secret) throw new Error('Not signed in')
  const me = await services.account(sessionClient(secret)).get()
  return me.$id
}

async function embed(text: string): Promise<number[]> {
  const embeddings = services.embeddings(adminClient())
  const result = await embeddings.createTextEmbeddings({
    texts: [text],
    model: EmbeddingModel.Allminilm,
  })
  const first = result.embeddings[0]
  if (!first || first.error || first.embedding.length === 0) {
    throw new Error(`Could not embed the text: ${first?.error || 'empty embedding'}`)
  }
  return first.embedding
}

function publicMemory(document: MemoryDocument): Memory {
  return {
    id: document.$id,
    text: document.metadata.text,
    tags: document.metadata.tags,
    createdAt: document.$createdAt,
  }
}

export async function listMemoriesImpl(): Promise<Memory[]> {
  const userId = await currentUserId()
  const vectorsDB = services.vectorsDB(adminClient())
  const result = await vectorsDB.listDocuments<MemoryDocument>({
    databaseId: DATABASE_ID,
    collectionId: COLLECTION_ID,
    queries: [
      Query.equal('metadata.userId', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(50),
    ],
  })
  return result.documents.map(publicMemory)
}

export async function searchMemoriesImpl(query: string): Promise<Memory[]> {
  const userId = await currentUserId()
  const vectorsDB = services.vectorsDB(adminClient())
  const result = await vectorsDB.listDocuments<MemoryDocument>({
    databaseId: DATABASE_ID,
    collectionId: COLLECTION_ID,
    queries: [
      Query.vectorCosine('embeddings', await embed(query)),
      Query.equal('metadata.userId', userId),
      Query.limit(10),
    ],
  })
  return result.documents.map(publicMemory)
}

export async function addMemoryImpl(text: string): Promise<Memory> {
  const userId = await currentUserId()
  const vectorsDB = services.vectorsDB(adminClient())
  const document = await vectorsDB.createDocument<MemoryDocument>({
    databaseId: DATABASE_ID,
    collectionId: COLLECTION_ID,
    documentId: ID.unique(),
    data: {
      embeddings: await embed(text),
      metadata: { userId, text, tags: [] },
    },
    permissions: [Permission.read(Role.user(userId)), Permission.delete(Role.user(userId))],
  })
  return publicMemory(document)
}

export async function removeMemoryImpl(memoryId: string): Promise<void> {
  const userId = await currentUserId()
  const vectorsDB = services.vectorsDB(adminClient())
  const document = await vectorsDB.getDocument<MemoryDocument>({
    databaseId: DATABASE_ID,
    collectionId: COLLECTION_ID,
    documentId: memoryId,
  })
  if (document.metadata.userId !== userId) throw new Error('Memory not found')
  await vectorsDB.deleteDocument({
    databaseId: DATABASE_ID,
    collectionId: COLLECTION_ID,
    documentId: memoryId,
  })
}
