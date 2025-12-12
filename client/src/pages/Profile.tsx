import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { User, Lock, Mail, CheckCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function ProfilePage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreated, setIsCreated] = useState(false);
  const { register, handleSubmit, formState: { errors }, watch } = useForm();

  const password = watch("password");

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setIsCreated(true);
    toast({
      title: "Account Created",
      description: "Welcome to QuoteUs! Your profile has been set up successfully.",
    });
  };

  if (isCreated) {
    return (
      <div className="bg-secondary/30 min-h-screen py-20 px-4 flex items-center justify-center">
        <Card className="max-w-md w-full shadow-xl border-none text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
              <CheckCircle size={32} />
            </div>
            <CardTitle className="text-2xl font-serif text-primary">Profile Created!</CardTitle>
            <CardDescription>
              Your account has been successfully registered. You can now manage your quotes and policies.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center pb-8">
            <Link href="/dashboard">
              <Button className="bg-accent hover:bg-accent/90 text-white w-full">
                Go to Dashboard
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-secondary/30 min-h-screen pb-20">
      <div className="bg-primary text-white py-12 px-4">
        <div className="container mx-auto max-w-4xl text-center">
           <h1 className="text-3xl md:text-5xl font-serif font-bold mb-4">Create Your Profile</h1>
           <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
             Manage your quotes, track your policies, and get faster service.
           </p>
        </div>
      </div>

      <div className="container mx-auto max-w-md px-4 -mt-8">
        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="text-accent" /> New Account</CardTitle>
            <CardDescription>Enter your details below to create your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="name" {...register("name", { required: "Name is required" })} className="pl-9" placeholder="John Doe" autoComplete="name" />
                </div>
                {errors.name && <p className="text-destructive text-xs">{errors.name.message as string}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" {...register("email", { required: "Email is required" })} className="pl-9" placeholder="john@example.com" autoComplete="email" />
                </div>
                {errors.email && <p className="text-destructive text-xs">{errors.email.message as string}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type="password" 
                    {...register("password", { 
                      required: "Password is required",
                      minLength: { value: 8, message: "Password must be at least 8 characters" } 
                    })} 
                    className="pl-9" 
                    placeholder="••••••••" 
                    autoComplete="new-password"
                  />
                </div>
                {errors.password && <p className="text-destructive text-xs">{errors.password.message as string}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    {...register("confirmPassword", { 
                      validate: value => value === password || "Passwords do not match"
                    })} 
                    className="pl-9" 
                    placeholder="••••••••" 
                    autoComplete="new-password"
                  />
                </div>
                {errors.confirmPassword && <p className="text-destructive text-xs">{errors.confirmPassword.message as string}</p>}
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-white text-lg h-12" disabled={isSubmitting}>
                  {isSubmitting ? "Creating Account..." : "Create Profile"}
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t p-4 bg-secondary/10">
            <p className="text-sm text-muted-foreground">
              Already have an account? <Link href="/login" className="text-accent hover:underline font-medium">Log in</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
