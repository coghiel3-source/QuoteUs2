import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setIsSuccess(true);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Something went wrong. Please try again.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unable to process your request. Please try again later.",
      });
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="bg-secondary/30 min-h-screen pb-20">
      <div className="bg-primary text-white py-12 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-3xl md:text-5xl font-serif font-bold mb-4">Reset Your Password</h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-md px-4 -mt-8">
        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isSuccess ? <CheckCircle className="text-accent" /> : <Mail className="text-accent" />}
              {isSuccess ? "Check Your Email" : "Forgot Password"}
            </CardTitle>
            <CardDescription>
              {isSuccess 
                ? "We've sent a password reset link to your email."
                : "Enter the email address associated with your account."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSuccess ? (
              <div className="space-y-4">
                <div className="bg-accent/10 p-4 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    If an account exists with that email, you'll receive a password reset link within a few minutes.
                  </p>
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  Didn't receive the email? Check your spam folder or{" "}
                  <button 
                    onClick={() => setIsSuccess(false)} 
                    className="text-accent hover:underline"
                    data-testid="button-try-again"
                  >
                    try again
                  </button>
                </p>
                <Link href="/login">
                  <Button variant="outline" className="w-full" data-testid="button-back-to-login">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email" 
                      {...register("email", { required: "Email is required" })} 
                      className="pl-9" 
                      placeholder="john@example.com" 
                      autoComplete="email"
                      data-testid="input-email"
                    />
                  </div>
                  {errors.email && <p className="text-destructive text-xs">{errors.email.message as string}</p>}
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-accent hover:bg-accent/90" 
                  disabled={isSubmitting}
                  data-testid="button-reset"
                >
                  {isSubmitting ? "Sending..." : "Send Reset Link"}
                </Button>

                <Link href="/login">
                  <Button variant="ghost" className="w-full" type="button">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
                  </Button>
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
