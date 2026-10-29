import { useEffect, useState } from "react";
import { ChevronDown, Loader2, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { duffelService } from "@/services/duffelService";
import type { DirectoryUser } from "@/types/duffel";
import { Field, Note } from "./shared";

const FIELDS: [keyof DirectoryUser, string][] = [
  ["display_name", "Display name"], ["given_name", "First name"], ["surname", "Last name"], ["email", "Email"],
  ["user_principal_name", "User principal name"], ["job_title", "Job title"], ["department", "Department"],
  ["company_name", "Company"], ["office_location", "Office"], ["city", "City"], ["state", "State / province"],
  ["country", "Country"], ["usage_location", "Usage location"], ["mobile_phone", "Mobile"], ["business_phones", "Business phone"],
  ["employee_id", "Employee ID"], ["preferred_language", "Language"], ["object_id", "Microsoft object ID"],
  ["portal_user_id", "Portal user ID"],
];

function initials(u: DirectoryUser) {
  const n = u.display_name || u.email;
  return n.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

function UserCard({ user, onPick, picked }: { user: DirectoryUser; onPick: () => void; picked?: boolean }) {
  const [open, setOpen] = useState(false);
  const meta = [user.job_title, user.department].filter(Boolean).join(" · ");
  const where = [user.office_location, user.city, user.country].filter(Boolean).join(", ");
  const rows = FIELDS.map(([k, label]) => {
    const v = user[k];
    const text = Array.isArray(v) ? v.join(", ") : v == null || v === "" ? null : String(v);
    return text ? [label, text] : null;
  }).filter(Boolean) as [string, string][];
  return (
    <li className={`rounded-xl border p-3 ${picked ? "border-primary bg-primary/5" : "bg-card"}`}>
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{initials(user)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-semibold">{user.display_name ?? user.email}</span>
            {user.in_portal ? <Badge variant="secondary">Portal user</Badge> : <Badge variant="outline">Directory only</Badge>}
            {user.account_enabled === false && <Badge variant="destructive">Disabled</Badge>}
          </div>
          <div className="truncate text-xs text-muted-foreground">{user.email}</div>
          {(meta || where) && <div className="truncate text-xs text-muted-foreground">{[meta, where].filter(Boolean).join(" — ")}</div>}
        </div>
        <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(!open)} aria-expanded={open}>
            Details <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </Button>
          <Button type="button" size="sm" disabled={user.account_enabled === false} onClick={onPick}>{picked ? "Selected" : "Select"}</Button>
        </div>
      </div>
      {open && (
        <dl className="mt-3 grid gap-x-4 gap-y-1 border-t pt-3 text-xs sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex gap-2"><dt className="w-32 shrink-0 text-muted-foreground">{k}</dt><dd className="min-w-0 break-words font-medium">{v}</dd></div>
          ))}
          {!user.in_portal && <div className="sm:col-span-2 text-muted-foreground">Not a portal user yet, so the booking stays under your account; their details are used for the traveler.</div>}
        </dl>
      )}
    </li>
  );
}

/** Pick a colleague (portal users merged with Microsoft Graph profiles) to book for; prefills the traveler form. */
export default function DirectoryPicker({ selected, onPick, onClear }: { selected: DirectoryUser | null; onPick: (u: DirectoryUser) => void; onClear: () => void }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    setLoading(true);
    setError(null);
    duffelService
      .searchDirectory(debounced)
      .then((r) => live && (setUsers(r.users), setNote(r.graph_note)))
      .catch((e: Error) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [debounced, open]);

  return (
    <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">Book for a colleague <span className="font-normal text-muted-foreground">(optional)</span></div>
        {selected && <Button type="button" size="sm" variant="ghost" onClick={onClear}><X className="size-3.5" /> Clear</Button>}
      </div>
      {selected ? (
        <ul><UserCard user={selected} picked onPick={() => undefined} /></ul>
      ) : (
        <>
          <Field label="Search the directory by name, email, department or title">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2 size-4 text-muted-foreground" />
              <Input className="pl-8" name="directory-lookup" autoComplete="off" data-lpignore="true" data-form-type="other" placeholder="Start typing…" value={q} onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true); }} />
            </div>
          </Field>
          {open && (
            <div className="space-y-2">
              {loading && <div className="flex items-center gap-2 p-2 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> Loading directory…</div>}
              {error && <p className="text-xs text-destructive">{error}</p>}
              {note && <Note>{note}</Note>}
              {!loading && !error && users.length === 0 && <p className="p-2 text-xs text-muted-foreground">No people found.</p>}
              <ul className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                {users.map((u) => <UserCard key={u.email} user={u} onPick={() => { onPick(u); setOpen(false); }} />)}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
