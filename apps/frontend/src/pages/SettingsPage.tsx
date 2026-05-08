import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { getGeneralErrorMessage } from "../api/error";
import { FieldError } from "../components/forms/FieldError";
import { FormError } from "../components/forms/FormError";
import { LoadingButton } from "../components/forms/LoadingButton";
import { useToast } from "../components/toast/ToastProvider";
import type { BrandProfile, Notification, SystemStatus } from "../types/domain";
import { formatDate } from "../utils/format";
import { fieldErrorsFromApi, hasFieldErrors, maxLengthError, type FieldErrors } from "../utils/formErrors";

type Props = {
  status?: SystemStatus | null;
  brandProfile?: BrandProfile | null;
  notifications: Notification[];
  onSaveBrandProfile: (body: Partial<BrandProfile>) => Promise<void>;
  onMarkNotificationsRead: () => Promise<void>;
  onMarkNotificationRead: (notificationId: string) => Promise<void>;
};

type BrandProfileField =
  | "ownerName"
  | "bio"
  | "services"
  | "technicalStack"
  | "toneOfVoice"
  | "targetClients"
  | "businessGoals"
  | "topicsToPush"
  | "topicsToAvoid"
  | "goodPostExamples"
  | "bannedWords";

const fields: Array<{ key: BrandProfileField; label: string; rows: number; max: number }> = [
  { key: "ownerName", label: "Chi sono", rows: 2, max: 160 },
  { key: "bio", label: "Bio / posizionamento", rows: 3, max: 4000 },
  { key: "services", label: "Servizi offerti", rows: 3, max: 4000 },
  { key: "technicalStack", label: "Stack tecnico", rows: 3, max: 3000 },
  { key: "toneOfVoice", label: "Tono comunicativo", rows: 3, max: 3000 },
  { key: "targetClients", label: "Target clienti", rows: 3, max: 3000 },
  { key: "businessGoals", label: "Obiettivi commerciali", rows: 3, max: 3000 },
  { key: "topicsToPush", label: "Argomenti da spingere", rows: 3, max: 3000 },
  { key: "topicsToAvoid", label: "Argomenti da evitare", rows: 3, max: 3000 },
  { key: "goodPostExamples", label: "Esempi di post buoni", rows: 4, max: 6000 },
  { key: "bannedWords", label: "Parole/frasi da evitare", rows: 3, max: 3000 }
];

const fieldKeys = fields.map((field) => field.key);

function validateBrandProfile(form: Partial<BrandProfile>) {
  const errors: FieldErrors<BrandProfileField> = {};

  for (const field of fields) {
    const value = String(form[field.key] ?? "");
    const error = maxLengthError(value, field.max);
    if (error) {
      errors[field.key] = error;
    }
  }

  return errors;
}

export function SettingsPage({
  status,
  brandProfile,
  notifications,
  onSaveBrandProfile,
  onMarkNotificationsRead,
  onMarkNotificationRead
}: Props) {
  const [form, setForm] = useState<Partial<BrandProfile>>({});
  const [saving, setSaving] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const [markingNotificationId, setMarkingNotificationId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<BrandProfileField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (brandProfile) {
      setForm(brandProfile);
    }
  }, [brandProfile]);

  async function save() {
    const nextErrors = validateBrandProfile(form);
    setFieldErrors(nextErrors);
    setFormError(null);

    if (hasFieldErrors(nextErrors)) {
      const message = "Alcuni campi superano il limite massimo.";
      setFormError(message);
      toast.warning("Profilo non salvato", message);
      return;
    }

    setSaving(true);
    try {
      await onSaveBrandProfile(form);
      setFieldErrors({});
      setFormError(null);
      toast.success("Profilo salvato correttamente");
    } catch (err) {
      const message = getGeneralErrorMessage(err);
      const apiFieldErrors = fieldErrorsFromApi(err, fieldKeys);
      setFieldErrors(apiFieldErrors);
      setFormError(message);
      toast.error("Errore salvataggio profilo", message);
    } finally {
      setSaving(false);
    }
  }

  async function markRead() {
    setMarkingRead(true);
    try {
      await onMarkNotificationsRead();
      toast.success("Notifiche segnate come lette");
    } catch (err) {
      toast.error("Operazione non riuscita", getGeneralErrorMessage(err));
    } finally {
      setMarkingRead(false);
    }
  }

  async function markSingleRead(notificationId: string) {
    setMarkingNotificationId(notificationId);
    try {
      await onMarkNotificationRead(notificationId);
      toast.success("Notifica segnata come letta");
    } catch (err) {
      toast.error("Operazione non riuscita", getGeneralErrorMessage(err));
    } finally {
      setMarkingNotificationId(null);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-white">Settings</h2>
        <p className="mt-1 text-sm text-slate-500">Brand profile, provider AI, scheduler e notifiche operative.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <SettingCard label="AI provider" value={status?.aiProvider ?? "mock"} />
        <SettingCard label="Scheduler" value={status?.schedulerEnabled ? "enabled" : "disabled"} />
        <SettingCard label="Telegram" value={status?.telegram?.enabled ? "enabled" : "disabled"} />
        <SettingCard label="LinkedIn" value={status?.linkedin?.enabled ? "prepared" : "disabled"} />
        <SettingCard label="Approvals" value={`${status?.counts.approvalDrafts ?? 0}`} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Brand Profile</h3>
            <p className="mt-1 text-sm text-slate-500">Usato da InstaSpark, LinkForge e Overseer per evitare output generici.</p>
          </div>
          <LoadingButton
            type="button"
            loading={saving}
            loadingLabel="Salvataggio..."
            onClick={() => void save()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-45"
          >
            <Save size={16} />
            Salva profilo
          </LoadingButton>
        </div>
        <div className="mt-4">
          <FormError message={formError} />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {fields.map((field) => {
            const value = String(form[field.key] ?? "");
            const hasError = Boolean(fieldErrors[field.key]);

            return (
              <label key={field.key} className="grid gap-1 text-xs text-slate-500">
                <span className="flex items-center justify-between gap-3">
                  <span>{field.label}</span>
                  <span className={value.length > field.max ? "text-rose-200" : "text-slate-600"}>
                    {value.length}/{field.max}
                  </span>
                </span>
                <textarea
                  value={value}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setForm((current) => ({ ...current, [field.key]: nextValue }));
                    setFieldErrors((current) => ({
                      ...current,
                      [field.key]: maxLengthError(nextValue, field.max)
                    }));
                  }}
                  rows={field.rows}
                  aria-invalid={hasError}
                  className={`resize-none rounded-xl border bg-slate-950/50 p-3 text-sm leading-6 text-white outline-none transition focus:border-cyan-300/45 ${
                    hasError ? "border-rose-300/50" : "border-white/10"
                  }`}
                />
                <FieldError message={fieldErrors[field.key]} />
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
          <h3 className="text-base font-semibold text-white">Integration guardrails</h3>
          <div className="mt-4 grid gap-3 text-sm text-slate-300">
            <p className="rounded-xl border border-white/10 bg-slate-950/35 p-3">Le API social non sono collegate: nessuna pubblicazione automatica.</p>
            <p className="rounded-xl border border-white/10 bg-slate-950/35 p-3">Ogni bozza social resta in approvazione manuale.</p>
            <p className="rounded-xl border border-white/10 bg-slate-950/35 p-3">Lo scheduler puo creare task e bozze, ma resta spento finche non viene abilitato via env.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-white">Notifiche recenti</h3>
            <LoadingButton
              type="button"
              disabled={notifications.length === 0}
              loading={markingRead}
              loadingLabel="Salvataggio..."
              onClick={() => void markRead()}
              className="inline-flex h-9 items-center rounded-xl border border-white/10 px-3 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-45"
            >
              Segna lette
            </LoadingButton>
          </div>
          <div className="mt-4 space-y-3">
            {notifications.slice(0, 8).map((notification) => (
              <div key={notification.id} className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-100">{notification.title}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase text-slate-500">
                      {notification.status}
                    </span>
                    {notification.status === "unread" ? (
                      <LoadingButton
                        type="button"
                        loading={markingNotificationId === notification.id}
                        loadingLabel="..."
                        onClick={() => void markSingleRead(notification.id)}
                        className="h-7 rounded-lg border border-white/10 px-2 text-[10px] font-medium uppercase text-slate-300 transition hover:bg-white/10"
                      >
                        Letta
                      </LoadingButton>
                    ) : null}
                  </div>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-400">{notification.message}</p>
                <p className="mt-2 text-xs text-slate-600">{formatDate(notification.createdAt)}</p>
              </div>
            ))}
            {notifications.length === 0 ? <p className="text-sm text-slate-500">Nessuna notifica.</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function SettingCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
