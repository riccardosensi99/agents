import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate";
import {
  createMemoryController,
  deleteMemoryController,
  listMemoryController,
  updateMemoryController
} from "./memory.controller";
import { memoryListQuerySchema, memoryMutationSchema, memoryParamsSchema, memoryPatchSchema } from "./memory.schemas";

export const memoryRoutes = Router();

memoryRoutes.get("/", validateQuery(memoryListQuerySchema), asyncHandler(listMemoryController));
memoryRoutes.post("/", validateBody(memoryMutationSchema), asyncHandler(createMemoryController));
memoryRoutes.patch(
  "/:id",
  validateParams(memoryParamsSchema),
  validateBody(memoryPatchSchema),
  asyncHandler(updateMemoryController)
);
memoryRoutes.delete("/:id", validateParams(memoryParamsSchema), asyncHandler(deleteMemoryController));
