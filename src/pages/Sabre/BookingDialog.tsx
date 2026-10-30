import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { sabreService } from "@/services/sabreService";
import { useAuth } from "@/lib/AuthContext";
import type { SabreBooking, SabreBookingTravelerInput, SabreOffer } from "@/types/sabre";
import { ErrorBox, Field, formatMoney, localParts, selectClass, useSabreStatus } from "./shared";

export interface Party {
  adults: number;
  children: number;
  infants: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  offer: SabreOffer | null;
  sessionId: string;
  party: Party;
}

type TravelerForm = { type: "ADT" | "CNN" | "INF"; given_name: string; surname: string; birth_date: string; gender: "" | "MALE" | "FEMALE" };

const TYPE_LABEL = { ADT: "Adult", CNN: "Child", INF: "Infant" } as const;
const NAME_OK = /^[^\d\s]+(\s[^\d\s]+)*$/;

function plan(p: Party): TravelerForm["type"][] {
  return [...Array(p.adults).fill("ADT"), ...Array(p.children).fill("CNN"), ...Array(p.infants).fill("INF")];
}

export default function BookingDialog({ open, onClose, offer, sessionId, party }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: status } = useSabreStatus();
  const [travelers, setTravelers] = useState<TravelerForm[]>([]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [booked, setBooked] = useState<SabreBooking | null>(null);

  const book = useMutation({
    mutationFn: () =>
      sabreService.createBooking({
        session_id: sessionId,
        offer_id: (offer as SabreOffer).offer_id,
        accepted_total: (offer as SabreOffer).total_amount,
        contact: { email: email.trim(), phone: phone.trim() },
        travelers: travelers.map((t): SabreBookingTravelerInput => ({
          given_name: t.given_name.trim(),
          surname: t.surname.trim(),
          ...(t.birth_date ? { birth_date: t.birth_date } : {}),
          ...(t.gender ? { gender: t.gender } : {}),
        })),
      }),
    onSuccess: (b) => {
      setBooked(b);
      qc.invalidateQueries({ queryKey: ["sabre", "bookings"] });
    },
    onError: () => qc.invalidateQueries({ queryKey: ["sabre", "bookings"] }),
  });

  useEffect(() => {
    if (!open) return;
    const [given = "", ...rest] = (user?.full_name ?? "").trim().split(/\s+/);
    setTravelers(plan(party).map((type, i) => ({
      type, given_name: i === 0 ? given : "", surname: i === 0 ? rest.join(" ") : "", birth_date: "", gender: "",
    })));
    setEmail(user?.email ?? "");
    setPhone("");
    setBooked(null);
    book.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, offer?.offer_id]);

  const set = (i: number, patch: Partial<TravelerForm>) => setTravelers((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const travelersOk = travelers.every(
    (t) => NAME_OK.test(t.given_name.trim()) && NAME_OK.test(t.surname.trim()) && (t.type === "ADT" || !!t.birth_date),
  );
  const contactOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && /^[0-9+-]{7,20}$/.test(phone.trim());
  const first = offer?.legs[0];
  const dep = localParts(first?.departure_local);
  const denied = status?.booking.entitlement === "denied";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !book.isPending && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{booked ? "Booking confirmed" : "Book this flight"}</DialogTitle>
          <DialogDescription>
            Creates a held booking in Sabre's sandbox. It is not ticketed and nothing is paid.
          </DialogDescription>
        </DialogHeader>

        {offer && !booked && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="font-semibold">{first?.origin} → {first?.destination}{offer.legs.length > 1 ? " (round trip)" : ""} · {offer.carriers.join(" + ")}</div>
              <div className="text-xs text-muted-foreground">{dep ? `${dep.date} ${dep.time}` : ""} · {offer.max_stops === 0 ? "nonstop" : `${offer.max_stops} stop(s)`}</div>
              <div className="mt-1 text-lg font-bold">{formatMoney(offer.total_amount, offer.currency)}</div>
            </div>

            {denied && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                <span>
                  <b>Sabre currently refuses bookings for this sandbox account.</b> You can still submit; the attempt is recorded as failed with Sabre's reason.
                  Ask your Sabre account manager to enable booking.
                </span>
              </div>
            )}

            {travelers.map((t, i) => (
              <fieldset key={i} className="space-y-2 rounded-lg border p-3">
                <legend className="px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{TYPE_LABEL[t.type]} {travelers.filter((x, j) => x.type === t.type && j <= i).length}</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Given name (as on passport)"><Input value={t.given_name} onChange={(e) => set(i, { given_name: e.target.value })} autoComplete={i === 0 ? "given-name" : "off"} /></Field>
                  <Field label="Surname"><Input value={t.surname} onChange={(e) => set(i, { surname: e.target.value })} autoComplete={i === 0 ? "family-name" : "off"} /></Field>
                  <Field label={t.type === "ADT" ? "Date of birth (optional)" : "Date of birth (required)"}><Input type="date" value={t.birth_date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => set(i, { birth_date: e.target.value })} /></Field>
                  <Field label="Gender (optional)">
                    <select className={selectClass} value={t.gender} onChange={(e) => set(i, { gender: e.target.value as TravelerForm["gender"] })}>
                      <option value="">Not specified</option>
                      <option value="FEMALE">Female</option>
                      <option value="MALE">Male</option>
                    </select>
                  </Field>
                </div>
                {(t.given_name || t.surname) && !(NAME_OK.test(t.given_name.trim()) && NAME_OK.test(t.surname.trim())) && (
                  <p className="text-xs text-destructive">Names can't contain digits.</p>
                )}
              </fieldset>
            ))}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Contact email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
              <Field label="Contact phone"><Input value={phone} placeholder="+1-555-123-4567" onChange={(e) => setPhone(e.target.value)} autoComplete="tel" /></Field>
            </div>

            {book.error && <ErrorBox message={(book.error as Error).message} />}

            <DialogFooter>
              <Button variant="outline" disabled={book.isPending} onClick={onClose}>Cancel</Button>
              <Button disabled={!travelersOk || !contactOk || book.isPending} onClick={() => book.mutate()}>
                {book.isPending ? "Booking…" : `Book for ${formatMoney(offer.total_amount, offer.currency)}`}
              </Button>
            </DialogFooter>
          </div>
        )}

        {booked && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 font-semibold text-emerald-700"><CheckCircle2 className="size-5" /> {booked.title}</div>
            <div>Booking reference: <span className="font-mono font-bold">{booked.confirmation_id}</span></div>
            <div className="text-xs text-muted-foreground">{booked.label}</div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button asChild><Link to="/travel/sabre/bookings">View bookings</Link></Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
