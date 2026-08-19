// Recall's memory data, stored in an Appwrite VectorsDB database.
//
// Every memory is one document: the text embedded as a vector, plus a metadata
// object that carries the text itself, the owner's user ID, and optional tags.
// The MCP server talks to the database with the function's own key, and every
// query filters on the user that the access token belongs to.
import {
  Client,
  Embeddings,
  EmbeddingModel,
  ID,
  Permission,
  Query,
  Role,
  VectorsDB,
  type Models,
} from 'node-appwrite'

export const DATABASE_ID = 'recall'
export const COLLECTION_ID = 'memories'

// all-minilm produces 384-dimension vectors: small enough to query quickly and
// plenty for short personal notes.
const MODEL = EmbeddingModel.Allminilm

export type MemoryMetadata = {
  userId: string
  text: string
  tags: string[]
}

export type MemoryDocument = Models.Document & {
  embeddings: number[]
  metadata: MemoryMetadata
}

function clients(apiKey: string) {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT!)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID!)
    .setKey(apiKey)
  return { vectorsDB: new VectorsDB(client), embeddings: new Embeddings(client) }
}

/** Turn a piece of text into the vector the collection stores. */
async function embed(embeddings: Embeddings, text: string): Promise<number[]> {
  const result = await embeddings.createTextEmbeddings({ texts: [text], model: MODEL })
  const first = result.embeddings[0]
  if (!first || first.error || first.embedding.length === 0) {
    throw new Error(`Could not embed the text: ${first?.error || 'empty embedding'}`)
  }
  return first.embedding
}

export async function storeMemory(
  apiKey: string,
  userId: string,
  text: string,
  tags: string[],
): Promise<MemoryDocument> {
  const { vectorsDB, embeddings } = clients(apiKey)
  return vectorsDB.createDocument<MemoryDocument>({
    databaseId: DATABASE_ID,
    collectionId: COLLECTION_ID,
    documentId: ID.unique(),
    data: {
      embeddings: await embed(embeddings, text),
      metadata: { userId, text, tags } satisfies MemoryMetadata,
    },
    permissions: [Permission.read(Role.user(userId)), Permission.delete(Role.user(userId))],
  })
}

export async function searchMemories(
  apiKey: string,
  userId: string,
  query: string,
  limit: number,
): Promise<MemoryDocument[]> {
  const { vectorsDB, embeddings } = clients(apiKey)
  const result = await vectorsDB.listDocuments<MemoryDocument>({
    databaseId: DATABASE_ID,
    collectionId: COLLECTION_ID,
    queries: [
      Query.vectorCosine('embeddings', await embed(embeddings, query)),
      Query.equal('metadata.userId', userId),
      Query.limit(limit),
    ],
  })
  return result.documents
}

export async function listMemories(
  apiKey: string,
  userId: string,
  limit: number,
): Promise<MemoryDocument[]> {
  const { vectorsDB } = clients(apiKey)
  const result = await vectorsDB.listDocuments<MemoryDocument>({
    databaseId: DATABASE_ID,
    collectionId: COLLECTION_ID,
    queries: [
      Query.equal('metadata.userId', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(limit),
    ],
  })
  return result.documents
}

export async function deleteMemory(
  apiKey: string,
  userId: string,
  memoryId: string,
): Promise<void> {
  const { vectorsDB } = clients(apiKey)
  const memory = await vectorsDB.getDocument<MemoryDocument>({
    databaseId: DATABASE_ID,
    collectionId: COLLECTION_ID,
    documentId: memoryId,
  })
  if (memory.metadata.userId !== userId) {
    throw new Error(`Memory ${memoryId} not found`)
  }
  await vectorsDB.deleteDocument({
    databaseId: DATABASE_ID,
    collectionId: COLLECTION_ID,
    documentId: memoryId,
  })
}
