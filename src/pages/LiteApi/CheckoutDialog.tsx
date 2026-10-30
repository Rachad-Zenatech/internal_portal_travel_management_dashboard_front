import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { liteapiService } from "@/services/liteapiService";
import type { CheckoutView, LiteBooking } from "@/types/liteapi";
import { useAuth } from "@/lib/AuthContext";
import GuestEmailField from "./GuestEmailField";
import { ErrorBox, Field, formatDate, formatDateTime, formatMoney } from "./shared";

interface Props {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  offerId: string | null;
}

export default function CheckoutDialog({ open, onClose, sessionId, offerId }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [checkout, setCheckout] = useState<CheckoutView | null>(null);
  const [booking, setBooking] = useState<LiteBooking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [accepted, setAccepted] = useState(false);

  const prebook = useMutation({
    mutationFn: () => liteapiService.prebook(sessionId, offerId as string),
    onSuccess: (c) => { setCheckout(c); setError(null); },
    onError: (e) => setError((e as Error).message),
  });
  const book = useMutation({
    mutationFn: () =>
      liteapiService.book({
        checkout_id: (checkout as CheckoutView).checkout_id,
        holder: { first_name: first.trim(), last_name: last.trim(), email: email.trim() },
        guests: [{ first_name: first.trim(), last_name: last.trim(), email: email.trim() }],
        accepted_total: checkout?.price_changed ? checkout.total_amount : undefined,
      }),
    onSuccess: (b) => {
      setBooking(b);
      setError(null);
      qc.invalidateQueries({ queryKey: ["liteapi", "bookings"] });
    },
    onError: (e) => {
      setError((e as Error).message);
      qc.invalidateQueries({ queryKey: ["liteapi", "bookings"] });
    },
  });

  useEffect(() => {
    if (open && offerId && sessionId) {
      setCheckout(null); setBooking(null); setError(null); setAccepted(false);
      // Prefill the guest with the signed-in user; they can change it or pick a colleague.
      const [given = "", ...rest] = (user?.full_name ?? "").trim().split(/\s+/);
      setFirst(given); setLast(rest.join(" ")); setEmail(user?.email ?? "");
      prebook.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, offerId, sessionId]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canBook = !!checkout && first.trim() && last.trim() && emailOk && (!checkout.price_changed || accepted) && !book.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !book.isPending && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{booking ? "Booking submitted" : "Review & book"}</DialogTitle>
          <DialogDescription>
            {booking ? "Your reservation is saved under Bookings." : "The price below is re-verified with the supplier."}
          </DialogDescription>
        </DialogHeader>

        {error && <ErrorBox message={error} />}
        {prebook.isPending && <div className="text-sm text-muted-foreground">Verifying latest price…</div>}

        {booking && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 font-semibold text-emerald-700">
              <CheckCircle2 className="size-5" /> {booking.title}
            </div>
            <div>Status: <b>{booking.booking_status}</b>{booking.supplier_reference && <> · Ref <span className="font-mono">{booking.supplier_reference}</span></>}</div>
            <div>Total: <b>{formatMoney(booking.total_amount, booking.currency)}</b></div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button asChild><Link to={`/travel/liteapi/bookings/${booking.id}`}>View booking</Link></Button>
            </DialogFooter>
          </div>
        )}

        {checkout && !booking && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="font-semibold">{checkout.summary.hotel_name}</div>
              <div className="text-xs text-muted-foreground">
                {checkout.summary.room_name} · {checkout.summary.board} · {formatDate(checkout.summary.check_in)} → {formatDate(checkout.summary.check_out)}
              </div>
              <div className="mt-2 text-lg font-bold">{formatMoney(checkout.total_amount, checkout.currency)}</div>
              <div className="text-xs text-muted-foreground">
                {checkout.conditions.refundable
                  ? `Free cancellation until ${formatDateTime(checkout.conditions.cancel_deadline)}`
                  : "Non-refundable — cancelling may incur the full charge"}
              </div>
            </div>

            {checkout.price_changed && (
              <label className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5" />
                The price changed from {formatMoney(checkout.previous_amount, checkout.currency)} to {formatMoney(checkout.total_amount, checkout.currency)}. I accept the new total.
              </label>
            )}

            <div className="space-y-3">
              <GuestEmailField
                value={email}
                onChange={setEmail}
                onPick={(p) => {
                  setEmail(p.email);
                  const [g = "", ...r] = (p.display_name ?? "").trim().split(/\s+/);
                  setFirst(p.given_name ?? g);
                  setLast(p.surname ?? r.join(" "));
                }}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name"><Input value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" /></Field>
                <Field label="Last name"><Input value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" /></Field>
              </div>
              {email.trim() && !emailOk && <p className="text-xs text-destructive">Enter a valid email address.</p>}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={book.isPending}>Cancel</Button>
              <Button disabled={!canBook} onClick={() => book.mutate()}>
                {book.isPending ? "Booking…" : `Book for ${formatMoney(checkout.total_amount, checkout.currency)}`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
