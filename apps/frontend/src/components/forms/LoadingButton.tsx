import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
};

export function LoadingButton({ loading = false, loadingLabel, children, disabled, className = "", ...props }: Props) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-45`}
    >
      {loading ? <Loader2 className="animate-spin" size={16} /> : null}
      {loading ? loadingLabel ?? children : children}
    </button>
  );
}
