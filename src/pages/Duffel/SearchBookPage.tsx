import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Lock } from "lucide-react";
import { duffelService } from "@/services/duffelService";
import type { ProductType } from "@/types/duffel";
import CarsTab from "./CarsTab";
import CheckoutDialog from "./CheckoutDialog";
import FlightsTab from "./FlightsTab";
import StaysTab from "./StaysTab";
import { ErrorBox, PageHeader, ProductTile, useDuffelStatus } from "./shared";

const TABS = [
  { value: "flights", label: "Flights", hint: "Airlines worldwide", product: "flight" as ProductType },
  { value: "hotels", label: "Hotels", hint: "Rooms & rates", product: "stay" as ProductType },
  { value: "cars", label: "Rental Cars", hint: "Pick-up & drop-off", product: "car" as ProductType },
];

export default function SearchBookPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "flights";
  const { data: status } = useDuffelStatus();
  const { data: preset } = useQuery({ queryKey: ["duffel", "preset"], queryFn: () => duffelService.getSandboxPreset(), staleTime: 3_600_000 });
  const [selection, setSelection] = useState<{ sessionId: string; product: ProductType; ref: string } | null>(null);

  const blocked = (p: ProductType) => (status?.products[p]?.state === "access_required" ? status.products[p].message : null);
  const open = (product: ProductType) => (sessionId: string, ref: string) => setSelection({ sessionId, product, ref });

  return (
    <div className="w-full space-y-5">
      <PageHeader title="Search & Book" subtitle="Find flights, hotels and rental cars — each is booked independently and added to your trips" />
      {status && !status.configured && <ErrorBox message={`Duffel is not configured: ${status.config_error}`} />}

      <div role="tablist" aria-label="Travel product" className="grid grid-cols-3 gap-2 sm:gap-3">
        {TABS.map((t) => {
          const active = tab === t.value;
          const locked = status?.products[t.product]?.state === "access_required";
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setParams({ tab: t.value }, { replace: true })}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-all sm:flex-row sm:gap-3 sm:p-4 sm:text-left ${
                active ? "border-primary bg-card shadow-md ring-2 ring-primary/30" : "bg-card/60 hover:border-primary/40 hover:bg-card"
              }`}
            >
              <ProductTile product={t.product} size={40} />
              <span className="min-w-0">
                <span className="flex items-center justify-center gap-1.5 text-xs font-semibold sm:justify-start sm:text-sm">
                  {t.label}
                  {locked && <Lock className="size-3 text-blue-600" aria-label="Duffel access required" />}
                </span>
                <span className="hidden truncate text-xs text-muted-foreground sm:block">{locked ? "Access required" : t.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        {tab === "flights" && <FlightsTab preset={preset} accessMessage={blocked("flight")} onSelect={open("flight")} />}
        {tab === "hotels" && <StaysTab preset={preset} blockedMessage={blocked("stay")} onSelect={open("stay")} />}
        {tab === "cars" && <CarsTab preset={preset} blockedMessage={blocked("car")} onSelect={open("car")} />}
      </div>

      <CheckoutDialog
        open={!!selection}
        onClose={() => setSelection(null)}
        sessionId={selection?.sessionId ?? ""}
        product={selection?.product ?? "flight"}
        providerRef={selection?.ref ?? null}
      />
    </div>
  );
}
