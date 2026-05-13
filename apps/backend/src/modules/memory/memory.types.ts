import type { MemoryEntry, MemoryType, Platform } from "@prisma/client";

export type MemoryEntryDto = {
  id: string;
  title: string;
  content: string;
  type: MemoryType;
  tags: string[];
  importance: number;
  source: string;
  createdAt: Date;
  updatedAt: Date;
};

export type MemoryListFilters = {
  search?: string;
  type?: MemoryType;
  tag?: string;
};

export type MemoryMutationInput = {
  title: string;
  content: string;
  type: MemoryType;
  tags: string[];
  importance: number;
  source: string;
};

export type RelevantMemoryInput = {
  prompt: string;
  platform?: Platform | "internal";
  agentSlug?: string;
  limit?: number;
};

export type MemoryEntryRecord = MemoryEntry;
