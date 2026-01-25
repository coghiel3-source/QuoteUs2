import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function PaymentCanceledPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto bg-red-100 rounded-full p-4 w-20 h-20 flex items-center justify-center mb-4">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-800">Payment Canceled</CardTitle>
          <CardDescription className="text-base mt-2">
            Your payment was not completed. No charges have been made to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            If you have any questions about your insurance quote or need assistance, 
            please contact your broker or reach out to us at info@quoteus.ca
          </p>
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
