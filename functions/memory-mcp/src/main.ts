// Recall MCP server, hosted as an Appwrite Function.
//
// One function handles three kinds of requests:
//   1. GET  /.well-known/oauth-protected-resource/mcp  – tells MCP clients which
//      OAuth2 server protects this MCP server and which scopes it understands.
//   2. POST /mcp without a valid access token              – answers 401 with a
//      WWW-Authenticate header that points at the document above.
//   3. POST /mcp with a valid access token                 – serves MCP.
//
// The MCP server is stateless: every request is handled on its own, which is
// exactly what a serverless function wants.
import {
  createMcpHandler,
  getOAuthProtectedResourceMetadataUrl,
  oauthMetadataResponse,
  requireBearerAuth,
  type AuthMetadataOptions,
  type OAuthMetadata,
} from '@modelcontextprotocol/server'
import { ISSUER, createVerifier } from './auth.js'
import { buildServer } from './server.js'

export const SCOPES = ['openid', 'memories.read', 'memories.write']

type AppwriteRequest = {
  method: string
  url: string
  headers: Record<string, string>
  bodyBinary: Buffer
}

type AppwriteResponse = {
  text: (body: string, statusCode?: number, headers?: Record<string, string>) => unknown
}

type Context = {
  req: AppwriteRequest
  res: AppwriteResponse
  log: (message: unknown) => void
  error: (message: unknown) => void
}

// The OAuth2 server's own metadata (endpoints, supported flows). Fetched once
// per container and re-served to clients that probe this origin for it.
let authServerMetadata: Promise<OAuthMetadata> | undefined
function getAuthServerMetadata(): Promise<OAuthMetadata> {
  authServerMetadata ??= fetch(`${ISSUER}/.well-known/oauth-authorization-server`).then(
    async (response) => {
      if (!response.ok) {
        throw new Error(`Could not load OAuth2 server metadata: ${response.status}`)
      }
      return (await response.json()) as OAuthMetadata
    },
  )
  return authServerMetadata
}

// Every MCP request is answered by a fresh server instance built for the
// user the token belongs to.
const mcp = createMcpHandler(
  ({ authInfo }) => {
    const userId = authInfo?.extra?.userId as string | undefined
    const apiKey = authInfo?.extra?.apiKey as string | undefined
    if (!authInfo || !userId || !apiKey) {
      throw new Error('MCP handler called without a verified user')
    }
    return buildServer({ userId, scopes: authInfo.scopes, apiKey })
  },
  // Functions return a single response, so ask the SDK for plain JSON rather
  // than a server-sent-events stream.
  { responseMode: 'json' },
)

export default async ({ req, res, error }: Context) => {
  const request = toWebRequest(req)
  const url = new URL(request.url)

  // The public URL of this MCP server. It doubles as the OAuth2 "resource"
  // identifier: tokens are minted for this exact URL and for nothing else.
  const resourceServerUrl = new URL('/mcp', url.origin)

  try {
    const metadataOptions: AuthMetadataOptions = {
      oauthMetadata: await getAuthServerMetadata(),
      resourceServerUrl,
      scopesSupported: SCOPES,
      resourceName: 'Recall',
      // Local Appwrite runs over plain http. Cloud issuers are always https.
      dangerouslyAllowInsecureIssuerUrl: ISSUER.startsWith('http://'),
    }
    const discovery = oauthMetadataResponse(request, metadataOptions)
    if (discovery) {
      return send(res, discovery)
    }

    if (url.pathname !== '/mcp') {
      return res.text('Not found', 404)
    }

    const gate = requireBearerAuth({
      verifier: createVerifier(resourceServerUrl),
      resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(resourceServerUrl),
    })
    const auth = await gate(request)
    if (auth instanceof Response) {
      return send(res, auth)
    }

    // The function's own key, minted by Appwrite for this execution with the
    // scopes configured on the function.
    auth.extra = { ...auth.extra, apiKey: req.headers['x-appwrite-key'] }

    return send(res, await mcp.fetch(request, { authInfo: auth }))
  } catch (err) {
    error(err instanceof Error ? err.stack ?? err.message : String(err))
    return res.text('Internal error', 500)
  }
}

/** Convert the Appwrite request object into a web-standard Request.
 *
 *  TLS ends at Appwrite's proxy, so the function itself receives plain http
 *  and must not advertise that scheme in the URLs it builds about itself.
 *  Everything off localhost is reachable only through https.
 */
function toWebRequest(req: AppwriteRequest): Request {
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
  const url = new URL(req.url)
  const isLocal = url.hostname === 'localhost' || url.hostname.endsWith('.localhost')
  if (!isLocal) url.protocol = 'https'
  return new Request(url, {
    method: req.method,
    headers: req.headers,
    body: hasBody ? new Uint8Array(req.bodyBinary) : undefined,
  })
}

/** Send a web-standard Response back through the Appwrite response object. */
async function send(res: AppwriteResponse, response: Response) {
  const headers: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    headers[key] = value
  })
  return res.text(await response.text(), response.status, headers)
}
