import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { liteapiService } from "@/services/liteapiService";
import type { DirectoryPerson } from "@/types/liteapi";
import { Field } from "./shared";

interface Props {
  value: string;
  onChange: (email: string) => void;
  /** Called when a suggestion is chosen so the caller can fill the name fields. */
  onPick: (person: DirectoryPerson) => void;
}

/** Email input with Microsoft Graph / portal-user suggestions (name and email only; needs 2+ typed characters). */
export default function GuestEmailField({ value, onChange, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState<DirectoryPerson[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const [typed, setTyped] = useState(false); // only search after the user types, not for the prefilled value

  useEffect(() => {
    const q = value.trim();
    if (!open || !typed || q.length < 2) {
      setPeople([]);
      return;
    }
    let live = true;
    const t = setTimeout(() => {
      setLoading(true);
      liteapiService
        .searchDirectory(q)
        .then((r) => { if (live) { setPeople(r.users); setNote(r.graph_note); setActive(-1); } })
        .catch(() => { if (live) setPeople([]); })
        .finally(() => live && setLoading(false));
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [value, open, typed]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pick = (p: DirectoryPerson) => {
    onPick(p);
    setOpen(false);
    setTyped(false);
  };

  return (
    <div ref={box} className="relative">
      <Field label="Email (for confirmation)">
        <Input
          type="email"
          autoComplete="off"
          data-lpignore="true"
          placeholder="Search colleagues by name or email"
          value={value}
          role="combobox"
          aria-expanded={open && people.length > 0}
          aria-autocomplete="list"
          onFocus={() => setOpen(true)}
          onChange={(e) => { setTyped(true); onChange(e.target.value); setOpen(true); }}
          onKeyDown={(e) => {
            if (!open || people.length === 0) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % people.length); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a <= 0 ? people.length - 1 : a - 1)); }
            else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(people[active]); }
            else if (e.key === "Escape") setOpen(false);
          }}
        />
      </Field>
      {open && typed && value.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-lg">
          {loading && <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> Searching…</div>}
          {!loading && people.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">No matches. You can still type any email.</div>}
          <ul role="listbox" className="max-h-56 overflow-y-auto">
            {people.map((p, i) => (
              <li key={p.email} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(p)}
                  className={`flex w-full flex-col px-3 py-2 text-left text-sm ${i === active ? "bg-muted" : "hover:bg-muted"}`}
                >
                  <span className="font-medium">{p.display_name ?? p.email}</span>
                  <span className="text-xs text-muted-foreground">{p.email}</span>
                </button>
              </li>
            ))}
          </ul>
          {note && <div className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">{note}</div>}
        </div>
      )}
    </div>
  );
}
