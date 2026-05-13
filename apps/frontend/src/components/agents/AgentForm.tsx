import { Bot, Code2, Flame, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import type { AgentMutationInput } from "../../api/client";
import type { Agent, AgentStatus, Platform } from "../../types/domain";
import { FieldError } from "../forms/FieldError";
import { FormError } from "../forms/FormError";
import { LoadingButton } from "../forms/LoadingButton";

export type AgentFormValues = AgentMutationInput & {
  platformTarget?: Platform;
  basePrompt?: string;
};

type Props = {
  agent?: Agent | null | undefined;
  submitLabel: string;
  loading?: boolean | undefined;
  error?: string | null | undefined;
  onSubmit: (values: AgentFormValues) => Promise<void>;
};

type FieldErrors = Partial<Record<"name" | "slug" | "role" | "description" | "avatarType" | "configJson", string | undefined>>;

type AvatarPaletteKey = "mint" | "rose" | "blue" | "amber" | "violet";
type AvatarVisualRole = "operator" | "builder" | "analyst" | "coordinator";

const customAvatarType = "custom-operator";

const avatarOptions = [
  {
    value: "instaspark",
    label: "Creator operator",
    description: "Warm social media companion",
    icon: Flame
  },
  {
    value: "linkforge",
    label: "Dev operator",
    description: "Focused technical companion",
    icon: Code2
  },
  {
    value: "overseer",
    label: "Supervisor",
    description: "Large control-room operator",
    icon: ShieldCheck
  },
  {
    value: customAvatarType,
    label: "Custom fallback",
    description: "Uses safe generated fallback",
    icon: Bot
  }
];

const avatarPaletteOptions: Array<{ value: AvatarPaletteKey; label: string; swatch: string; accent: string }> = [
  { value: "mint", label: "Mint", swatch: "bg-emerald-300", accent: "border-emerald-300/60" },
  { value: "rose", label: "Rose", swatch: "bg-pink-300", accent: "border-pink-300/60" },
  { value: "blue", label: "Blue", swatch: "bg-blue-300", accent: "border-blue-300/60" },
  { value: "amber", label: "Amber", swatch: "bg-amber-300", accent: "border-amber-300/60" },
  { value: "violet", label: "Violet", swatch: "bg-violet-300", accent: "border-violet-300/60" }
];

const avatarRoleOptions: Array<{ value: AvatarVisualRole; label: string }> = [
  { value: "operator", label: "Operator" },
  { value: "builder", label: "Builder" },
  { value: "analyst", label: "Analyst" },
  { value: "coordinator", label: "Coordinator" }
];

const statusOptions: AgentStatus[] = ["idle", "working", "waiting_approval", "error"];

const platformOptions: Array<{ value: Platform | ""; label: string }> = [
  { value: "", label: "No default" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "internal", label: "Internal" }
];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const isAvatarPaletteKey = (value: unknown): value is AvatarPaletteKey =>
  avatarPaletteOptions.some((option) => option.value === value);

const isAvatarVisualRole = (value: unknown): value is AvatarVisualRole =>
  avatarRoleOptions.some((option) => option.value === value);

export function AgentForm({ agent, submitLabel, loading = false, error, onSubmit }: Props) {
  const initialConfig = useMemo(() => asRecord(agent?.config), [agent]);
  const initialAvatarVisual = useMemo(() => asRecord(initialConfig.avatarVisual), [initialConfig]);
  const [name, setName] = useState(agent?.name ?? "");
  const [slug, setSlug] = useState(agent?.slug ?? "");
  const [role, setRole] = useState(agent?.role ?? "");
  const [description, setDescription] = useState(agent?.description ?? "");
  const [status, setStatus] = useState<AgentStatus>(agent?.status ?? "idle");
  const [avatarType, setAvatarType] = useState(agent?.avatarType ?? customAvatarType);
  const [avatarPalette, setAvatarPalette] = useState<AvatarPaletteKey>(
    isAvatarPaletteKey(initialAvatarVisual.palette) ? initialAvatarVisual.palette : "mint"
  );
  const [avatarVisualRole, setAvatarVisualRole] = useState<AvatarVisualRole>(
    isAvatarVisualRole(initialAvatarVisual.role) ? initialAvatarVisual.role : "operator"
  );
  const [platformTarget, setPlatformTarget] = useState<Platform | "">(
    (initialConfig.platformTarget as Platform | undefined) ?? ""
  );
  const [basePrompt, setBasePrompt] = useState(String(initialConfig.basePrompt ?? ""));
  const [configJson, setConfigJson] = useState(
    JSON.stringify(
      Object.fromEntries(
        Object.entries(initialConfig).filter(
          ([key]) => key !== "platformTarget" && key !== "basePrompt" && key !== "avatarVisual"
        )
      ),
      null,
      2
    )
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  function validate() {
    const errors: FieldErrors = {};
    const trimmedSlug = slug.trim();

    if (name.trim().length < 2) {
      errors.name = "Minimo 2 caratteri.";
    } else if (name.length > 80) {
      errors.name = "Massimo 80 caratteri.";
    }

    if (trimmedSlug && !/^[a-z0-9-]+$/.test(trimmedSlug)) {
      errors.slug = "Usa solo lettere minuscole, numeri e trattini.";
    } else if (trimmedSlug.length > 80) {
      errors.slug = "Massimo 80 caratteri.";
    }

    if (role.trim().length < 2) {
      errors.role = "Minimo 2 caratteri.";
    } else if (role.length > 120) {
      errors.role = "Massimo 120 caratteri.";
    }

    if (description.trim().length < 2) {
      errors.description = "Minimo 2 caratteri.";
    } else if (description.length > 1000) {
      errors.description = "Massimo 1000 caratteri.";
    }

    if (avatarType.trim().length < 2) {
      errors.avatarType = "Seleziona un avatar.";
    } else if (avatarType.length > 80) {
      errors.avatarType = "Massimo 80 caratteri.";
    }

    try {
      JSON.parse(configJson || "{}");
    } catch {
      errors.configJson = "JSON non valido.";
    }

    return errors;
  }

  async function submit() {
    const errors = validate();
    setFieldErrors(errors);
    setFormError(null);

    if (Object.values(errors).some(Boolean)) {
      setFormError("Controlla i campi evidenziati.");
      return;
    }

    const extraConfig = JSON.parse(configJson || "{}") as Record<string, unknown>;
    const avatarVisual =
      avatarType === customAvatarType
        ? {
            palette: avatarPalette,
            role: avatarVisualRole
          }
        : undefined;
    const config = {
      ...extraConfig,
      ...(avatarVisual ? { avatarVisual } : {}),
      ...(platformTarget ? { platformTarget } : {}),
      ...(basePrompt.trim() ? { basePrompt: basePrompt.trim() } : {})
    };

    await onSubmit({
      name: name.trim(),
      ...(slug.trim() ? { slug: slug.trim() } : {}),
      role: role.trim(),
      description: description.trim(),
      status,
      avatarType,
      config,
      ...(platformTarget ? { platformTarget } : {}),
      ...(basePrompt.trim() ? { basePrompt: basePrompt.trim() } : {})
    });
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <FormError message={formError ?? error} />

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-xs text-slate-500">
          Name
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (!slug && !agent) {
                setSlug(slugify(event.target.value));
              }
              setFieldErrors((current) => ({ ...current, name: undefined }));
            }}
            className={`h-11 rounded-xl border bg-slate-950/50 px-3 text-sm text-white outline-none focus:border-cyan-300/45 ${
              fieldErrors.name ? "border-rose-300/50" : "border-white/10"
            }`}
          />
          <FieldError message={fieldErrors.name} />
        </label>

        <label className="grid gap-1 text-xs text-slate-500">
          Slug
          <input
            value={slug}
            onChange={(event) => {
              setSlug(slugify(event.target.value));
              setFieldErrors((current) => ({ ...current, slug: undefined }));
            }}
            placeholder="auto-generated"
            className={`h-11 rounded-xl border bg-slate-950/50 px-3 text-sm text-white outline-none focus:border-cyan-300/45 ${
              fieldErrors.slug ? "border-rose-300/50" : "border-white/10"
            }`}
          />
          <FieldError message={fieldErrors.slug} />
        </label>
      </div>

      <label className="grid gap-1 text-xs text-slate-500">
        Role
        <input
          value={role}
          onChange={(event) => {
            setRole(event.target.value);
            setFieldErrors((current) => ({ ...current, role: undefined }));
          }}
          className={`h-11 rounded-xl border bg-slate-950/50 px-3 text-sm text-white outline-none focus:border-cyan-300/45 ${
            fieldErrors.role ? "border-rose-300/50" : "border-white/10"
          }`}
        />
        <FieldError message={fieldErrors.role} />
      </label>

      <label className="grid gap-1 text-xs text-slate-500">
        Description
        <textarea
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
            setFieldErrors((current) => ({ ...current, description: undefined }));
          }}
          rows={4}
          className={`resize-none rounded-xl border bg-slate-950/50 p-3 text-sm leading-6 text-white outline-none focus:border-cyan-300/45 ${
            fieldErrors.description ? "border-rose-300/50" : "border-white/10"
          }`}
        />
        <div className="flex items-center justify-between gap-3">
          <FieldError message={fieldErrors.description} />
          <span className={description.length > 1000 ? "text-rose-200" : "text-slate-600"}>{description.length}/1000</span>
        </div>
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-xs text-slate-500">
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as AgentStatus)}
            className="h-11 rounded-xl border border-white/10 bg-slate-950/50 px-3 text-sm text-white outline-none focus:border-cyan-300/45"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs text-slate-500">
          Platform target
          <select
            value={platformTarget}
            onChange={(event) => setPlatformTarget(event.target.value as Platform | "")}
            className="h-11 rounded-xl border border-white/10 bg-slate-950/50 px-3 text-sm text-white outline-none focus:border-cyan-300/45"
          >
            {platformOptions.map((option) => (
              <option key={option.value || "none"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-2">
        <p className="text-xs text-slate-500">Avatar archetype</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {avatarOptions.map((option) => {
            const Icon = option.icon;
            const selected = avatarType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setAvatarType(option.value);
                  setFieldErrors((current) => ({ ...current, avatarType: undefined }));
                }}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                  selected
                    ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-50"
                    : "border-white/10 bg-slate-950/35 text-slate-300 hover:bg-white/8"
                }`}
              >
                <Icon className="mt-0.5 shrink-0" size={18} />
                <span>
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="mt-1 block text-xs text-slate-500">{option.description}</span>
                </span>
              </button>
            );
          })}
        </div>
        <FieldError message={fieldErrors.avatarType} />
      </div>

      {avatarType === customAvatarType ? (
        <div className="grid gap-3 rounded-xl border border-white/10 bg-slate-950/35 p-3">
          <div className="grid gap-2">
            <p className="text-xs text-slate-500">Custom palette</p>
            <div className="flex flex-wrap gap-2">
              {avatarPaletteOptions.map((option) => {
                const selected = avatarPalette === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    title={option.label}
                    onClick={() => setAvatarPalette(option.value)}
                    className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition ${
                      selected
                        ? `${option.accent} bg-white/10 text-white`
                        : "border-white/10 bg-slate-950/40 text-slate-400 hover:bg-white/8"
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-full ${option.swatch}`} />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="grid gap-1 text-xs text-slate-500">
            Visual role
            <select
              value={avatarVisualRole}
              onChange={(event) => setAvatarVisualRole(event.target.value as AvatarVisualRole)}
              className="h-11 rounded-xl border border-white/10 bg-slate-950/50 px-3 text-sm text-white outline-none focus:border-cyan-300/45"
            >
              {avatarRoleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <label className="grid gap-1 text-xs text-slate-500">
        Base prompt / agent instruction
        <textarea
          value={basePrompt}
          onChange={(event) => setBasePrompt(event.target.value)}
          rows={3}
          placeholder="Optional custom instruction used by future agent runners"
          className="resize-none rounded-xl border border-white/10 bg-slate-950/50 p-3 text-sm leading-6 text-white outline-none focus:border-cyan-300/45"
        />
      </label>

      <label className="grid gap-1 text-xs text-slate-500">
        Extra config JSON
        <textarea
          value={configJson}
          onChange={(event) => {
            setConfigJson(event.target.value);
            setFieldErrors((current) => ({ ...current, configJson: undefined }));
          }}
          rows={5}
          className={`resize-none rounded-xl border bg-slate-950/50 p-3 font-mono text-xs leading-5 text-white outline-none focus:border-cyan-300/45 ${
            fieldErrors.configJson ? "border-rose-300/50" : "border-white/10"
          }`}
        />
        <FieldError message={fieldErrors.configJson} />
      </label>

      <div className="flex justify-end">
        <LoadingButton
          type="submit"
          loading={loading}
          loadingLabel="Salvataggio..."
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
        >
          {submitLabel}
        </LoadingButton>
      </div>
    </form>
  );
}
