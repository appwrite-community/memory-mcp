import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Plus, Search, Trash2, X } from 'lucide-react'
import { currentUser } from '../lib/auth'
import {
  addMemory,
  listMemories,
  removeMemory,
  searchMemories,
  type Memory,
} from '../lib/memories'
import { AuthCard } from '../components/auth-card'
import { AppShell, CardShell, inputClass, primaryButtonClass } from '../components/shell'

export const Route = createFileRoute('/')({
  loader: async () => {
    const user = await currentUser()
    if (!user) return { user: null, memories: [] as Memory[] }
    return { user, memories: await listMemories() }
  },
  component: Home,
})

function Home() {
  const { user, memories } = Route.useLoaderData()
  const router = useRouter()

  if (!user) {
    return (
      <CardShell>
        <AuthCard
          subtitle="The memory your AI tools share, kept in one place you control."
          onDone={() => router.invalidate()}
        />
      </CardShell>
    )
  }

  return (
    <AppShell email={user.email}>
      <Dashboard memories={memories} />
    </AppShell>
  )
}

function Dashboard({ memories }: { memories: Memory[] }) {
  const router = useRouter()
  const doAdd = useServerFn(addMemory)
  const doRemove = useServerFn(removeMemory)
  const doSearch = useServerFn(searchMemories)
  const [text, setText] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Memory[] | null>(null)
  const [busy, setBusy] = useState(false)

  const shown = results ?? memories

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your memories</h1>
        <p className="mt-1 text-sm text-slate-500">
          {memories.length} saved · everything here is visible to the AI tools you connect
        </p>
      </div>

      <form
        className="mt-6 flex gap-2"
        onSubmit={async (event) => {
          event.preventDefault()
          if (!text.trim()) return
          setBusy(true)
          await doAdd({ data: { text: text.trim() } })
          setText('')
          setResults(null)
          setBusy(false)
          await router.invalidate()
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={`${inputClass} mt-0 bg-white`}
          placeholder="Save a memory: a fact, preference, or decision…"
        />
        <button type="submit" disabled={busy} className={primaryButtonClass}>
          <Plus className="h-4 w-4" />
          Save
        </button>
      </form>

      <form
        className="mt-3 flex gap-2"
        onSubmit={async (event) => {
          event.preventDefault()
          if (!query.trim()) return
          setBusy(true)
          setResults(await doSearch({ data: { query: query.trim() } }))
          setBusy(false)
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${inputClass} mt-0 bg-white`}
          placeholder="Search by meaning: “what stack do I use?”"
        />
        <button
          type="submit"
          disabled={busy}
          className={`${primaryButtonClass} bg-slate-800 shadow-slate-800/20 hover:bg-slate-900`}
        >
          <Search className="h-4 w-4" />
          Search
        </button>
        {results && (
          <button
            type="button"
            aria-label="Clear search"
            className={`${primaryButtonClass} bg-slate-200 px-3 text-slate-600 shadow-none hover:bg-slate-300`}
            onClick={() => {
              setResults(null)
              setQuery('')
            }}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {results && (
        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
          {results.length} closest {results.length === 1 ? 'match' : 'matches'}
        </p>
      )}

      <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70">
        {shown.length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-slate-400">
            Nothing here yet. Save a memory above, or ask your AI assistant to remember something.
          </li>
        )}
        {shown.map((memory) => (
          <li key={memory.id} className="flex items-start gap-3 px-5 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-800">{memory.text}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                <span>{new Date(memory.createdAt).toLocaleDateString()}</span>
                {memory.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              aria-label="Delete memory"
              className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500"
              onClick={async () => {
                await doRemove({ data: { memoryId: memory.id } })
                setResults(null)
                await router.invalidate()
              }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
