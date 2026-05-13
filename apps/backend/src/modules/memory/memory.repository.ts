import { prisma } from "../../db/prisma";
import type { MemoryListFilters, MemoryMutationInput } from "./memory.types";

const db = prisma as any;

export async function listMemoryEntries(filters: MemoryListFilters = {}) {
  const where: Record<string, unknown> = {};
  const search = filters.search?.trim();

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.tag) {
    where.tags = { has: filters.tag.toLowerCase() };
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
      { tags: { has: search.toLowerCase() } }
    ];
  }

  return db.memoryEntry.findMany({
    where,
    orderBy: [{ importance: "desc" }, { updatedAt: "desc" }]
  });
}

export async function createMemoryEntry(input: MemoryMutationInput) {
  return db.memoryEntry.create({ data: input });
}

export async function findMemoryEntry(id: string) {
  return db.memoryEntry.findUnique({ where: { id } });
}

export async function updateMemoryEntry(id: string, input: Partial<MemoryMutationInput>) {
  return db.memoryEntry.update({
    where: { id },
    data: input
  });
}

export async function deleteMemoryEntry(id: string) {
  return db.memoryEntry.delete({ where: { id } });
}

export async function findMemoryCandidates(params: { tags: string[]; terms: string[]; types?: string[]; take?: number }) {
  const or: Record<string, unknown>[] = [];

  if (params.tags.length > 0) {
    or.push({ tags: { hasSome: params.tags } });
  }

  if (params.types && params.types.length > 0) {
    or.push({ type: { in: params.types } });
  }

  for (const term of params.terms.slice(0, 8)) {
    or.push({ title: { contains: term, mode: "insensitive" } });
    or.push({ content: { contains: term, mode: "insensitive" } });
  }

  return db.memoryEntry.findMany({
    where: or.length > 0 ? { OR: or } : {},
    orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
    take: params.take ?? 80
  });
}

export async function findTopMemoryEntries(take: number) {
  return db.memoryEntry.findMany({
    orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
    take
  });
}
