import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { liteapiService } from "@/services/liteapiService";
import type { CancelResult, LiteBooking } from "@/types/liteapi";
import { ErrorBox, PageHeader, StatusBadge, formatDate, formatDateTime, formatMoney, humanize } from "./shared";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

export default function BookingDetailPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: b, isLoading, error: loadError, refetch } = useQuery({
    queryKey: ["liteapi", "booking", id],
    queryFn: () => liteapiService.getBooking(id),
    enabled: !!id,
  });
  const onUpdated = (next: LiteBooking) => {
    qc.setQueryData(["liteapi", "booking", id], next);
    qc.invalidateQueries({ queryKey: ["liteapi", "bookings"] });
  };
  const refresh = useMutation({
    mutationFn: () => liteapiService.refreshBooking(id),
    onSuccess: (next) => { setError(null); onUpdated(next); },
    onError: (e) => setError((e as Error).message),
  });
  const cancel = useMutation({
    mutationFn: () => liteapiService.cancelBooking(id, true),
    onSuccess: (res) => {
      setConfirming(false);
      setError(null);
      onUpdated(("booking" in res && (res as CancelResult).booking ? (res as CancelResult).booking : res) as LiteBooking);
    },
    onError: (e) => { setConfirming(false); setError((e as Error).message); },
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading booking…</div>;
  if (loadError || !b) return <ErrorBox message={(loadError as Error)?.message ?? "Booking not found"} onRetry={() => refetch()} />;
  const cancelled = b.booking_status === "cancelled";

  return (
    <div className="w-full max-w-3xl space-y-5">
      <PageHeader
        title={b.summary.hotel_name ?? b.title}
        subtitle={`${formatDate(b.summary.check_in)} → ${formatDate(b.summary.check_out)}`}
        actions={<Button asChild variant="outline"><Link to="/travel/liteapi/bookings">All bookings</Link></Button>}
      />
      {error && <ErrorBox message={error} />}

      <div className="rounded-2xl border bg-card p-4 shadow-sm divide-y">
        <Row label="Status"><StatusBadge value={b.booking_status} /></Row>
        <Row label="Payment"><StatusBadge value={b.payment_status} /></Row>
        <Row label="Cancellation">{humanize(b.cancellation_status)}</Row>
        <Row label="Confirmation">{b.supplier_reference ?? "—"}</Row>
        <Row label="LiteAPI booking ID"><span className="font-mono">{b.liteapi_booking_id}</span></Row>
        <Row label="Room">{b.summary.room_name} · {b.summary.board}</Row>
        <Row label="Guests">{b.travelers.map((t) => t.name).join(", ") || "—"}</Row>
        <Row label="Total">{formatMoney(b.total_amount, b.currency)}</Row>
        <Row label="Conditions">
          {b.conditions.refundable ? `Free cancellation until ${formatDateTime(b.conditions.cancel_deadline)}` : "Non-refundable"}
        </Row>
        <Row label="Last synced">{formatDateTime(b.last_synced_at)}</Row>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" disabled={refresh.isPending} onClick={() => refresh.mutate()}>Refresh from supplier</Button>
        {!cancelled && !confirming && <Button variant="destructive" onClick={() => setConfirming(true)}>Cancel booking</Button>}
        {confirming && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-2 text-sm">
            <span>{b.conditions.refundable ? "Cancel this booking?" : "Non-refundable: you may be charged the full amount. Cancel anyway?"}</span>
            <Button size="sm" variant="destructive" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
              {cancel.isPending ? "Cancelling…" : "Yes, cancel"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>Keep</Button>
          </div>
        )}
      </div>

      {b.history && b.history.length > 0 && (
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-2 text-sm font-semibold">History</div>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {b.history.map((h, i) => (
              <li key={i}>{formatDateTime(h.created_at)} · {humanize(h.event_type)}{h.new_status ? ` → ${h.new_status}` : ""} ({h.source})</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
