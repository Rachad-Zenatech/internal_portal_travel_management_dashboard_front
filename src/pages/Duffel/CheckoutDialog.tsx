import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock, AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { duffelService, newIdempotencyKey } from "@/services/duffelService";
import { useAuth } from "@/lib/AuthContext";
import type { BookResult, Booking, CheckoutView, DirectoryUser, ProductType, TravelerInput } from "@/types/duffel";
import DirectoryPicker from "./DirectoryPicker";
import PhoneInput, { normalizePhone } from "./PhoneInput";
import {
  AirlineLogo,
  ErrorBox,
  Field,
  ProductTile,
  Note,
  Spinner,
  formatDateTime,
  formatLocal,
  formatMoney,
  humanize,
  selectClass,
  useDuffelStatus,
  useExpiry,
} from "./shared";

interface Props {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  product: ProductType;
  providerRef: string | null;
  onExpired?: () => void;
}

const emptyTraveler = (passenger_id?: string): TravelerInput => ({
  passenger_id,
  title: "",
  given_name: "",
  family_name: "",
  born_on: "",
  gender: "",
  email: "",
  phone_number: "",
});

type Step = "loading" | "details" | "review" | "done";

export default function CheckoutDialog({ open, onClose, sessionId, product, providerRef, onExpired }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: status } = useDuffelStatus();
  const [step, setStep] = useState<Step>("loading");
  const [checkout, setCheckout] = useState<CheckoutView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [travelers, setTravelers] = useState<TravelerInput[]>([]);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [paymentMode, setPaymentMode] = useState<"instant" | "hold">("instant");
  const [tripId, setTripId] = useState("");
  const [newTrip, setNewTrip] = useState("");
  const [onBehalfUser, setOnBehalfUser] = useState<DirectoryUser | null>(null);
  const [special, setSpecial] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [priceNotice, setPriceNotice] = useState<string | null>(null);
  const [result, setResult] = useState<BookResult | null>(null);
  // One key per user intent: a double-click or retry of the same submission can never create a second purchase.
  const idemKey = useRef(newIdempotencyKey());

  const { data: trips } = useQuery({ queryKey: ["duffel", "trips", "mine"], queryFn: () => duffelService.listTrips("mine"), enabled: open });
  const { expired, remaining } = useExpiry(checkout?.expires_at);

  useEffect(() => {
    if (!open || !providerRef) return;
    let cancelled = false;
    setStep("loading");
    setError(null);
    setResult(null);
    setConfirmed(false);
    setPriceNotice(null);
    idemKey.current = newIdempotencyKey();
    duffelService
      .checkout(sessionId, product, providerRef)
      .then((co) => {
        if (cancelled) return;
        setCheckout(co);
        const pax = co.requirements.passengers;
        // The person booking is usually the first traveler: prefill first name, last name and email (editable).
        const self: Partial<TravelerInput> = user ? { ...splitName(user.full_name), email: user.email ?? "" } : {};
        setTravelers(
          product === "flight"
            ? (pax ?? []).map((p, i) => ({ ...emptyTraveler(p.id), ...(i === 0 ? self : {}) }))
            : Array.from({ length: product === "stay" ? (co.requirements.guest_count ?? 1) : 1 }, (_, i) => ({ ...emptyTraveler(), ...(i === 0 ? self : {}) })),
        );
        setContactEmail(user?.email ?? "");
        setStep("details");
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
        setStep("details");
        setCheckout(null);
        if (/expired|no longer available|search again/i.test(e.message)) onExpired?.();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, providerRef, sessionId, product]);

  const setT = (i: number, patch: Partial<TravelerInput>) =>
    setTravelers((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  // Local departure date of the first flight leg: ages are validated as of this date (what the airline checks).
  const departure = ((checkout?.summary as Record<string, any> | undefined)?.slices?.[0]?.departing_at as string | undefined)?.slice(0, 10);

  function pickColleague(u: DirectoryUser) {
    setOnBehalfUser(u);
    const given = u.given_name ?? u.display_name?.split(" ")[0] ?? "";
    const family = u.surname ?? u.display_name?.split(" ").slice(1).join(" ") ?? "";
    const phone = normalizePhone(u.mobile_phone ?? u.business_phones?.[0]);
    setTravelers((prev) => prev.map((t, i) => (i === 0 ? { ...t, given_name: given, family_name: family, email: u.email, phone_number: phone || t.phone_number } : t)));
    setContactEmail(u.email);
    if (phone) setContactPhone(phone);
  }

  const detailsError = useMemo(() => {
    if (!checkout) return "Offer unavailable";
    if (checkout.requirements.payment_supported === false) return checkout.requirements.payment_note ?? "Payment method not supported";
    for (const [i, t] of travelers.entries()) {
      const who = `${product === "car" ? "Driver" : product === "stay" ? "Guest" : "Passenger"} ${i + 1}`;
      if (!t.given_name.trim() || !t.family_name.trim()) return `${who}: first and last name are required`;
      if (!t.born_on) return `${who}: date of birth is required`;
      const dobProblem = dobError(t.born_on, product === "flight" ? checkout.requirements.passengers?.[i] : undefined, departure);
      if (dobProblem) return `${who}: ${dobProblem}`;
      if (product === "flight") {
        if (!t.title || !t.gender) return `${who}: title and gender are required`;
        if (!t.email) return `${who}: email is required`;
      }
      if (product !== "stay" && !/^\+[1-9]\d{6,14}$/.test(t.phone_number ?? "")) return `${who}: phone in international format, e.g. +14165550100`;
      if (product === "car" && !t.email) return `${who}: email is required`;
    }
    if (product === "stay") {
      if (!contactEmail) return "Lead guest email is required";
      if (!/^\+[1-9]\d{6,14}$/.test(contactPhone)) return "Lead guest phone in international format, e.g. +14165550100";
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkout, travelers, contactEmail, contactPhone, product]);

  async function submit() {
    if (!checkout) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await duffelService.book({
        checkout_id: checkout.checkout_id,
        idempotency_key: idemKey.current,
        accepted_total: checkout.total.amount,
        accepted_currency: checkout.total.currency ?? "",
        travelers: travelers.map((t) => ({
          ...t,
          title: t.title || undefined,
          gender: t.gender || undefined,
          born_on: t.born_on || undefined,
          email: t.email || undefined,
          phone_number: t.phone_number || undefined,
        })),
        contact_email: product === "stay" ? contactEmail : undefined,
        contact_phone: product === "stay" ? contactPhone : undefined,
        payment_mode: product === "flight" ? paymentMode : undefined,
        trip_id: tripId || undefined,
        new_trip_name: !tripId && newTrip ? newTrip : undefined,
        on_behalf_of_user_id: onBehalfUser?.portal_user_id || undefined,
        special_requests: special || undefined,
        confirmed: true,
      });
      if (res.status === "price_changed") {
        // The supplier price/conditions moved: the user must explicitly accept the NEW offer.
        setCheckout(res.checkout);
        setConfirmed(false);
        idemKey.current = newIdempotencyKey(); // nothing was purchased; a fresh intent needs a fresh key
        setPriceNotice(
          `Price changed from ${formatMoney({ amount: res.previous.amount, currency: res.previous.currency })} to ${formatMoney(res.current)}. Review the updated offer and confirm again.`,
        );
        return;
      }
      setResult(res);
      setStep("done");
      qc.invalidateQueries({ queryKey: ["duffel", "bookings"] });
      qc.invalidateQueries({ queryKey: ["duffel", "trips"] });
    } catch (e) {
      setError((e as Error).message);
      if (/expired|no longer available/i.test((e as Error).message)) onExpired?.();
    } finally {
      setSubmitting(false);
    }
  }

  const holdAvailable = product === "flight" && checkout?.requirements.payment_requirements?.requires_instant_payment === false;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === "done" ? "Booking result" : step === "review" ? "Final review" : "Traveler details"}
          </DialogTitle>
          <DialogDescription>
            {status?.sandbox ? "Sandbox — no real reservations. " : ""}
            Price and availability were re-verified with the supplier just now.
          </DialogDescription>
        </DialogHeader>

        {step !== "loading" && <Steps step={step} />}
        {checkout && step !== "done" && <SelectedItem checkout={checkout} />}
        {step === "loading" && <Spinner label="Verifying the latest price with the supplier..." />}

        {error && <ErrorBox message={error} />}

        {checkout && step !== "loading" && step !== "done" && (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="font-semibold">Latest supplier total</div>
              <div className="text-lg font-bold">{formatMoney(checkout.total)}</div>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>{checkout.payment_type ? `Payment: ${humanize(checkout.payment_type)}` : paymentTiming(checkout, paymentMode)}</span>
              {checkout.expires_at && (expired || remaining) && (
                <span className={`flex items-center gap-1 ${expired ? "font-semibold text-destructive" : ""}`}>
                  <Clock className="size-3" /> {expired ? "Offer expired" : `Valid for about ${remaining}`}
                </span>
              )}
            </div>
            <Conditions checkout={checkout} />
          </div>
        )}

        {priceNotice && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {priceNotice}
          </div>
        )}

        {step === "details" && checkout && (
          <div className="space-y-4">
            {checkout.requirements.payment_supported === false && <ErrorBox message={checkout.requirements.payment_note ?? "Unsupported payment method"} />}
            {travelers.map((t, i) => (
              <fieldset key={i} className="grid grid-cols-2 gap-2 rounded-lg border p-3 sm:grid-cols-3">
                <legend className="px-1 text-xs font-semibold">
                  {product === "car" ? "Driver" : product === "stay" ? `Guest ${i + 1}` : `Passenger ${i + 1}`}
                  {product === "flight" && checkout.requirements.passengers?.[i] && ` (${checkout.requirements.passengers[i].type}${checkout.requirements.passengers[i].age != null ? `, age ${checkout.requirements.passengers[i].age}` : ""})`}
                </legend>
                {product === "flight" && (
                  <Field label="Title">
                    <select className={selectClass} value={t.title} onChange={(e) => setT(i, { title: e.target.value })}>
                      <option value="">Select</option>
                      {["mr", "ms", "mrs", "miss", "dr"].map((x) => <option key={x} value={x}>{x.toUpperCase()}</option>)}
                    </select>
                  </Field>
                )}
                <Field label="Given name"><Input autoComplete="off" value={t.given_name} onChange={(e) => setT(i, { given_name: e.target.value })} /></Field>
                <Field label="Family name"><Input autoComplete="off" value={t.family_name} onChange={(e) => setT(i, { family_name: e.target.value })} /></Field>
                <Field label="Date of birth"><Input type="date" value={t.born_on} onChange={(e) => setT(i, { born_on: e.target.value })} /></Field>
                {product === "flight" && (
                  <Field label="Gender (as on ID)">
                    <select className={selectClass} value={t.gender} onChange={(e) => setT(i, { gender: e.target.value })}>
                      <option value="">Select</option><option value="m">Male</option><option value="f">Female</option>
                    </select>
                  </Field>
                )}
                {product !== "stay" && (
                  <>
                    <Field label="Email"><Input type="email" autoComplete="off" value={t.email} onChange={(e) => setT(i, { email: e.target.value })} /></Field>
                    <div className="col-span-2 sm:col-span-2"><PhoneInput label="Phone" value={t.phone_number ?? ""} onChange={(v) => setT(i, { phone_number: v })} /></div>
                  </>
                )}
              </fieldset>
            ))}
            {product === "stay" && (
              <div className="grid grid-cols-2 gap-2">
                <Field label="Lead guest email"><Input type="email" autoComplete="off" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></Field>
                <PhoneInput label="Lead guest phone" value={contactPhone} onChange={setContactPhone} />
                <div className="col-span-2"><Field label="Special requests (no medical or sensitive info)"><Input maxLength={500} value={special} onChange={(e) => setSpecial(e.target.value)} /></Field></div>
              </div>
            )}
            {holdAvailable && (
              <Field label="Payment timing">
                <select className={selectClass} value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as "instant" | "hold")}>
                  <option value="instant">Pay now (sandbox balance)</option>
                  <option value="hold">Hold the fare and pay later</option>
                </select>
              </Field>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Field label="Add to trip">
                <select className={selectClass} value={tripId} onChange={(e) => setTripId(e.target.value)}>
                  <option value="">Create a new trip</option>
                  {[...(trips?.upcoming ?? [])].map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
              {!tripId && <Field label="New trip name (optional)"><Input value={newTrip} onChange={(e) => setNewTrip(e.target.value)} /></Field>}
              {status?.permissions.book_on_behalf && (
                <div className="col-span-2"><DirectoryPicker selected={onBehalfUser} onPick={pickColleague} onClear={() => setOnBehalfUser(null)} /></div>
              )}
            </div>
            <Note>No card details are collected here. Passport/ID documents are not requested in this release.</Note>
            {detailsError && <p className="text-xs text-destructive">{detailsError}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button disabled={!!detailsError || expired} onClick={() => { setStep("review"); setConfirmed(false); }}>Continue to review</Button>
            </DialogFooter>
          </div>
        )}

        {step === "review" && checkout && (
          <div className="space-y-3">
            <ul className="space-y-1 text-sm">
              {travelers.map((t, i) => <li key={i}>{t.given_name} {t.family_name}{t.born_on ? ` · born ${t.born_on}` : ""}</li>)}
            </ul>
            {product === "flight" && paymentMode === "hold" && <Note>The fare is held and must be paid by {formatDateTime(checkout.requirements.payment_requirements?.payment_required_by)}. Nothing is charged now.</Note>}
            {expired && <ErrorBox message="This offer has expired. Close and search again." />}
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              <span>
                I confirm the details above and accept the total of <b>{formatMoney(checkout.total)}</b> and the conditions shown{status?.sandbox ? " (sandbox: no real charge)" : ""}.
              </span>
            </label>
            <DialogFooter>
              <Button variant="outline" disabled={submitting} onClick={() => setStep("details")}>Back</Button>
              <Button disabled={!confirmed || submitting || expired} onClick={submit}>
                {submitting ? "Booking..." : paymentMode === "hold" && product === "flight" ? "Hold fare" : "Confirm & book"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "done" && result && <ResultView result={result} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function Steps({ step }: { step: Step }) {
  const items: [Step, string][] = [["details", "Traveler details"], ["review", "Review"], ["done", "Confirmation"]];
  const idx = items.findIndex(([k]) => k === step);
  return (
    <ol className="flex items-center gap-2 text-xs" aria-label="Booking steps">
      {items.map(([k, label], i) => (
        <li key={k} className="flex flex-1 items-center gap-2">
          <span className={`flex size-6 items-center justify-center rounded-full text-[11px] font-bold ${i < idx ? "bg-emerald-600 text-white" : i === idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {i < idx ? <Check className="size-3.5" /> : i + 1}
          </span>
          <span className={i === idx ? "font-semibold" : "text-muted-foreground"}>{label}</span>
          {i < items.length - 1 && <span className="h-px flex-1 bg-border" />}
        </li>
      ))}
    </ol>
  );
}

/** What the user is about to book: airline + route, hotel name, or car + supplier. */
function SelectedItem({ checkout }: { checkout: CheckoutView }) {
  const s = checkout.summary as Record<string, any>;
  if (checkout.product_type === "flight") {
    const slices: any[] = s.slices ?? [];
    return (
      <div className="space-y-2 rounded-xl border p-3">
        {slices.map((sl, i) => {
          const carriers = Array.from(new Map<string, any>(sl.segments.map((g: any) => [g.marketing_carrier?.iata_code, g.marketing_carrier])).values());
          return (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span className="flex -space-x-2">{carriers.map((c: any) => <AirlineLogo key={c?.iata_code} carrier={c} size={34} />)}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{carriers.map((c: any) => c?.name).join(" + ")}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {sl.origin?.iata_code} {formatLocal(sl.departing_at)} → {sl.destination?.iata_code} {formatLocal(sl.arriving_at)} · {sl.stops === 0 ? "Nonstop" : `${sl.stops} stop${sl.stops > 1 ? "s" : ""}`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  const name = checkout.product_type === "stay" ? s.accommodation?.name : `${s.car?.name ?? "Rental car"}`;
  const sub = checkout.product_type === "stay" ? `${s.check_in_date} → ${s.check_out_date}` : `${s.supplier?.name ?? s.supplier ?? ""}`;
  return (
    <div className="flex items-center gap-3 rounded-xl border p-3 text-sm">
      <ProductTile product={checkout.product_type} size={36} />
      <div className="min-w-0"><div className="truncate font-semibold">{name}</div><div className="truncate text-xs text-muted-foreground">{sub}</div></div>
    </div>
  );
}

/** Mirrors the airline's check: adults must be 18+; a child's date of birth must give the age searched with (at departure). */
function dobError(born: string, pax: { type: string; age: number | null } | undefined, departure?: string): string | null {
  const dob = new Date(born);
  if (Number.isNaN(dob.getTime())) return "enter a valid date of birth";
  const ref = departure ? new Date(departure) : new Date();
  if (dob > new Date()) return "date of birth can't be in the future";
  let age = ref.getFullYear() - dob.getFullYear();
  if (ref.getMonth() < dob.getMonth() || (ref.getMonth() === dob.getMonth() && ref.getDate() < dob.getDate())) age -= 1;
  if (pax?.type === "adult" && age < 18) return `adults must be 18 or older at departure (this gives age ${age})`;
  if (pax?.age != null && age !== pax.age) return `the date of birth gives age ${age} at departure, but you searched with a child aged ${pax.age}`;
  return null;
}

/** "Alvin Tsang" -> given "Alvin", family "Tsang"; "Tsang, Alvin" -> given "Alvin", family "Tsang". */
function splitName(full?: string | null): { given_name: string; family_name: string } {
  const name = (full ?? "").trim();
  if (!name) return { given_name: "", family_name: "" };
  if (name.includes(",")) {
    const [family, ...rest] = name.split(",");
    return { given_name: rest.join(" ").trim(), family_name: family.trim() };
  }
  const parts = name.split(/\s+/);
  return { given_name: parts[0], family_name: parts.slice(1).join(" ") };
}

function paymentTiming(co: CheckoutView, mode: "instant" | "hold") {
  if (co.product_type === "flight") return mode === "hold" ? "Held — pay later" : "Charged on confirmation";
  return "";
}

function Conditions({ checkout }: { checkout: CheckoutView }) {
  const c = checkout.conditions as Record<string, any>;
  const s = checkout.summary as Record<string, any>;
  const rows: { k: string; v: string }[] = [];
  if (checkout.product_type === "flight") {
    const r = c.refund_before_departure, ch = c.change_before_departure;
    rows.push({ k: "Refund", v: r ? (r.allowed ? `Allowed${r.penalty ? `, penalty ${formatMoney(r.penalty)}` : ""}` : "Not allowed") : "Not stated by the airline" });
    rows.push({ k: "Change", v: ch ? (ch.allowed ? `Allowed${ch.penalty ? `, penalty ${formatMoney(ch.penalty)}` : ""}` : "Not allowed") : "Not stated by the airline" });
  }
  if (checkout.product_type === "stay") {
    if (c.due_at_accommodation) rows.push({ k: "Payable at the property", v: formatMoney(c.due_at_accommodation) });
    if (c.tax) rows.push({ k: "Taxes", v: formatMoney(c.tax) });
    if (c.fee) rows.push({ k: "Fees", v: formatMoney(c.fee) });
    if (c.deposit) rows.push({ k: "Deposit", v: formatMoney(c.deposit) });
  }
  if (checkout.product_type === "car") {
    if (c.deposit) rows.push({ k: "Deposit", v: formatMoney(c.deposit) });
    (c.charges ?? []).forEach((x: any) => rows.push({ k: x.description ?? "Charge", v: formatMoney(x.amount) }));
  }
  const items: { title: string; text: string }[] = (c.items ?? []).map((i: any) => ({ title: i.title, text: i.description ?? i.text }));
  const timeline: any[] = c.cancellation_timeline ?? [];
  return (
    <div className="space-y-2 text-xs">
      {rows.map((r) => <div key={r.k} className="flex justify-between gap-3"><span className="text-muted-foreground">{r.k}</span><span>{r.v}</span></div>)}
      {timeline.length > 0 && (
        <div>
          <div className="font-medium">Cancellation</div>
          {timeline.map((t, i) => <div key={i} className="text-muted-foreground">Until {formatDateTime(t.before)}: refund {t.refund ? formatMoney(t.refund) : "none"}</div>)}
        </div>
      )}
      {items.map((i, idx) => <div key={idx}><span className="font-medium">{i.title}: </span><span className="text-muted-foreground">{i.text}</span></div>)}
      {checkout.product_type === "car" && s?.pickup_location?.additional_information?.map((i: any, idx: number) => (
        <div key={idx}><span className="font-medium">{i.title}: </span><span className="text-muted-foreground">{i.text}</span></div>
      ))}
      {(c.privacy_policies ?? []).length > 0 && <div className="text-muted-foreground">Supplier privacy policies apply ({c.privacy_policies.length}).</div>}
    </div>
  );
}

function ResultView({ result, onClose }: { result: BookResult; onClose: () => void }) {
  if (result.status === "booked") {
    const b: Booking = result.booking;
    return (
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2 font-semibold text-emerald-700"><CheckCircle2 className="size-5" /> Booking confirmed</div>
        <div>{b.title}</div>
        {b.supplier_reference && <div>Confirmation reference: <b className="font-mono">{b.supplier_reference}</b></div>}
        <div>Total: {formatMoney(b.total)} · Payment: {humanize(b.payment_status)}</div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button asChild><Link to={`/travel/duffel/bookings/${b.id}`}>View booking</Link></Button>
        </DialogFooter>
      </div>
    );
  }
  const failed = result.status === "failed";
  return (
    <div className="space-y-3 text-sm">
      <div className={`flex items-center gap-2 font-semibold ${failed ? "text-destructive" : "text-amber-700"}`}>
        {failed ? <AlertTriangle className="size-5" /> : <Clock className="size-5" />}
        {failed ? "Booking not completed" : "Awaiting supplier confirmation"}
      </div>
      <p>{result.status === "failed" || result.status === "pending_verification" ? result.message : ""}</p>
      {!failed && <p className="text-muted-foreground">Do not book again. The outcome is being verified and will appear under Bookings with a notification.</p>}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button asChild><Link to="/travel/duffel/bookings">Go to bookings</Link></Button>
      </DialogFooter>
    </div>
  );
}
