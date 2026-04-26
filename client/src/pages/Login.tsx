import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Lock, Mail, Eye, EyeOff, Briefcase, ShieldCheck, ArrowLeft } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";

import { useAuth } from "@/lib/AuthContext";

export default function LoginPage() {
  const { toast } = useToast();
  const { login, verifyTwoFactor, pendingTwoFactor } = useAuth();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("broker");

  // OTP step state
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Auto-fill OTP digits when SMTP is not configured and preview code is available
  useEffect(() => {
    if (pendingTwoFactor?.previewCode) {
      setOtpDigits(pendingTwoFactor.previewCode.split(""));
    }
  }, [pendingTwoFactor?.previewCode]);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    const result = await login(data.email, selectedRole as any, data.password);
    setIsSubmitting(false);

    if (result === true) {
      toast({ title: "Welcome!", description: "You have successfully logged in." });
      setLocation(selectedRole === "rep" ? "/rep" : "/admin");
    } else if (result === 'twoFactor') {
      // 2FA required — OTP form will render (pendingTwoFactor is now set in context)
      setOtpDigits(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } else {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid email or password. Please contact admin if you need access.",
      });
    }
  };

  const handleOtpInput = (index: number, value: string) => {
    // Accept paste of full 6-digit code
    if (value.length === 6 && /^\d{6}$/.test(value)) {
      const digits = value.split("");
      setOtpDigits(digits);
      otpRefs[5].current?.focus();
      return;
    }
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    if (digit && index < 5) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (otpDigits[index]) {
        const next = [...otpDigits];
        next[index] = "";
        setOtpDigits(next);
      } else if (index > 0) {
        otpRefs[index - 1].current?.focus();
      }
    }
  };

  const handleOtpSubmit = async () => {
    const token = otpDigits.join("");
    if (token.length !== 6) {
      toast({ variant: "destructive", title: "Enter all 6 digits" });
      return;
    }
    setIsSubmitting(true);
    try {
      const success = await verifyTwoFactor(token);
      if (success) {
        toast({ title: "Welcome!", description: "You have successfully logged in." });
        setLocation(selectedRole === "rep" ? "/rep" : "/admin");
      } else {
        toast({ variant: "destructive", title: "Invalid code", description: "The code is incorrect or expired. Please try again." });
        setOtpDigits(["", "", "", "", "", ""]);
        otpRefs[0].current?.focus();
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Verification failed. Please try again." });
    }
    setIsSubmitting(false);
  };

  // ── 2FA step ──
  if (pendingTwoFactor) {
    return (
      <div className="bg-secondary/30 min-h-screen pb-20">
        <div className="bg-primary text-white py-12 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-3xl md:text-5xl font-serif font-bold mb-4">Check Your Email</h1>
            <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
              A 6-digit verification code has been sent to your email address.
            </p>
          </div>
        </div>

        <div className="container mx-auto max-w-md px-4 -mt-8">
          <Card className="shadow-lg border-none">
            <CardHeader className="text-center">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="h-7 w-7 text-blue-600" />
              </div>
              <CardTitle>Email Verification</CardTitle>
              <CardDescription>Enter the 6-digit code sent to your email address. The code expires in 10 minutes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center gap-2">
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={otpRefs[i]}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={e => handleOtpInput(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    onFocus={e => e.target.select()}
                    className="w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl bg-white focus:border-blue-500 focus:outline-none transition-colors"
                    data-testid={`input-otp-${i}`}
                  />
                ))}
              </div>

              {pendingTwoFactor.previewCode && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-center">
                  <p className="text-xs text-amber-700 font-medium mb-1">SMTP not configured — code auto-filled above:</p>
                  <p className="text-2xl font-bold font-mono tracking-widest text-amber-800">{pendingTwoFactor.previewCode}</p>
                  <p className="text-xs text-amber-600 mt-1">Click "Verify &amp; Sign In" to continue</p>
                </div>
              )}

              <Button
                onClick={handleOtpSubmit}
                disabled={isSubmitting || otpDigits.join("").length !== 6}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white h-12 text-base font-semibold"
                data-testid="button-verify-2fa"
              >
                {isSubmitting ? "Verifying…" : "Verify & Sign In"}
              </Button>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back to login
              </button>
            </CardContent>
          </Card>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Didn't receive the email? Check your spam folder, or go back and try again.
          </p>
        </div>
      </div>
    );
  }

  // ── Credentials step ──
  return (
    <div className="bg-secondary/30 min-h-screen pb-20">
      <div className="bg-primary text-white py-12 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-3xl md:text-5xl font-serif font-bold mb-4">Broker Portal</h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Access your profile now.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-md px-4 -mt-8">
        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Briefcase className="text-accent" /> Broker Login</CardTitle>
            <CardDescription>Enter your credentials to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" {...register("email", { required: "Email is required" })} className="pl-9" placeholder="broker@example.com" autoComplete="email" data-testid="input-email" />
                </div>
                {errors.email && <p className="text-destructive text-xs">{errors.email.message as string}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    {...register("password", { required: "Password is required" })}
                    className="pl-9 pr-10"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-destructive text-xs">{errors.password.message as string}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger data-testid="select-role">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                    <SelectItem value="broker">Broker</SelectItem>
                    <SelectItem value="rep">Rep (Rent Guarantee)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-white text-lg h-12" disabled={isSubmitting} data-testid="button-login">
                  {isSubmitting ? "Logging in..." : "Log In"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Need broker access? Contact your administrator to set up your account.
        </p>
      </div>
    </div>
  );
}
