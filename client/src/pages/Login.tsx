import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Lock, Mail, LogIn, Eye, EyeOff, Briefcase } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

import { useAuth } from "@/lib/AuthContext";

export default function LoginPage() {
  const { toast } = useToast();
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    
    const success = await login(data.email, 'broker', data.password);
    
    setIsSubmitting(false);
    
    if (success) {
      toast({
        title: "Welcome!",
        description: "You have successfully logged in to the broker portal.",
      });
      setLocation("/admin");
    } else {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid email or password. Please contact admin if you need access.",
      });
    }
  };

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
