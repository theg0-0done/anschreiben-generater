import { Loader2 } from "lucide-react";

export function LoadingState({ message = "Wird geladen..." }: { message?: string }) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
