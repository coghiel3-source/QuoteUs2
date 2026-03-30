import { useEffect, useState } from "react";

export default function RgPaymentSuccess() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session_id");
  const code = params.get("code");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [payment, setPayment] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) { setStatus("error"); setError("No session found."); return; }
    fetch("/api/rg/payment/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setStatus("error"); }
        else { setPayment(data); setStatus("success"); }
      })
      .catch(() => { setError("Could not confirm payment."); setStatus("error"); });
  }, [sessionId]);

  if (status === "loading") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-600">Confirming your payment…</p>
      </div>
    </div>
  );

  if (status === "error") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow p-8 max-w-md text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Confirmation Error</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        {code && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4">
            <p className="text-xs text-blue-500 uppercase tracking-wide mb-1">Your Tracking Code</p>
            <p className="text-xl font-mono font-bold text-blue-800">{code}</p>
          </div>
        )}
        <p className="text-gray-400 text-sm">If you believe this is an error, please contact your agent with your tracking code.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-10 px-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-green-600 text-white px-8 py-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-1">Payment Successful!</h1>
          <p className="text-green-100 text-sm">Your Rent Guarantee premium has been received.</p>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-5">
          {/* Tracking Code */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-center">
            <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest mb-2">Payment Tracking Code</p>
            <p className="text-3xl font-mono font-bold text-blue-800 tracking-wider">
              {payment?.trackingCode || code}
            </p>
            <p className="text-xs text-blue-400 mt-2">Keep this code for your records</p>
          </div>

          {/* Payment details */}
          {payment && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Plan</span>
                <span className="font-medium capitalize">{payment.planType}</span>
              </div>
              {payment.periodLabel && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Period</span>
                  <span className="font-medium">{payment.periodLabel}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Amount Paid</span>
                <span className="font-bold text-gray-900">${(payment.amountCents / 100).toFixed(2)} CAD</span>
              </div>
              {payment.paidAt && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">Date</span>
                  <span className="font-medium">{new Date(payment.paidAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}</span>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-gray-400 text-center">
            A receipt has been saved. You may close this window.
          </p>

          <button
            onClick={() => window.close()}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>

        <div className="text-center pb-5 text-xs text-gray-300">Powered by QuoteUs.ca</div>
      </div>
    </div>
  );
}
