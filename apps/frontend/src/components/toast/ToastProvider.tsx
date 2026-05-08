import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";

export type ToastVariant = "success" | "error" | "warning" | "info";

type Toast = {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string | undefined;
};

type ToastInput = {
  variant: ToastVariant;
  title: string;
  message?: string | undefined;
};

type ToastContextValue = {
  push: (toast: ToastInput) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const variantStyles: Record<ToastVariant, string> = {
  success: "border-emerald-300/25 bg-emerald-300/12 text-emerald-50",
  error: "border-rose-300/25 bg-rose-300/12 text-rose-50",
  warning: "border-amber-300/25 bg-amber-300/12 text-amber-50",
  info: "border-cyan-300/25 bg-cyan-300/12 text-cyan-50"
};

const icons: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: TriangleAlert,
  info: Info
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (toast: ToastInput) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { ...toast, id }].slice(-4));
      window.setTimeout(() => remove(id), toast.variant === "error" ? 6500 : 4200);
    },
    [remove]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (title, message) => push({ variant: "success", title, message }),
      error: (title, message) => push({ variant: "error", title, message }),
      warning: (title, message) => push({ variant: "warning", title, message }),
      info: (title, message) => push({ variant: "info", title, message })
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[80] grid w-[min(420px,calc(100vw-32px))] gap-3">
        {toasts.map((toast) => {
          const Icon = icons[toast.variant];
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-2xl border p-4 shadow-2xl shadow-slate-950/50 backdrop-blur-xl ${variantStyles[toast.variant]}`}
            >
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 shrink-0" size={18} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{toast.title}</p>
                  {toast.message ? <p className="mt-1 text-sm leading-5 opacity-85">{toast.message}</p> : null}
                </div>
                <button
                  type="button"
                  title="Chiudi"
                  onClick={() => remove(toast.id)}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg opacity-70 transition hover:bg-white/10 hover:opacity-100"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
