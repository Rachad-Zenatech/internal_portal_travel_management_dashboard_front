import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { duffelService, newIdempotencyKey } from "@/services/duffelService";
import type { Booking, CancellationQuote } from "@/types/duffel";
import {
  AirlineLogo,
  ErrorBox,
  Note,
  ProductTile,
  SandboxBanner,
  Spinner,
  StatusBadge,
  formatDateTime,
  formatLocal,
  formatMoney,
  humanize,
} from "./shared";

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      {title && <h2 className="mb-3 text-sm font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

export default function BookingDetailPage() {
  const { id: bookingId } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: b, isLoading, error, refetch } = useQuery({
    queryKey: ["duffel", "booking", bookingId],
    queryFn: () => duffelService.getBooking(bookingId!),
    enabled: !!bookingId,
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [quote, setQuote] = useState<CancellationQuote | null>(null);
  const [ack, setAck] = useState(false);
  const [payKey, setPayKey] = useState(newIdempotencyKey());

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["duffel", "booking", bookingId] });
    qc.invalidateQueries({ queryKey: ["duffel", "bookings"] });
    qc.invalidateQueries({ queryKey: ["duffel", "trips"] });
  };

  const refresh = useMutation({
    mutationFn: () => duffelService.refreshBooking(bookingId!),
    onSuccess: () => { setMsg("Synchronised with the supplier."); setErr(null); invalidate(); },
    onError: (e: Error) => setErr(e.message),
  });
  const getQuote = useMutation({
    mutationFn: () => duffelService.quoteCancellation(bookingId!),
    onSuccess: (q) => { setQuote(q); setAck(false); setErr(null); },
    onError: (e: Error) => setErr(e.message),
  });
  const confirmCancel = useMutation({
    mutationFn: () => duffelService.confirmCancellation(bookingId!, {
      cancellation_id: quote!.cancellation_id,
      accepted_refund: quote!.refund?.amount ?? null,
      confirmed: true,
    }),
    onSuccess: (r) => {
      setQuote(null);
      setMsg(r.status === "cancelled" ? "Booking cancelled." : r.message ?? "Cancellation submitted; status will refresh.");
      invalidate();
    },
    onError: (e: Error) => { setErr(e.message); setQuote(null); invalidate(); },
  });
  const pay = useMutation({
    mutationFn: (bk: Booking) => duffelService.payHold(bk.id, {
      idempotency_key: payKey,
      accepted_total: bk.total!.amount,
      accepted_currency: bk.total!.currency ?? "",
      confirmed: true,
    }),
    onSuccess: (r) => {
      setPayKey(newIdempotencyKey());
      setMsg(r.status === "paid" ? "Payment completed." : r.message ?? `Payment status: ${r.status}`);
      invalidate();
    },
    onError: (e: Error) => setErr(e.message),
  });

  const clear = () => { setMsg(null); setErr(null); };

  return (
    <div className="w-full space-y-5">
      <SandboxBanner />
      <Link to="/travel/duffel/bookings" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to bookings
      </Link>

      {isLoading && <Spinner />}
      {error && <ErrorBox message={(error as Error).message} onRetry={() => refetch()} />}

      {b && (
        <>
          {/* ---- header */}
          <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                {b.product_type === "flight" && b.carriers.length > 0
                  ? <span className="flex shrink-0 -space-x-2">{b.carriers.slice(0, 3).map((c) => <AirlineLogo key={c.iata_code ?? c.name} carrier={c} size={52} />)}</span>
                  : <ProductTile product={b.product_type} size={52} />}
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-bold tracking-tight">{b.title}</h1>
                  <p className="truncate text-sm text-muted-foreground">
                    {b.product_type === "flight" && b.carriers.length > 0 ? `${b.carriers.map((c) => c.name).join(" + ")} · ` : `${humanize(b.product_type)} · `}
                    {formatDateTime(b.starts_at)}{b.ends_at ? ` → ${formatDateTime(b.ends_at)}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <StatusBadge value={b.booking_status} />
                    <StatusBadge value={b.payment_status} />
                    {b.product_type === "flight" && <StatusBadge value={b.fulfillment_status} />}
                    {b.environment === "test" && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">SANDBOX</span>}
                    {b.supplier_reference && <span className="rounded-md border bg-background px-2 py-0.5 font-mono text-xs">Ref {b.supplier_reference}</span>}
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-left md:text-right">
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="text-3xl font-bold leading-none">{formatMoney(b.total)}</div>
                <div className="mt-3 flex flex-wrap gap-2 md:justify-end">
                  <Button variant="outline" disabled={refresh.isPending} onClick={() => { clear(); refresh.mutate(); }}>
                    <RefreshCw className="size-4" /> Sync with supplier
                  </Button>
                  {b.can_pay_hold && (
                    <Button disabled={pay.isPending} onClick={() => { clear(); pay.mutate(b); }}>Pay held order</Button>
                  )}
                  {b.cancellation_supported && (
                    <Button variant="destructive" disabled={getQuote.isPending} onClick={() => { clear(); getQuote.mutate(); }}>Cancel booking…</Button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {msg && <Note>{msg}</Note>}
          {err && <ErrorBox message={err} />}

          {/* ---- body */}
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <Card><Itinerary b={b} /></Card>
              {(b.travelers?.length ?? 0) > 0 && (
                <Card title="Travelers">
                  <ul className="space-y-1 text-sm">{b.travelers!.map((t, i) => <li key={i}>{t.name}{t.email ? <span className="text-muted-foreground"> · {t.email}</span> : null}</li>)}</ul>
                </Card>
              )}
              <ConditionsCard b={b} />
              <Card title="Activity">
                <ul className="space-y-2 text-sm">
                  {(b.activity ?? []).map((a, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary/60" />
                      <div>
                        <div className="font-medium">{humanize(a.event_type.replace(/^webhook:/, "supplier update: "))}{a.new_status ? ` → ${humanize(a.new_status)}` : ""}</div>
                        <div className="text-xs text-muted-foreground">{formatDateTime(a.created_at)} · {a.source}</div>
                      </div>
                    </li>
                  ))}
                  {(b.activity ?? []).length === 0 && <li className="text-muted-foreground">No activity recorded yet.</li>}
                </ul>
              </Card>
            </div>

            <div className="space-y-5">
              <Card title="Payment & status">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Row k="Booking status" v={<StatusBadge value={b.booking_status} />} />
                  <Row k="Payment" v={<StatusBadge value={b.payment_status} />} />
                  {b.product_type === "flight" && <Row k="Ticketing" v={<StatusBadge value={b.fulfillment_status} />} />}
                  <Row k="Confirmation ref" v={<span className="font-mono">{b.supplier_reference ?? "pending"}</span>} />
                  <Row k="Total" v={<b>{formatMoney(b.total)}</b>} />
                  <Row k="Base / taxes" v={`${formatMoney(b.base)} / ${formatMoney(b.tax)}`} />
                  {b.due_at_supplier && <Row k="Payable at supplier" v={formatMoney(b.due_at_supplier)} />}
                  {b.payment_required_by && <Row k="Pay by" v={formatDateTime(b.payment_required_by)} />}
                  {b.cancellable_until && <Row k="Refundable until" v={formatDateTime(b.cancellable_until)} />}
                  <Row k="Created" v={formatDateTime(b.created_at)} />
                  <Row k="Last synced" v={formatDateTime(b.last_synced_at)} />
                </div>
              </Card>

              {(b.cancellations?.length ?? 0) > 0 && (
                <Card title="Cancellations & refunds">
                  <ul className="space-y-2 text-sm">
                    {b.cancellations!.map((c) => (
                      <li key={c.id}>
                        <div className="font-medium">{humanize(c.state)}{c.refund ? ` · refund ${formatMoney(c.refund)}${c.refund_to ? ` to ${humanize(c.refund_to)}` : ""}` : ""}</div>
                        <div className="text-xs text-muted-foreground">{formatDateTime(c.created_at)}{c.error ? ` · ${c.error}` : ""}</div>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {!b.changes_supported && (
                <div className="flex items-start gap-2 rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                  <Wrench className="mt-0.5 size-4 shrink-0" /> <div><b className="text-foreground">Changes need manual assistance.</b> {b.change_guidance}</div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ---- cancellation confirmation */}
      <Dialog open={!!quote} onOpenChange={(o) => !o && !confirmCancel.isPending && setQuote(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm cancellation</DialogTitle>
            <DialogDescription>Review what the supplier says will happen. Cancellation cannot be undone.</DialogDescription>
          </DialogHeader>
          {quote && (
            <div className="space-y-2 text-sm">
              <div className="rounded-lg border p-3">
                <div>Refund: <b>{quote.refund ? formatMoney(quote.refund) : "none stated"}</b>{quote.refund_to ? ` (to ${humanize(quote.refund_to)})` : ""}</div>
                <div>Penalty: {quote.penalty ? formatMoney(quote.penalty) : "not itemised by the supplier"}</div>
                {quote.expires_at && <div className="text-xs text-muted-foreground">Quote valid until {formatDateTime(quote.expires_at)}</div>}
              </div>
              {quote.note && <Note>{quote.note}</Note>}
              {(quote.detail?.conditions ?? []).map((c: any, i: number) => <div key={i} className="text-xs"><b>{c.title}: </b>{c.text}</div>)}
              {(quote.detail?.timeline ?? []).map((t: any, i: number) => <div key={i} className="text-xs text-muted-foreground">Until {formatDateTime(t.before)}: refund {t.refund ? formatMoney(t.refund) : "none"}</div>)}
              {(quote.detail?.airline_credits?.length ?? 0) > 0 && <Note>Part of the value may be issued as airline credit.</Note>}
              <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={ack} onChange={(e) => setAck(e.target.checked)} /> I understand and want to cancel this booking.</label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={confirmCancel.isPending} onClick={() => setQuote(null)}>Keep booking</Button>
            <Button variant="destructive" disabled={!ack || confirmCancel.isPending} onClick={() => confirmCancel.mutate()}>{confirmCancel.isPending ? "Cancelling..." : "Cancel booking"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div><div className="text-xs text-muted-foreground">{k}</div><div>{v}</div></div>;
}

function Itinerary({ b }: { b: Booking }) {
  const s = b.summary ?? {};
  if (b.product_type === "flight") {
    return (
      <section className="space-y-2">
        <h4 className="font-semibold">Itinerary</h4>
        {(s.slices ?? []).map((sl: any, i: number) => (
          <div key={i} className="rounded-xl border p-3 text-xs">
            <div className="mb-2 font-medium">{sl.origin?.iata_code} → {sl.destination?.iata_code}{sl.fare_brand_name ? ` · ${sl.fare_brand_name}` : ""}</div>
            {sl.segments?.map((g: any) => (
              <div key={g.id} className="flex items-start gap-2 py-1">
                <AirlineLogo carrier={g.marketing_carrier} size={28} />
                <div className="text-muted-foreground">
                  <span className="font-medium text-foreground">{g.marketing_carrier?.name} {g.flight_number}</span>{g.operating_carrier ? ` · operated by ${g.operating_carrier.name}` : ""}
                  <div>{g.origin?.iata_code} {formatLocal(g.departing_at)} → {g.destination?.iata_code} {formatLocal(g.arriving_at)}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
        {(s.booking_references ?? []).map((r: any, i: number) => <div key={i} className="text-xs">Airline reference <b className="font-mono">{r.reference}</b>{r.carrier ? ` (${r.carrier})` : ""}</div>)}
        {(s.documents ?? []).length > 0 && <div className="text-xs text-muted-foreground">Tickets issued: {s.documents.map((d: any) => d.unique_identifier).join(", ")}</div>}
      </section>
    );
  }
  if (b.product_type === "stay") {
    const a = s.accommodation ?? {};
    return (
      <section className="space-y-1 text-xs">
        <h4 className="text-sm font-semibold">Stay</h4>
        <div>{a.name} — {[a.address?.line_one, a.address?.city_name].filter(Boolean).join(", ")}</div>
        <div>Check-in {s.check_in_date} · Check-out {s.check_out_date} · {s.rooms} room(s) {s.room?.name ? `· ${s.room.name}` : ""}</div>
        {a.phone_number && <div>Property phone: {a.phone_number}</div>}
        {s.key_collection && <div className="rounded bg-amber-50 p-2 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><b>Key collection:</b> {s.key_collection}</div>}
      </section>
    );
  }
  const pu = s.pickup_location, dr = s.dropoff_location;
  return (
    <section className="space-y-1 text-xs">
      <h4 className="text-sm font-semibold">Rental car</h4>
      <div>{s.car?.name} · {humanize(s.car?.category)} · {s.supplier}</div>
      <div>Pick-up: {s.pickup?.date} {s.pickup?.time} — {pu?.name}{pu?.address?.line_one ? `, ${pu.address.line_one}` : ""}{pu?.phone_number ? ` · ${pu.phone_number}` : ""}</div>
      <div>Drop-off: {s.dropoff?.date} {s.dropoff?.time} — {dr?.name}{dr?.address?.line_one ? `, ${dr.address.line_one}` : ""}</div>
      {pu?.additional_information?.map((i: any, k: number) => <div key={k}><b>{i.title}:</b> {i.text}</div>)}
    </section>
  );
}

function ConditionsCard({ b }: { b: Booking }) {
  const c = b.conditions ?? {};
  const flightConds: [string, any][] = b.product_type === "flight" ? [["Refund before departure", c.refund_before_departure], ["Change before departure", c.change_before_departure]] : [];
  const items: { title: string; text: string }[] = (c.items ?? []).map((i: any) => ({ title: i.title, text: i.description ?? i.text }));
  const timeline: any[] = c.cancellation_timeline ?? [];
  if (!flightConds.length && !items.length && !timeline.length) return null;
  return (
    <Card title="Conditions">
      <div className="space-y-1.5 text-sm">
        {flightConds.map(([label, v]) => (
          <div key={label}>{label}: {v ? (v.allowed ? `allowed${v.penalty ? `, penalty ${formatMoney(v.penalty)}` : ""}` : "not allowed") : "not stated by the airline"}</div>
        ))}
        {timeline.map((t, i) => <div key={i}>Until {formatDateTime(t.before)}: refund {t.refund ? formatMoney(t.refund) : "none"}</div>)}
        {items.map((i, k) => <div key={k}><b>{i.title}: </b><span className="text-muted-foreground">{i.text}</span></div>)}
      </div>
    </Card>
  );
}
