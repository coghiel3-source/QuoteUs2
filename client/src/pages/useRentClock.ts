import { useEffect, useState } from "react";
import { calculateExposure, calculationUrl, DEFAULT_CALCULATION, embedCode, restoreCalculation, type CalculationInputs } from "./rentClockCalculation";

export function useRentClock() {
  // Match prerendered campaign HTML first. Client-only embeds can restore
  // immediately so they never flash the full campaign page.
  const prerendered = typeof window === "undefined" ||
    document.getElementById("root")?.dataset.prerendered === "true";
  const [inputs, setInputs] = useState<CalculationInputs>(() => prerendered ? { ...DEFAULT_CALCULATION } : restoreCalculation(window.location.search));
  const [isEmbed, setIsEmbed] = useState(() => !prerendered && new URLSearchParams(window.location.search).get("embed") === "1");
  const [origin, setOrigin] = useState(() => prerendered ? "" : window.location.origin);
  useEffect(() => {
    const restore = () => {
      setInputs(restoreCalculation(window.location.search));
      setIsEmbed(new URLSearchParams(window.location.search).get("embed") === "1");
      setOrigin(window.location.origin);
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  const total = calculateExposure(inputs);
  return {
    inputs, setInputs, total, isEmbed,
    shareUrl: origin && total !== null ? calculationUrl(origin, inputs) : "",
    iframeCode: origin ? embedCode(origin, inputs.province) : "",
  };
}

export function useCopyText() {
  const [feedback, setFeedback] = useState("");
  const [fallback, setFallback] = useState("");
  async function copy(text: string, successMessage: string) {
    setFeedback("");
    setFallback("");
    if (!text) {
      setFeedback("This calculation cannot be shared yet. Check the inputs and try again.");
      return false;
    }
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      setFeedback(successMessage);
      return true;
    } catch {
      setFallback(text);
      setFeedback("Automatic copying is unavailable. Select and copy the text below.");
      return false;
    }
  }
  return { copy, feedback, fallback };
}
