import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function PaymentSuccessPage() {
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("session_id");
    
    if (sessionId) {
      fetch("/api/payments/premium/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setConfirmed(true);
          } else {
            setError(data.error || "Payment confirmation failed");
          }
        })
        .catch(err => setError(err.message));
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto bg-green-100 rounded-full p-4 w-20 h-20 flex items-center justify-center mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-800">Payment Successful!</CardTitle>
          <CardDescription className="text-base mt-2">
            Thank you for your payment. Your insurance premium has been received successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {confirmed && (
            <p className="text-sm text-muted-foreground">
              Your payment has been confirmed and your policy is now active.
            </p>
          )}
          {error && (
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="pt-4">
            <Link href="/">
              <Button variant="outline" data-testid="button-return-home">
                Return to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
