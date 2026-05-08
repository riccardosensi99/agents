import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import type { BrandProfile, Notification, SystemStatus } from "../types/domain";
import { formatDate } from "../utils/format";

type Props = {
  status?: SystemStatus | null;
  brandProfile?: BrandProfile | null;
  notifications: Notification[];
  onSaveBrandProfile: (body: Partial<BrandProfile>) => Promise<void>;
  onMarkNotificationsRead: () => Promise<void>;
};

const fields: Array<{ key: keyof BrandProfile; label: string; rows: number }> = [
  { key: "ownerName", label: "Chi sono", rows: 2 },
  { key: "bio", label: "Bio / posizionamento", rows: 3 },
  { key: "services", label: "Servizi offerti", rows: 3 },
  { key: "technicalStack", label: "Stack tecnico", rows: 3 },
  { key: "toneOfVoice", label: "Tono comunicativo", rows: 3 },
  { key: "targetClients", label: "Target clienti", rows: 3 },
  { key: "businessGoals", label: "Obiettivi commerciali", rows: 3 },
  { key: "topicsToPush", label: "Argomenti da spingere", rows: 3 },
  { key: "topicsToAvoid", label: "Argomenti da evitare", rows: 3 },
  { key: "goodPostExamples", label: "Esempi di post buoni", rows: 4 },
  { key: "bannedWords", label: "Parole/frasi da evitare", rows: 3 }
];

export function SettingsPage({ status, brandProfile, notifications, onSaveBrandProfile, onMarkNotificationsRead }: Props) {
  const [form, setForm] = useState<Partial<BrandProfile>>({});
  const [saving, setSaving] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);

  useEffect(() => {
    if (brandProfile) {
      setForm(brandProfile);
    }
  }, [brandProfile]);

  async function save() {
    setSaving(true);
    try {
      await onSaveBrandProfile(form);
    } finally {
      setSaving(false);
    }
  }

  async function markRead() {
    setMarkingRead(true);
    try {
      await onMarkNotificationsRead();
    } finally {
      setMarkingRead(false);
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
        <SettingCard label="Social publishing" value={status?.socialPublishing ?? "disabled"} />
        <SettingCard label="Approvals" value={`${status?.counts.approvalDrafts ?? 0}`} />
        <SettingCard label="Unread" value={`${status?.unreadNotifications ?? 0}`} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Brand Profile</h3>
            <p className="mt-1 text-sm text-slate-500">Usato da InstaSpark, LinkForge e Overseer per evitare output generici.</p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-45"
          >
            <Save size={16} />
            Salva profilo
          </button>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {fields.map((field) => (
            <label key={field.key} className="grid gap-1 text-xs text-slate-500">
              {field.label}
              <textarea
                value={String(form[field.key] ?? "")}
                onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                rows={field.rows}
                className="resize-none rounded-xl border border-white/10 bg-slate-950/50 p-3 text-sm leading-6 text-white outline-none transition focus:border-cyan-300/45"
              />
            </label>
          ))}
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
            <button
              type="button"
              disabled={markingRead || notifications.length === 0}
              onClick={() => void markRead()}
              className="inline-flex h-9 items-center rounded-xl border border-white/10 px-3 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-45"
            >
              Segna lette
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {notifications.slice(0, 8).map((notification) => (
              <div key={notification.id} className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-100">{notification.title}</p>
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase text-slate-500">
                    {notification.status}
                  </span>
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
