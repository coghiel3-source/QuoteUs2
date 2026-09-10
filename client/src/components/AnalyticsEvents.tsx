import { useEffect } from "react";
import { useLocation } from "wouter";
import { insuranceRoutes, trackEvent } from "@/lib/analytics";

const publicPages = new Set([
  "/", "/about", "/contact", "/compare", "/privacy", "/terms",
  ...Object.keys(insuranceRoutes),
]);

/** Track only allowlisted public interactions, never form values or token URLs. */
export default function AnalyticsEvents() {
  const [path] = useLocation();

  useEffect(() => {
    if (!publicPages.has(path)) return;
    const startedForms = new WeakSet<HTMLFormElement>();
    const onInput = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const form = target.closest("form");
      if (!form || startedForms.has(form)) return;
      const footer = !!form.closest("footer");
      if (footer || path === "/contact") {
        startedForms.add(form);
        trackEvent("contact_started", { location: footer ? "footer" : "contact_page" });
      } else if (insuranceRoutes[path] && form.closest("main")) {
        startedForms.add(form);
        trackEvent("quote_started", { insurance_type: insuranceRoutes[path] });
      }
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a");
      if (!link) return;
      const href = link.getAttribute("href") || "";
      const location = link.closest("footer") ? "footer" : link.closest("main") ? "content" : "header";
      if (href.startsWith("tel:") || href.startsWith("mailto:") || href === "/contact") {
        trackEvent("contact_clicked", {
          channel: href.startsWith("tel:") ? "phone" : href.startsWith("mailto:") ? "email" : "contact_page",
          location,
          page: path,
        });
      } else if (insuranceRoutes[href]) {
        trackEvent("insurance_link_clicked", {
          insurance_type: insuranceRoutes[href], location, page: path,
        });
      }
    };
    document.addEventListener("input", onInput, true);
    document.addEventListener("change", onInput, true);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("change", onInput, true);
      document.removeEventListener("click", onClick, true);
    };
  }, [path]);
  return null;
}