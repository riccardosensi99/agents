import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { validateBody } from "../../middleware/validate";
import { getOrCreateBrandProfile, updateBrandProfile } from "../../services/brand/brandProfileService";
import { updateBrandProfileSchema } from "./settings.schemas";

export const settingsRoutes = Router();

settingsRoutes.get(
  "/brand-profile",
  asyncHandler(async (req, res) => {
    if (!req.user?.id) {
      throw new AppError(401, "Authenticated user missing");
    }

    const profile = await getOrCreateBrandProfile(req.user.id);
    res.json({ data: profile });
  })
);

settingsRoutes.put(
  "/brand-profile",
  validateBody(updateBrandProfileSchema),
  asyncHandler(async (req, res) => {
    if (!req.user?.id) {
      throw new AppError(401, "Authenticated user missing");
    }

    const profile = await updateBrandProfile(req.user.id, req.body);
    res.json({ data: profile });
  })
);
