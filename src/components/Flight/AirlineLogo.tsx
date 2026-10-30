import { useState } from "react";

export const getAirlineMeta = (name: string) => {
  const n = (name || "").toLowerCase();
  if (n.includes("air canada")) {
    return {
      code: "AC",
      badgeStyle: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
    };
  }
  if (n.includes("westjet")) {
    return {
      code: "WS",
      badgeStyle: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30",
    };
  }
  if (n.includes("porter")) {
    return {
      code: "PD",
      badgeStyle: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
    };
  }
  if (n.includes("flair")) {
    return {
      code: "F8",
      badgeStyle: "bg-lime-500/10 text-lime-700 dark:text-lime-400 border-lime-500/30",
    };
  }
  if (n.includes("united")) {
    return {
      code: "UA",
      badgeStyle: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
    };
  }
  if (n.includes("delta")) {
    return {
      code: "DL",
      badgeStyle: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
    };
  }
  if (n.includes("american")) {
    return {
      code: "AA",
      badgeStyle: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30",
    };
  }
  return {
    code: name ? name.slice(0, 2).toUpperCase() : "FL",
    badgeStyle: "bg-primary/10 text-primary border-primary/20",
  };
};

const LOGO_BASE = "https://assets.duffel.com/img/airlines/for-light-background/full-color-logo";

/** Two-character IATA carrier code from a flight number such as "AC 123" or "WS1234". */
export function carrierCodeFromFlightNumber(flightNumber?: string | null): string | null {
  const m = (flightNumber ?? "").trim().toUpperCase().match(/^([A-Z0-9]{2})\s?\d/);
  return m ? m[1] : null;
}

interface AirlineLogoProps {
  airlineName: string;
  flightNumber?: string | null;
  size?: number;
  className?: string;
}

/** Airline logo with an initials badge fallback when the carrier code is unknown or the image fails to load. */
export function AirlineLogo({ airlineName, flightNumber, size = 32, className = "" }: AirlineLogoProps) {
  const [failed, setFailed] = useState(false);
  const meta = getAirlineMeta(airlineName);
  const code = carrierCodeFromFlightNumber(flightNumber) ?? meta.code;
  const style = { width: size, height: size };

  if (!failed && /^[A-Z0-9]{2}$/.test(code)) {
    return (
      <img
        src={`${LOGO_BASE}/${code}.svg`}
        alt={airlineName}
        title={airlineName}
        style={style}
        className={`shrink-0 rounded-lg border border-border bg-white object-contain p-0.5 ${className}`}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div
      title={airlineName}
      style={style}
      className={`rounded-lg flex items-center justify-center text-xs font-black shrink-0 border shadow-2xs ${meta.badgeStyle} ${className}`}
    >
      {code}
    </div>
  );
}
