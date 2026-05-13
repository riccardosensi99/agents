import type { Request, Response } from "express";
import { AppError } from "../../lib/errors";
import { addMemoryEntry, getMemoryEntries, patchMemoryEntry, removeMemoryEntry } from "./memory.service";
import type { MemoryListFilters, MemoryMutationInput } from "./memory.types";

const paramId = (id: string | undefined) => {
  if (!id) {
    throw new AppError(400, "Missing route id");
  }

  return id;
};

export async function listMemoryController(req: Request, res: Response) {
  const entries = await getMemoryEntries(req.query as MemoryListFilters);
  res.json({ data: entries });
}

export async function createMemoryController(req: Request, res: Response) {
  const entry = await addMemoryEntry(req.body as MemoryMutationInput);
  res.status(201).json({ data: entry });
}

export async function updateMemoryController(req: Request, res: Response) {
  const entry = await patchMemoryEntry(paramId(req.params.id), req.body as Partial<MemoryMutationInput>);
  res.json({ data: entry });
}

export async function deleteMemoryController(req: Request, res: Response) {
  await removeMemoryEntry(paramId(req.params.id));
  res.status(204).send();
}
