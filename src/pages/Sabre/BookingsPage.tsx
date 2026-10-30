import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sabreService } from "@/services/sabreService";
import { AirlineLogo } from "@/components/Flight/AirlineLogo";
import type { SabreBooking, SabreBookingStatus } from "@/types/sabre";
import { EmptyState, ErrorBox, PageHeader, formatDuration, formatMoney, localParts } from "./shared";

const STATUS_TONE: Record<SabreBookingStatus, string> = {
  confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  unknown: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  cancelled: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
};

function BookingCard({ b }: { b: SabreBooking }) {
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const first = b.selection.legs[0];
  const dep = localParts(first?.departure_local);
  const done = () => qc.invalidateQueries({ queryKey: ["sabre", "bookings"] });

  const refresh = useMutation({
    mutationFn: () => sabreService.refreshBooking(b.id),
    onSuccess: () => { toast.success("Synced with Sabre"); done(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const cancel = useMutation({
    mutationFn: () => sabreService.cancelBooking(b.id, true),
    onSuccess: () => { toast.success("Booking cancelled"); setConfirming(false); done(); },
    onError: (e) => { toast.error((e as Error).message); setConfirming(false); },
  });

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex -space-x-2">
          {b.selection.carriers.slice(0, 3).map((c) => (
            <AirlineLogo key={c} airlineName={b.selection.carrier_names?.[c] ?? c} flightNumber={`${c} 1`} />
          ))}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold">{b.title}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_TONE[b.status]}`}>{b.status}</span>
            {b.sandbox && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800">SANDBOX</span>}
            {b.confirmation_id && <span className="font-mono text-xs font-bold">{b.confirmation_id}</span>}
          </div>
          <div className="text-xs text-muted-foreground">
            {b.travelers.map((t) => `${t.given_name} ${t.surname}`).join(", ")} · {first?.origin} → {first?.destination}
            {dep ? ` · ${dep.date} ${dep.time}` : ""} · {formatDuration(first?.duration_minutes)}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {b.label} · requested {new Date(b.created_at).toLocaleString()}
          </div>
          {b.status === "failed" && b.error_message && (
            <div className="rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-300">{b.error_message}</div>
          )}
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">{formatMoney(b.quoted_amount, b.currency)}</div>
          <div className="text-[11px] text-muted-foreground">quoted total</div>
        </div>
      </div>

      {b.status === "confirmed" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
          <Button size="sm" variant="outline" disabled={refresh.isPending} onClick={() => refresh.mutate()}>Refresh from Sabre</Button>
          {!confirming ? (
            <Button size="sm" variant="destructive" onClick={() => setConfirming(true)}>Cancel booking</Button>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-2 text-sm">
              <span>Release this reservation?</span>
              <Button size="sm" variant="destructive" disabled={cancel.isPending} onClick={() => cancel.mutate()}>{cancel.isPending ? "Cancelling…" : "Yes, cancel"}</Button>
              <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>Keep</Button>
            </div>
          )}
        </div>
      )}
      {b.status === "unknown" && (
        <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
          Sabre did not confirm whether this booking was created. Don't book again; check the reservation with Sabre first.
        </p>
      )}
    </div>
  );
}

export default function BookingsPage() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["sabre", "bookings"], queryFn: () => sabreService.listBookings() });

  return (
    <div className="w-full space-y-5">
      <PageHeader
        title="Bookings"
        subtitle="Flights booked through Sabre's sandbox. Bookings are held, not ticketed, and nothing is paid."
        actions={<Button asChild><Link to="/travel/sabre/search">Search flights</Link></Button>}
      />
      {isLoading && <div className="text-sm text-muted-foreground">Loading bookings…</div>}
      {error && <ErrorBox message={(error as Error).message} onRetry={() => refetch()} />}
      {data && data.length === 0 && <EmptyState title="No bookings yet" hint="Book a flight from Search & Book." />}
      {data?.map((b) => <BookingCard key={b.id} b={b} />)}
    </div>
  );
}
