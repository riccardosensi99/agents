import { Edit3, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { MemoryMutationInput } from "../api/client";
import { getGeneralErrorMessage } from "../api/error";
import { LoadingButton } from "../components/forms/LoadingButton";
import { useToast } from "../components/toast/ToastProvider";
import type { MemoryEntry, MemoryType } from "../types/domain";
import { formatDate } from "../utils/format";

type Props = {
  memories: MemoryEntry[];
  onCreateMemory: (body: MemoryMutationInput) => Promise<void>;
  onUpdateMemory: (id: string, body: Partial<MemoryMutationInput>) => Promise<void>;
  onDeleteMemory: (id: string) => Promise<void>;
};

const memoryTypes: MemoryType[] = [
  "EXPERIENCE",
  "OPINION",
  "LESSON",
  "WORKFLOW",
  "STACK",
  "CLIENT_CASE",
  "MISTAKE",
  "DEPLOY",
  "CONTENT_EXAMPLE"
];

const blankForm: MemoryMutationInput = {
  title: "",
  content: "",
  type: "EXPERIENCE",
  tags: [],
  importance: 3,
  source: "manual"
};

const normalizeTags = (value: string) =>
  value
    .split(",")
    .map((tag) =>
      tag
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/(^-|-$)+/g, "")
    )
    .filter(Boolean)
    .slice(0, 12);

export function MemoryPage({ memories, onCreateMemory, onUpdateMemory, onDeleteMemory }: Props) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<MemoryType | "all">("all");
  const [tagFilter, setTagFilter] = useState("");
  const [form, setForm] = useState<MemoryMutationInput>(blankForm);
  const [tagInput, setTagInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const allTags = useMemo(
    () => Array.from(new Set(memories.flatMap((memory) => memory.tags))).sort((left, right) => left.localeCompare(right)),
    [memories]
  );

  const visibleMemories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedTag = tagFilter.trim().toLowerCase();

    return memories.filter((memory) => {
      const matchesType = typeFilter === "all" || memory.type === typeFilter;
      const matchesTag = !normalizedTag || memory.tags.includes(normalizedTag);
      const matchesQuery =
        !normalizedQuery ||
        [memory.title, memory.content, memory.source, memory.type, memory.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesType && matchesTag && matchesQuery;
    });
  }, [memories, query, tagFilter, typeFilter]);

  function startEdit(memory: MemoryEntry) {
    setEditingId(memory.id);
    setForm({
      title: memory.title,
      content: memory.content,
      type: memory.type,
      tags: memory.tags,
      importance: memory.importance,
      source: memory.source
    });
    setTagInput(memory.tags.join(", "));
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(blankForm);
    setTagInput("");
    setError(null);
  }

  async function save() {
    const nextForm = {
      ...form,
      tags: normalizeTags(tagInput),
      title: form.title.trim(),
      content: form.content.trim(),
      source: form.source.trim() || "manual"
    };

    if (nextForm.title.length < 2 || nextForm.content.length < 5) {
      setError("Titolo e contenuto sono obbligatori.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await onUpdateMemory(editingId, nextForm);
        toast.success("Memoria aggiornata", nextForm.title);
      } else {
        await onCreateMemory(nextForm);
        toast.success("Memoria creata", nextForm.title);
      }
      resetForm();
    } catch (err) {
      const message = getGeneralErrorMessage(err);
      setError(message);
      toast.error("Memoria non salvata", message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(memory: MemoryEntry) {
    setDeletingId(memory.id);
    try {
      await onDeleteMemory(memory.id);
      toast.success("Memoria eliminata", memory.title);
      if (editingId === memory.id) {
        resetForm();
      }
    } catch (err) {
      toast.error("Eliminazione non riuscita", getGeneralErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Experience Memory</h2>
          <p className="mt-1 text-sm text-slate-500">Esperienze, opinioni e workflow usati dai prompt degli agenti.</p>
        </div>
        <button
          type="button"
          onClick={resetForm}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
        >
          <Plus size={16} />
          Nuova memoria
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
            <div className="grid gap-3 lg:grid-cols-[1fr_220px_180px]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 text-slate-500" size={16} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cerca memoria..."
                  className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/50 pl-9 pr-3 text-sm text-white outline-none focus:border-cyan-300/45"
                />
              </label>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as MemoryType | "all")}
                className="h-11 rounded-xl border border-white/10 bg-slate-950/50 px-3 text-sm text-white outline-none focus:border-cyan-300/45"
              >
                <option value="all">Tutti i tipi</option>
                {memoryTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <select
                value={tagFilter}
                onChange={(event) => setTagFilter(event.target.value)}
                className="h-11 rounded-xl border border-white/10 bg-slate-950/50 px-3 text-sm text-white outline-none focus:border-cyan-300/45"
              >
                <option value="">Tutti i tag</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3">
            {visibleMemories.map((memory) => (
              <article key={memory.id} className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-white">{memory.title}</h3>
                      <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-0.5 text-[10px] font-medium uppercase text-cyan-100">
                        {memory.type}
                      </span>
                      <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[10px] font-medium uppercase text-amber-100">
                        importance {memory.importance}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{memory.content}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      title="Modifica"
                      onClick={() => startEdit(memory)}
                      className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-slate-300 transition hover:bg-white/10"
                    >
                      <Edit3 size={15} />
                    </button>
                    <LoadingButton
                      type="button"
                      title="Elimina"
                      loading={deletingId === memory.id}
                      loadingLabel="..."
                      onClick={() => void remove(memory)}
                      className="grid h-9 w-9 place-items-center rounded-xl border border-rose-300/20 text-rose-100 transition hover:bg-rose-300/10"
                    >
                      <Trash2 size={15} />
                    </LoadingButton>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  {memory.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 px-2 py-1">
                      {tag}
                    </span>
                  ))}
                  <span className="rounded-full border border-white/10 px-2 py-1">source: {memory.source}</span>
                  <span className="rounded-full border border-white/10 px-2 py-1">{formatDate(memory.updatedAt)}</span>
                </div>
              </article>
            ))}
          </div>

          {visibleMemories.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/8 p-6 text-sm text-slate-400 backdrop-blur-xl">
              Nessuna memoria trovata.
            </div>
          ) : null}
        </div>

        <div className="h-fit rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-white">{editingId ? "Modifica memoria" : "Nuova memoria"}</h3>
            {editingId ? (
              <button type="button" onClick={resetForm} className="text-xs font-medium text-slate-400 transition hover:text-white">
                Annulla
              </button>
            ) : null}
          </div>

          {error ? <div className="mt-3 rounded-xl border border-rose-300/25 bg-rose-300/10 p-3 text-sm text-rose-100">{error}</div> : null}

          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-xs text-slate-500">
              Title
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className="h-11 rounded-xl border border-white/10 bg-slate-950/50 px-3 text-sm text-white outline-none focus:border-cyan-300/45"
              />
            </label>

            <label className="grid gap-1 text-xs text-slate-500">
              Type
              <select
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as MemoryType }))}
                className="h-11 rounded-xl border border-white/10 bg-slate-950/50 px-3 text-sm text-white outline-none focus:border-cyan-300/45"
              >
                {memoryTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-xs text-slate-500">
              Content
              <textarea
                value={form.content}
                onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                rows={7}
                className="resize-none rounded-xl border border-white/10 bg-slate-950/50 p-3 text-sm leading-6 text-white outline-none focus:border-cyan-300/45"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs text-slate-500">
                Importance
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={form.importance}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, importance: Number.parseInt(event.target.value, 10) || 3 }))
                  }
                  className="h-11 rounded-xl border border-white/10 bg-slate-950/50 px-3 text-sm text-white outline-none focus:border-cyan-300/45"
                />
              </label>

              <label className="grid gap-1 text-xs text-slate-500">
                Source
                <input
                  value={form.source}
                  onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))}
                  className="h-11 rounded-xl border border-white/10 bg-slate-950/50 px-3 text-sm text-white outline-none focus:border-cyan-300/45"
                />
              </label>
            </div>

            <label className="grid gap-1 text-xs text-slate-500">
              Tags
              <input
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                placeholder="docker, deploy, linkedin"
                className="h-11 rounded-xl border border-white/10 bg-slate-950/50 px-3 text-sm text-white outline-none focus:border-cyan-300/45"
              />
            </label>

            <LoadingButton
              type="button"
              loading={saving}
              loadingLabel="Salvataggio..."
              onClick={() => void save()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
            >
              {editingId ? "Salva memoria" : "Crea memoria"}
            </LoadingButton>
          </div>
        </div>
      </div>
    </section>
  );
}
