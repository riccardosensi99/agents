import { TriangleAlert } from "lucide-react";

export function FormError({ message }: { message?: string | null | undefined }) {
  if (!message) {
    return null;
  }

  return (
    <div className="flex items-start gap-2 rounded-xl border border-rose-300/25 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">
      <TriangleAlert className="mt-0.5 shrink-0" size={16} />
      <p>{message}</p>
    </div>
  );
}
