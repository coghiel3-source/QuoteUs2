import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CreditCard, DollarSign, History, Plus, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

interface Transaction {
  id: string;
  type: string;
  amount: string;
  balanceAfter: string;
  description: string;
  createdAt: string;
}

interface CreditPackage {
  amount: number;
  label: string;
}

export default function BrokerCredits() {
  const { user, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [leadCosts, setLeadCosts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check for success/cancel query params
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      const amount = params.get("amount");
      setSuccessMessage(`Successfully purchased $${amount} in credits!`);
      refreshUser?.();
      // Clean URL
      window.history.replaceState({}, "", "/broker/credits");
    }
    if (params.get("canceled") === "true") {
      window.history.replaceState({}, "", "/broker/credits");
    }
  }, [refreshUser]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    Promise.all([
      fetch(`/api/users/${user.id}/transactions`).then(r => r.json()),
      fetch("/api/credits/packages").then(r => r.json()),
      fetch("/api/credits/lead-costs").then(r => r.json()),
    ]).then(([txns, pkgs, costs]) => {
      setTransactions(txns);
      setPackages(pkgs.packages || []);
      setLeadCosts(costs.costs || {});
    }).finally(() => setLoading(false));
  }, [user]);

  const handlePurchase = async (amount: number) => {
    if (!user) return;
    
    setPurchaseLoading(amount);
    try {
      const response = await fetch("/api/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, amount }),
      });
      
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to create checkout session");
      }
    } catch (error) {
      console.error("Purchase error:", error);
      alert("Failed to initiate purchase");
    } finally {
      setPurchaseLoading(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="loading">
        <p>Loading...</p>
      </div>
    );
  }

  const balance = parseFloat(user.balance || "0");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation("/broker")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Lead Credits</h1>
              <p className="text-sm text-gray-500">Purchase credits to receive leads</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3" data-testid="success-message">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-green-800">{successMessage}</p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSuccessMessage(null)}
              className="ml-auto"
            >
              Dismiss
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Current Balance */}
          <Card data-testid="card-balance">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Current Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-green-600" data-testid="text-balance">
                ${balance.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 mt-1">Available for leads</p>
            </CardContent>
          </Card>

          {/* Lead Pricing Info */}
          <Card className="md:col-span-2" data-testid="card-lead-costs">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Lead Costs</CardTitle>
              <CardDescription>Cost per lead by insurance type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(leadCosts).map(([type, cost]) => (
                  <Badge key={type} variant="outline" className="text-sm py-1 px-3">
                    {type}: <span className="font-semibold ml-1">${cost}</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Purchase Credits */}
        <Card className="mb-8" data-testid="card-purchase">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Purchase Credits
            </CardTitle>
            <CardDescription>Select an amount to add to your balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {packages.map((pkg) => (
                <Button
                  key={pkg.amount}
                  variant="outline"
                  className="h-20 text-lg font-semibold hover:bg-green-50 hover:border-green-500"
                  onClick={() => handlePurchase(pkg.amount)}
                  disabled={purchaseLoading !== null}
                  data-testid={`button-purchase-${pkg.amount}`}
                >
                  {purchaseLoading === pkg.amount ? (
                    <span className="animate-pulse">Processing...</span>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1" />
                      {pkg.label}
                    </>
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card data-testid="card-transactions">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Transaction History
            </CardTitle>
            <CardDescription>Your credit purchases and lead deductions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-500">Loading transactions...</p>
            ) : transactions.length === 0 ? (
              <p className="text-gray-500">No transactions yet</p>
            ) : (
              <div className="space-y-3">
                {transactions.map((txn) => {
                  const amount = parseFloat(txn.amount);
                  const isPositive = amount >= 0;
                  
                  return (
                    <div 
                      key={txn.id} 
                      className="flex items-center justify-between py-3 border-b last:border-0"
                      data-testid={`transaction-${txn.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isPositive ? 'bg-green-100' : 'bg-red-100'}`}>
                          {isPositive ? (
                            <Plus className="h-4 w-4 text-green-600" />
                          ) : (
                            <DollarSign className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{txn.description}</p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(txn.createdAt), "MMM d, yyyy h:mm a")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isPositive ? '+' : ''}{amount.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Balance: ${parseFloat(txn.balanceAfter).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
