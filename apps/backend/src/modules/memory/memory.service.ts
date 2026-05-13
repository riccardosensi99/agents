import type { MemoryType } from "@prisma/client";
import { notFound } from "../../lib/errors";
import {
  createMemoryEntry,
  deleteMemoryEntry,
  findMemoryCandidates,
  findMemoryEntry,
  findTopMemoryEntries,
  listMemoryEntries,
  updateMemoryEntry
} from "./memory.repository";
import type { MemoryEntryDto, MemoryEntryRecord, MemoryListFilters, MemoryMutationInput, RelevantMemoryInput } from "./memory.types";

const stopWords = new Set([
  "con",
  "che",
  "per",
  "una",
  "uno",
  "the",
  "and",
  "for",
  "from",
  "this",
  "that",
  "post",
  "task"
]);

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

export function serializeMemoryEntry(entry: MemoryEntryRecord): MemoryEntryDto {
  return {
    id: entry.id,
    title: entry.title,
    content: entry.content,
    type: entry.type,
    tags: entry.tags,
    importance: entry.importance,
    source: entry.source,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt
  };
}

export async function getMemoryEntries(filters: MemoryListFilters) {
  const entries = await listMemoryEntries(filters);
  return entries.map(serializeMemoryEntry);
}

export async function addMemoryEntry(input: MemoryMutationInput) {
  const entry = await createMemoryEntry(normalizeMemoryInput(input));
  return serializeMemoryEntry(entry);
}

export async function patchMemoryEntry(id: string, input: Partial<MemoryMutationInput>) {
  const existing = await findMemoryEntry(id);
  if (!existing) {
    throw notFound("Memory entry");
  }

  const entry = await updateMemoryEntry(id, normalizeMemoryInput(input));
  return serializeMemoryEntry(entry);
}

export async function removeMemoryEntry(id: string) {
  const existing = await findMemoryEntry(id);
  if (!existing) {
    throw notFound("Memory entry");
  }

  await deleteMemoryEntry(id);
}

export async function getRelevantMemories(params: RelevantMemoryInput): Promise<MemoryEntryDto[]> {
  const terms = tokenize(params.prompt);
  const types = findMemoryTypes(terms);
  const tags = Array.from(
    new Set(
      [params.platform, params.agentSlug, ...terms]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.toLowerCase())
      )
  );
  const candidates = await findMemoryCandidates({ tags, terms, types, take: 80 });
  const fallback = candidates.length > 0 ? candidates : await findTopMemoryEntries(params.limit ?? 8);

  return fallback
    .map((entry: MemoryEntryRecord) => ({
      entry,
      score: scoreMemory(entry, { tags, terms, types, platform: params.platform, agentSlug: params.agentSlug })
    }))
    .sort((left: { score: number }, right: { score: number }) => right.score - left.score)
    .slice(0, params.limit ?? 8)
    .map(({ entry }: { entry: MemoryEntryRecord }) => serializeMemoryEntry(entry));
}

export function buildMemoryContext(memories: MemoryEntryDto[]) {
  if (memories.length === 0) {
    return "EXPERIENCE MEMORY\nNo founder memory matched this task. Avoid inventing personal anecdotes.";
  }

  return [
    "EXPERIENCE MEMORY",
    "Use these founder memories as grounding. Reuse the lesson/opinion, not the exact wording unless it fits naturally.",
    ...memories.map((memory, index) =>
      [
        `${index + 1}. [${memory.type} | importance ${memory.importance} | tags: ${memory.tags.join(", ") || "none"}]`,
        `Title: ${memory.title}`,
        `Memory: ${memory.content}`,
        `Source: ${memory.source}`
      ].join("\n")
    )
  ].join("\n\n");
}

function normalizeMemoryInput<T extends Partial<MemoryMutationInput>>(input: T): T {
  return {
    ...input,
    ...(input.tags ? { tags: Array.from(new Set(input.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))) } : {})
  };
}

function tokenize(value: string) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .map((term) => term.trim())
        .filter((term) => term.length >= 3 && !stopWords.has(term))
    )
  ).slice(0, 20);
}

function findMemoryTypes(terms: string[]) {
  const normalizedTerms = new Set(terms.map((term) => term.replace(/-/g, "_").toUpperCase()));

  return memoryTypes.filter((type) => normalizedTerms.has(type) || normalizedTerms.has(type.toLowerCase().replace(/_/g, "-").toUpperCase()));
}

function scoreMemory(
  entry: MemoryEntryRecord,
  params: { tags: string[]; terms: string[]; types: MemoryType[]; platform: string | undefined; agentSlug: string | undefined }
) {
  const title = entry.title.toLowerCase();
  const content = entry.content.toLowerCase();
  const entryTags = entry.tags.map((tag) => tag.toLowerCase());
  const tagMatches = params.tags.filter((tag) => entryTags.includes(tag)).length;
  const titleMatches = params.terms.filter((term) => title.includes(term)).length;
  const contentMatches = params.terms.filter((term) => content.includes(term)).length;
  const typeBonus = params.types.includes(entry.type) ? 10 : 0;
  const platformBonus = params.platform && entryTags.includes(params.platform) ? 12 : 0;
  const agentBonus = params.agentSlug && entryTags.includes(params.agentSlug) ? 8 : 0;

  return entry.importance * 10 + tagMatches * 8 + titleMatches * 5 + contentMatches * 2 + typeBonus + platformBonus + agentBonus + typeWeight(entry.type);
}

function typeWeight(type: MemoryType) {
  if (type === "CLIENT_CASE" || type === "CONTENT_EXAMPLE") {
    return 5;
  }

  if (type === "OPINION" || type === "LESSON") {
    return 4;
  }

  if (type === "MISTAKE" || type === "DEPLOY") {
    return 3;
  }

  return 0;
}
