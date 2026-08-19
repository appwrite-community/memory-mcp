// Access token verification for the Recall MCP server.
//
// Every request to the MCP server carries an access token issued by the
// Recall project's OAuth2 server. This module checks the token's signature
// against the project's public keys and turns the token's claims into the
// AuthInfo shape the MCP SDK expects.
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import {
  OAuthError,
  OAuthErrorCode,
  type AuthInfo,
  type OAuthTokenVerifier,
} from '@modelcontextprotocol/server'

// The OAuth2 server lives at /v1/oauth2/<PROJECT_ID> on the same endpoint the
// function already uses to talk to Appwrite. Override with OAUTH_ISSUER if you
// verify tokens from a different endpoint than the one the function calls.
export const ISSUER =
  process.env.OAUTH_ISSUER ??
  `${process.env.APPWRITE_FUNCTION_API_ENDPOINT}/oauth2/${process.env.APPWRITE_FUNCTION_PROJECT_ID}`

// Public signing keys, fetched once and cached for the life of the container.
const jwks = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`))

type AccessTokenClaims = JWTPayload & {
  scope?: string
  client_id?: string
}

/** Build a verifier that only accepts tokens minted for `resource`. */
export function createVerifier(resource: URL): OAuthTokenVerifier {
  return {
    async verifyAccessToken(token: string): Promise<AuthInfo> {
      let claims: AccessTokenClaims
      try {
        const result = await jwtVerify<AccessTokenClaims>(token, jwks, {
          issuer: ISSUER,
          audience: resource.href,
          // Access tokens are typed `at+jwt` (RFC 9068). ID tokens from the
          // same server are signed with the same key, so the type check is
          // what keeps a user from pasting an ID token in here.
          typ: 'at+jwt',
        })
        claims = result.payload
      } catch (error) {
        throw new OAuthError(
          OAuthErrorCode.InvalidToken,
          error instanceof Error ? error.message : 'Invalid access token',
        )
      }

      if (!claims.sub) {
        throw new OAuthError(OAuthErrorCode.InvalidToken, 'Token has no subject')
      }

      return {
        token,
        clientId: claims.client_id ?? '',
        scopes: (claims.scope ?? '').split(' ').filter(Boolean),
        expiresAt: claims.exp,
        resource,
        extra: { userId: claims.sub },
      }
    },
  }
}
