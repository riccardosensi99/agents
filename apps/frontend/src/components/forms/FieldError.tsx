export function FieldError({ message }: { message?: string | undefined }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs font-medium text-rose-200">{message}</p>;
}
