import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { liteapiService } from "@/services/liteapiService";
import type { HotelSearchCriteria, HotelSearchResponse } from "@/types/liteapi";
import CheckoutDialog from "./CheckoutDialog";
import { EmptyState, ErrorBox, Field, PageHeader, formatDateTime, formatMoney, todayISO, useLiteApiStatus } from "./shared";

export default function SearchBookPage() {
  const { data: status } = useLiteApiStatus();
  const [criteria, setCriteria] = useState<HotelSearchCriteria>({
    country_code: "SG",
    city_name: "Singapore",
    check_in: todayISO(30),
    check_out: todayISO(32),
    adults: 2,
    child_ages: [],
    rooms: 1,
    currency: "USD",
    guest_nationality: "US",
  });
  const [selection, setSelection] = useState<{ sessionId: string; offerId: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const search = useMutation<HotelSearchResponse, Error, HotelSearchCriteria>({
    mutationFn: (c) => liteapiService.searchHotels(c),
  });
  const set = <K extends keyof HotelSearchCriteria>(k: K, v: HotelSearchCriteria[K]) => setCriteria((c) => ({ ...c, [k]: v }));
  const result = search.data;

  return (
    <div className="w-full space-y-5">
      <PageHeader title="Search & Book" subtitle="Find hotels through LiteAPI and book them into your trips" />
      {status && !status.configured && <ErrorBox message={`LiteAPI is not configured: ${status.config_error}`} />}

      <form
        className="grid gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:grid-cols-6"
        onSubmit={(e) => { e.preventDefault(); setExpanded(null); search.mutate(criteria); }}
      >
        <Field label="Country (ISO code)"><Input maxLength={2} value={criteria.country_code} onChange={(e) => set("country_code", e.target.value.toUpperCase())} /></Field>
        <Field label="City" className="sm:col-span-2"><Input value={criteria.city_name} onChange={(e) => set("city_name", e.target.value)} /></Field>
        <Field label="Check-in"><Input type="date" min={todayISO()} value={criteria.check_in} onChange={(e) => set("check_in", e.target.value)} /></Field>
        <Field label="Check-out"><Input type="date" min={criteria.check_in} value={criteria.check_out} onChange={(e) => set("check_out", e.target.value)} /></Field>
        <Field label="Adults"><Input type="number" min={1} max={8} value={criteria.adults} onChange={(e) => set("adults", Math.max(1, Number(e.target.value)))} /></Field>
        <div className="sm:col-span-6 flex justify-end">
          <Button type="submit" disabled={search.isPending || !criteria.city_name || criteria.country_code.length !== 2}>
            {search.isPending ? "Searching…" : "Search hotels"}
          </Button>
        </div>
      </form>

      {search.error && <ErrorBox message={search.error.message} />}
      {result && result.hotels.length === 0 && <EmptyState title="No hotels available" hint="Try different dates or another city." />}

      {result && result.session_id && result.hotels.map((h) => (
        <div key={h.hotel_id} className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-start gap-4">
            {h.image && <img src={h.image} alt="" className="h-20 w-28 shrink-0 rounded-lg object-cover" loading="lazy" />}
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{h.name}</div>
              <div className="truncate text-xs text-muted-foreground">{h.address}</div>
              {h.stars ? (
                <div className="mt-1 flex">{Array.from({ length: Math.round(h.stars) }).map((_, i) => <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" />)}</div>
              ) : null}
            </div>
            <div className="shrink-0 text-right">
              <div className="text-xs text-muted-foreground">from</div>
              <div className="text-lg font-bold">{formatMoney(h.from_amount, h.currency)}</div>
              <Button size="sm" variant="outline" className="mt-1" onClick={() => setExpanded(expanded === h.hotel_id ? null : h.hotel_id)}>
                {expanded === h.hotel_id ? "Hide rooms" : `${h.offers.length} offers`}
              </Button>
            </div>
          </div>
          {expanded === h.hotel_id && (
            <div className="mt-3 divide-y rounded-lg border">
              {h.offers.map((o) => (
                <div key={o.offer_id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{o.room_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {o.board} · {o.refundable ? `Free cancellation until ${formatDateTime(o.cancel_deadline)}` : "Non-refundable"}
                    </div>
                  </div>
                  <div className="font-bold">{formatMoney(o.total_amount, o.currency)}</div>
                  <Button size="sm" onClick={() => setSelection({ sessionId: result.session_id as string, offerId: o.offer_id })}>Select</Button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <CheckoutDialog
        open={!!selection}
        onClose={() => setSelection(null)}
        sessionId={selection?.sessionId ?? ""}
        offerId={selection?.offerId ?? null}
      />
    </div>
  );
}
