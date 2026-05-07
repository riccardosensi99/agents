export function formatDate(value?: string | null) {
  if (!value) {
    return "Nessun dato";
  }

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function compactNumber(value: number) {
  return new Intl.NumberFormat("it-IT", { notation: "compact" }).format(value);
}
