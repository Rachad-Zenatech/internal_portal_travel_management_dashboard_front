import { useEffect } from "react";
import { Outlet } from "react-router-dom";

export type IntegrationAccent = "duffel" | "liteapi" | "sabre";

/**
 * Shared look for the travel-provider integration pages: one accent color per provider, with a light tint on the
 * card components (the page background itself stays unchanged).
 * The accent is applied as a data attribute on <html> (see index.css) so dialogs and popovers, which render outside this
 * element, pick up the same colors. The attribute is removed when leaving the integration.
 */
export default function IntegrationLayout({ accent }: { accent: IntegrationAccent }) {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.integration = accent;
    return () => {
      if (root.dataset.integration === accent) delete root.dataset.integration;
    };
  }, [accent]);

  return (
    <div data-integration-shell={accent}>
      <Outlet />
    </div>
  );
}
