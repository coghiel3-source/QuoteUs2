import { useEffect, useState } from "react";
import { calculateExposure, calculationUrl, DEFAULT_CALCULATION, embedCode, restoreCalculation, type CalculationInputs } from "./rentClockCalculation";

export function useRentClock() {
  // The existing app is client-rendered. Read query state on the first render
  // so embeds never flash the campaign page before displaying the widget.
  const [inputs, setInputs] = useState<CalculationInputs>(() => typeof window === "undefined" ? { ...DEFAULT_CALCULATION } : restoreCalculation(window.location.search));
  const [isEmbed, setIsEmbed] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("embed") === "1");
  const [origin, setOrigin] = useState(() => typeof window === "undefined" ? "" : window.location.origin);
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
      return;
    }
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      setFeedback(successMessage);
    } catch {
      setFallback(text);
      setFeedback("Automatic copying is unavailable. Select and copy the text below.");
    }
  }
  return { copy, feedback, fallback };
}
