import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Field } from "./shared";

// [ISO country, name, dial code]. Common business-travel markets; the stored value is always E.164 (+<dial><number>).
export const COUNTRY_CODES: [string, string, string][] = [
  ["CA", "Canada", "1"], ["US", "United States", "1"], ["GB", "United Kingdom", "44"], ["IE", "Ireland", "353"],
  ["FR", "France", "33"], ["DE", "Germany", "49"], ["ES", "Spain", "34"], ["IT", "Italy", "39"], ["NL", "Netherlands", "31"],
  ["BE", "Belgium", "32"], ["CH", "Switzerland", "41"], ["AT", "Austria", "43"], ["SE", "Sweden", "46"], ["NO", "Norway", "47"],
  ["DK", "Denmark", "45"], ["FI", "Finland", "358"], ["PT", "Portugal", "351"], ["PL", "Poland", "48"], ["CZ", "Czechia", "420"],
  ["GR", "Greece", "30"], ["TR", "Türkiye", "90"], ["AE", "United Arab Emirates", "971"], ["SA", "Saudi Arabia", "966"],
  ["QA", "Qatar", "974"], ["IL", "Israel", "972"], ["LB", "Lebanon", "961"], ["EG", "Egypt", "20"], ["ZA", "South Africa", "27"],
  ["NG", "Nigeria", "234"], ["KE", "Kenya", "254"], ["IN", "India", "91"], ["PK", "Pakistan", "92"], ["CN", "China", "86"],
  ["HK", "Hong Kong", "852"], ["JP", "Japan", "81"], ["KR", "South Korea", "82"], ["SG", "Singapore", "65"], ["MY", "Malaysia", "60"],
  ["TH", "Thailand", "66"], ["PH", "Philippines", "63"], ["VN", "Vietnam", "84"], ["ID", "Indonesia", "62"], ["AU", "Australia", "61"],
  ["NZ", "New Zealand", "64"], ["MX", "Mexico", "52"], ["BR", "Brazil", "55"], ["AR", "Argentina", "54"], ["CL", "Chile", "56"],
  ["CO", "Colombia", "57"],
];

const dialOf = (iso: string) => COUNTRY_CODES.find(([c]) => c === iso)?.[2] ?? "1";

/** Split an E.164 value into country + national number, preferring `preferred` when several countries share a code (+1). */
export function splitPhone(value: string, preferred: string): { iso: string; national: string } {
  if (!value.startsWith("+")) return { iso: preferred, national: value.replace(/\D/g, "") };
  const digits = value.slice(1).replace(/\D/g, "");
  const matches = COUNTRY_CODES.filter(([, , d]) => digits.startsWith(d)).sort((a, b) => b[2].length - a[2].length);
  if (matches.length === 0) return { iso: preferred, national: digits };
  const longest = matches[0][2].length;
  const best = matches.filter(([, , d]) => d.length === longest);
  const pick = best.find(([c]) => c === preferred) ?? best[0];
  return { iso: pick[0], national: digits.slice(pick[2].length) };
}

/** Best-effort E.164 from a free-form directory phone ("+1 (416) 555-0100"). Returns "" when the country can't be known. */
export function normalizePhone(raw?: string | null): string {
  if (!raw) return "";
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return `+${cleaned.slice(1).replace(/\D/g, "")}`;
  if (cleaned.startsWith("00")) return `+${cleaned.slice(2)}`;
  return "";
}

/** Country code + phone number as two controls; reports a combined E.164 string (or "" while the number is empty). */
export default function PhoneInput({
  label,
  value,
  onChange,
  defaultCountry = "CA",
}: {
  label: string;
  value: string;
  onChange: (e164: string) => void;
  defaultCountry?: string;
}) {
  const [preferred, setPreferred] = useState(defaultCountry);
  const { iso, national } = splitPhone(value, preferred);
  const emit = (code: string, num: string) => onChange(num ? `+${dialOf(code)}${num}` : "");

  return (
    <Field label={label}>
      <div className="flex gap-2">
        <div className="relative h-9 w-24 shrink-0">
          {/* The native select stays on top (invisible) so the full country list still opens; the label shown is compact. */}
          <div className="pointer-events-none flex h-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground dark:bg-input/30">
            <span className="truncate">{iso} +{dialOf(iso)}</span>
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          </div>
          <select
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            value={iso}
            aria-label="Country code"
            title={COUNTRY_CODES.find(([c]) => c === iso)?.[1]}
            onChange={(e) => {
              setPreferred(e.target.value);
              emit(e.target.value, national);
            }}
          >
            {COUNTRY_CODES.map(([c, name, d]) => (
              <option key={c} value={c}>{name} (+{d})</option>
            ))}
          </select>
        </div>
        <Input
          className="h-9 min-w-0 flex-1"
          inputMode="tel"
          autoComplete="off"
          placeholder="Phone number"
          aria-label="Phone number"
          value={national}
          onChange={(e) => emit(iso, e.target.value.replace(/\D/g, "").slice(0, 14))}
        />
      </div>
    </Field>
  );
}
