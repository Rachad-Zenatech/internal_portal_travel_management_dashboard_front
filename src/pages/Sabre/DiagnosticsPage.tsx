import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Lock, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sabreService } from "@/services/sabreService";
import type { SabreOutcome } from "@/types/sabre";
import { ErrorBox, PageHeader, selectClass } from "./shared";

const OUTCOMES: Record<string, { label: string; tone: string; help: string }> = {
  working: { label: "Working", tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300", help: "Returned real data for a real request." },
  reachable: { label: "Reachable", tone: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300", help: "Answered, so access exists, but the request schema isn't verified." },
  accepted_no_data: { label: "No data", tone: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300", help: "Request accepted but nothing was returned in the sandbox." },
  denied: { label: "Denied", tone: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300", help: "Sabre refused this account (401/403)." },
  not_found: { label: "Path unknown", tone: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200", help: "No service at the tested path(s)." },
  invalid_request: { label: "Bad request", tone: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300", help: "A real request was rejected as malformed." },
  rate_limited: { label: "Rate limited", tone: "bg-orange-100 text-orange-800", help: "Sabre asked us to slow down." },
  upstream_error: { label: "Sabre error", tone: "bg-orange-100 text-orange-800", help: "Sabre returned a server error." },
  not_probed: { label: "Not probed", tone: "bg-muted text-muted-foreground", help: "Skipped on purpose (payments or write operations)." },
  unchecked: { label: "Unchecked", tone: "bg-muted text-muted-foreground", help: "Run the check to test this API." },
};
const ORDER = ["working", "reachable", "accepted_no_data", "denied", "not_found", "invalid_request", "upstream_error", "rate_limited", "not_probed", "unchecked"];

function Outcome({ value }: { value: SabreOutcome | null }) {
  const o = OUTCOMES[value ?? "unchecked"] ?? OUTCOMES.unchecked;
  return <span title={o.help} className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${o.tone}`}>{o.label}</span>;
}

export default function DiagnosticsPage() {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["sabre", "diagnostics"], queryFn: () => sabreService.getDiagnostics(), retry: false });
  const probe = useMutation({ mutationFn: () => sabreService.runProbe(), onSuccess: () => qc.invalidateQueries({ queryKey: ["sabre", "diagnostics"] }) });
  const [outcome, setOutcome] = useState("");
  const [category, setCategory] = useState("");
  const [flag, setFlag] = useState("");
  const [source, setSource] = useState("");
  const [q, setQ] = useState("");

  const categories = useMemo(() => [...new Set((data?.apis ?? []).map((a) => a.category))].sort(), [data]);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.apis ?? []).filter(
      (a) => (!outcome || a.outcome === outcome) && (!category || a.category === category) && (!flag || a.flags.includes(flag)) && (!source || a.source === source) && (!needle || a.title.toLowerCase().includes(needle) || (a.path ?? "").toLowerCase().includes(needle)),
    );
  }, [data, outcome, category, flag, source, q]);

  const denied = data?.booking.filter((b) => b.outcome === "denied").length ?? 0;

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="API diagnostics"
        subtitle="Which Sabre developer-portal APIs this sandbox account can reach (authorized users only)"
        actions={
          <Button size="sm" className="gap-2" disabled={probe.isPending} onClick={() => probe.mutate()}>
            <RefreshCw className={`size-4 ${probe.isPending ? "animate-spin" : ""}`} /> {probe.isPending ? "Checking all APIs…" : "Run check"}
          </Button>
        }
      />
      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {error && <ErrorBox message={(error as Error).message} onRetry={() => refetch()} />}
      {probe.error && <ErrorBox message={(probe.error as Error).message} />}

      {data && (
        <>
          <div className="grid gap-3 rounded-2xl border bg-card p-4 text-sm shadow-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><div className="text-xs text-muted-foreground">Environment</div><b>{data.environment.toUpperCase()}</b> · {data.base_host}</div>
            <div><div className="text-xs text-muted-foreground">Credentials</div><b>{data.credentials_configured ? "Configured" : "Missing"}</b> · token {data.token_cached ? "cached" : "not cached"}</div>
            <div><div className="text-xs text-muted-foreground">Last full check</div><b>{data.last_checked_at ? new Date(data.last_checked_at).toLocaleString() : "Never"}</b></div>
            <div><div className="text-xs text-muted-foreground">APIs checked</div><b>{data.catalog_total}</b> in the portal try-it-out list + <b>{data.collection_total}</b> named in the sandbox collection</div>
          </div>

          <div className="rounded-2xl border-2 border-dashed bg-card p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <div className="space-y-2 text-sm">
                <div className="font-semibold">Can this account book flights? No.</div>
                <p className="text-muted-foreground">
                  Sabre refuses booking for this sandbox account. Create PNR and ticketing return 403 “no access privileges”, and the
                  Booking Management API (v1.34) accepts requests but answers “unauthorized” when it reaches the booking systems
                  ({denied} of {data.booking.length} checks denied). The routes below exist and validate input, which is why they show
                  “Reachable”. The app's Book button therefore records the attempt as failed with this reason. Ask your Sabre account manager to
                  enable booking; the “authorization check” row below changes once it is on.
                </p>
                <ul className="grid gap-1 text-xs sm:grid-cols-3">
                  {data.booking.map((b) => (
                    <li key={b.key} className="flex items-center justify-between gap-2 rounded-lg border bg-background px-2.5 py-1.5">
                      <span className="min-w-0 truncate">{b.title} <span className="text-muted-foreground">{b.version}</span></span>
                      <Outcome value={b.outcome} />
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  Write endpoints are only ever probed with empty requests, plus one deliberately unbookable flight (carrier “ZZ”) that cannot
                  create a booking and only shows whether Sabre authorizes the account.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {ORDER.filter((k) => data.summary[k]).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={outcome === k}
                onClick={() => setOutcome(outcome === k ? "" : k)}
                className={`rounded-xl border bg-card p-3 text-left shadow-sm transition-all hover:border-primary/50 ${outcome === k ? "ring-2 ring-primary/40" : ""}`}
              >
                <div className="text-2xl font-bold tabular-nums">{data.summary[k]}</div>
                <Outcome value={k as SabreOutcome} />
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2 size-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search by API name or path" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <select aria-label="Category" className={`${selectClass} !w-44`} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select aria-label="Source" className={`${selectClass} !w-48`} value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="">All sources</option>
              <option value="catalog">Portal try-it-out list</option>
              <option value="collection">Sandbox collection only</option>
            </select>
            <select aria-label="Flag" className={`${selectClass} !w-40`} value={flag} onChange={(e) => setFlag(e.target.value)}>
              <option value="">All flags</option>
              <option value="deprecated">Deprecated</option>
              <option value="premium">Premium</option>
              <option value="agenticReady">Agentic ready</option>
            </select>
            <select aria-label="Outcome" className={`${selectClass} !w-44`} value={outcome} onChange={(e) => setOutcome(e.target.value)}>
              <option value="">All outcomes</option>
              {ORDER.map((k) => <option key={k} value={k}>{OUTCOMES[k].label}</option>)}
            </select>
            <span className="text-xs text-muted-foreground">{rows.length} of {data.apis.length}</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="p-2.5">API</th><th className="p-2.5">Version</th><th className="p-2.5">Category</th>
                  <th className="p-2.5">Result</th><th className="p-2.5">HTTP</th><th className="p-2.5">Tested path</th><th className="p-2.5">Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.key} className="border-b align-top last:border-0 hover:bg-muted/20">
                    <td className="p-2.5">
                      <div className="flex items-center gap-1.5 font-medium">
                        {a.title}
                        {a.source === "collection" && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">collection</span>}
                        {a.used_in_app && <span title="Used by this app"><CheckCircle2 className="size-3.5 text-emerald-600" /></span>}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {a.flags.map((f) => (
                          <span key={f} className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${f === "premium" ? "bg-violet-100 text-violet-800" : f === "deprecated" ? "bg-zinc-200 text-zinc-700" : "bg-sky-100 text-sky-800"}`}>
                            {f === "agenticReady" ? "agentic" : f}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-2.5">
                      {a.versions.map((v) => (
                        <div key={v.version} className={`flex items-center gap-1 whitespace-nowrap ${v.latest ? "font-semibold" : "text-muted-foreground"}`}>
                          <span className="font-mono">{v.version}</span>
                          {v.latest && <span className="rounded bg-primary/10 px-1 text-[9px] font-bold uppercase text-primary">tested</span>}
                          {!v.latest && v.origin === "candidate" && <span className="text-[10px]">· {OUTCOMES[v.outcome]?.label ?? v.outcome}</span>}
                        </div>
                      ))}
                      {a.doc_version && a.doc_version !== a.tested_version && (
                        <div className="mt-1 whitespace-nowrap text-[10px] text-muted-foreground">documented <span className="font-mono font-semibold text-foreground">{a.doc_version}</span></div>
                      )}
                    </td>
                    <td className="p-2.5">{a.category}</td>
                    <td className="p-2.5"><Outcome value={a.outcome} /></td>
                    <td className="p-2.5 tabular-nums">{a.http ?? "—"}</td>
                    <td className="p-2.5 font-mono text-[11px]">{a.path ? <><span className="text-muted-foreground">{a.tested_version} </span>{a.path}</> : "—"}</td>
                    <td className="max-w-xs p-2.5 text-muted-foreground">{a.note ?? ""}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No APIs match these filters.</td></tr>}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">
            Under “Version”, every probed version is listed and the newest one that answers is marked “tested”: the Result, HTTP and Tested path columns describe that version. Newer candidates are guessed version numbers probed on CERT (“Path unknown” means nothing answered there); “documented” is the latest version named in the sandbox-collection document (a third-party summary, partly unverified). The portal's version dropdown is the authority on documented versions. “Premium” and “deprecated” are Sabre's own catalog flags. Reaching an API on CERT does not prove free commercial terms; confirm premium products
            (including Bargain Finder Max, which this app uses) under your Sabre agreement before production use. Payment and write APIs are never probed.
          </p>
        </>
      )}
    </div>
  );
}
