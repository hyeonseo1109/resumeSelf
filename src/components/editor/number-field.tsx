import { useState } from "react";

export function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  function commitDraft(nextDraft: string) {
    const parsed = Number(nextDraft);

    if (!Number.isFinite(parsed)) {
      setDraft(null);
      return;
    }

    const nextValue = Math.min(max ?? parsed, Math.max(min ?? parsed, parsed));
    setDraft(null);
    onChange(nextValue);
  }

  return (
    <label className="grid gap-1">
      <span className="text-zinc-500">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={draft ?? value}
        onFocus={() => setDraft(String(value))}
        onChange={(event) => {
          const nextDraft = event.target.value;
          setDraft(nextDraft);

          const parsed = Number(nextDraft);
          if (nextDraft !== "" && Number.isFinite(parsed)) {
            onChange(parsed);
          }
        }}
        onBlur={(event) => commitDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        className="h-9 w-24 max-w-full rounded-md border border-zinc-200 px-2"
      />
    </label>
  );
}
