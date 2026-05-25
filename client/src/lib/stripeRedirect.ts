export function redirectToStripeCheckout(url: string) {
  if (!url) return;
  const inIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  if (inIframe) {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (!w) {
      try { (window.top as Window).location.href = url; return; } catch {}
      window.location.href = url;
    }
    return;
  }
  window.location.href = url;
}
