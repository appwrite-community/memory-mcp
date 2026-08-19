# Recall: a memory MCP server on Appwrite Functions

Recall is a small personal-memory app built on Appwrite. It ships a remote MCP server, hosted as an Appwrite Function, so AI tools like Claude Code can save and search a user's memories with the user's permission.

Memories are stored in an Appwrite VectorsDB database: each memory is embedded with the `all-minilm` model and retrieved by meaning with a cosine-similarity query. Auth runs on the project's OAuth2 server: AI clients register themselves, users approve access on a consent screen Recall hosts, and the MCP server verifies the tokens the project issues. No API keys are handed out, and users can disconnect a tool at any time.

Companion repository for the Appwrite blog tutorial "Build a memory MCP server on Appwrite".

## Layout

```
apps/recall            The Recall web app (TanStack Start): memory dashboard,
                       email sign-in, the OAuth2 consent screen, and a
                       connected apps page.
functions/memory-mcp   The MCP server, deployed as an Appwrite Function.
```

## Setup

1. Create an Appwrite project.
2. In the Console, create a VectorsDB database with ID `recall`, then a collection with ID `memories` using the `all-minilm` (384) embedding model, and add an `hnsw_cosine` index on the `embeddings` field.
3. Create an API key with the scopes `sessions.write`, `users.read`, `apps.read`, `databases.read`, `collections.read`, `collections.write`, `documents.read`, `documents.write`, and `embeddings.write`.
4. Copy `.env.example` to `.env` with your endpoint, project ID, the API key, and a random session secret.
5. In the Console, open **Auth > OAuth2 server**, enable the server, set the authorization URL to `http://localhost:4200/oauth/consent`, and add the `memories.read` and `memories.write` scopes.
6. Deploy the web app and the MCP server (uses the [Appwrite CLI](https://appwrite.io/docs/tooling/command-line/installation)), then set the site's variables in the Console (same values as `.env`):

   ```bash
   pnpm install
   appwrite login
   appwrite push site --site-id recall
   appwrite push function --function-id memory-mcp --activate
   ```

7. Update the OAuth2 server's authorization URL to `https://<SITE_DOMAIN>/oauth/consent`.

8. Connect from Claude Code, using the function's domain from the deploy output:

   ```bash
   claude mcp add --transport http recall https://<FUNCTION_DOMAIN>/mcp
   ```

   Run `/mcp` inside Claude Code and pick **Authenticate**. Sign in as a Recall user, approve access, and ask Claude to remember something.

## Live demo

The deployed result of this repository: the app at [recall.appwrite.network](https://recall.appwrite.network) and the MCP server at `https://recall-mcp.appwrite.network/mcp`. Create an account, connect Claude Code with the command above, and ask it to remember things.
