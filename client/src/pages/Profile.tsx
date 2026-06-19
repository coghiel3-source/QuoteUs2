import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { User, Lock, Mail, CheckCircle, FileText, Calendar, MapPin, Phone, Car, Home, Briefcase, Plane, Heart, Dog, LogOut, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/AuthContext";
import { useQuotes } from "@/lib/QuoteContext";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function ProfilePage() {
  const { toast } = useToast();
  const { user, register: registerUser, logout, loginWithGoogle } = useAuth();
  const { quotes } = useQuotes();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [, setLocation] = useLocation();
  
  const { register, handleSubmit, formState: { errors }, watch } = useForm();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleAuth = params.get('google_auth');
    const userId = params.get('user_id');
    const error = params.get('error');

    if (error === 'google_auth_failed') {
      toast({
        title: "Google Sign-In Failed",
        description: "Could not sign in with Google. Please try again or use email/password.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/profile');
    } else if (googleAuth === 'success' && userId) {
      loginWithGoogle(userId).then((success) => {
        if (success) {
          toast({
            title: "Welcome!",
            description: "You have successfully signed in with Google.",
          });
        }
        window.history.replaceState({}, '', '/profile');
      });
    }
  }, []);

  const password = watch("password");

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    
    try {
      // Register the user and log them in immediately
      await registerUser(data.name, data.email, data.password, 'customer');
      
      setIsSubmitting(false);
      
      toast({
        title: "Account Created",
        description: "Welcome! Your account has been created successfully.",
      });
    } catch (error: any) {
      setIsSubmitting(false);
      toast({
        title: "Registration Failed",
        description: error.message || "Could not create account. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'Auto': return <Car size={16} />;
      case 'Home': return <Home size={16} />;
      case 'Tenant': return <Home size={16} />;
      case 'Business': return <Briefcase size={16} />;
      case 'Travel': return <Plane size={16} />;
      case 'Life': return <Heart size={16} />;
      case 'Pet': return <Dog size={16} />;
      default: return <FileText size={16} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-700';
      case 'Contacted': return 'bg-yellow-100 text-yellow-700';
      case 'Quoted': return 'bg-green-100 text-green-700';
      case 'Closed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  // If user is logged in, show their dashboard
  if (user) {
    const myQuotes = quotes.filter(q => q.email === user.email);

    return (
      <div className="bg-secondary/30 min-h-screen pb-20">
        <div className="bg-primary text-white py-8 px-4">
          <div className="container mx-auto max-w-4xl flex justify-between items-center">
            <div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold mb-2">My Profile</h1>
              <p className="text-primary-foreground/80">Welcome back, {user.name}</p>
            </div>
            <Button variant="outline" className="text-primary bg-white hover:bg-white/90 gap-2" onClick={logout}>
              <LogOut size={16} /> Logout
            </Button>
          </div>
        </div>

        <div className="container mx-auto max-w-4xl px-4 -mt-8">
          <div className="grid gap-6">
            <Card className="shadow-lg border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="text-accent" /> My Quotes</CardTitle>
                <CardDescription>Track the status of your insurance quotes.</CardDescription>
              </CardHeader>
              <CardContent>
                {myQuotes.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <div className="mx-auto w-12 h-12 bg-secondary rounded-full flex items-center justify-center mb-4 text-muted-foreground">
                      <FileText size={24} />
                    </div>
                    <h3 className="font-bold text-lg mb-2">No Quotes Yet</h3>
                    <p className="text-muted-foreground mb-6">You haven't submitted any quote requests yet.</p>
                    <div className="flex justify-center gap-4 flex-wrap">
                       <Link href="/auto"><Button variant="outline">Get Auto Quote</Button></Link>
                       <Link href="/home-insurance"><Button variant="outline">Get Home Quote</Button></Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myQuotes.map((quote) => (
                      <div key={quote.id} className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center p-4 rounded-lg border bg-white hover:shadow-md transition-shadow">
                        <div className="flex gap-4 items-start">
                          <div className="mt-1 p-2 bg-secondary/20 rounded-lg text-primary">
                            {getIconForType(quote.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold">{quote.type} Insurance</h3>
                              {quote.quoteNumber && (
                                <Badge variant="secondary" className="font-mono text-[10px]">
                                  {quote.quoteNumber}
                                </Badge>
                              )}
                              <Badge variant="outline" className={getStatusColor(quote.status)}>
                                {quote.status}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground flex flex-col gap-1">
                              <span className="flex items-center gap-1"><Calendar size={12} /> Requested on {quote.date ? format(new Date(quote.date), 'MMM d, yyyy') : '—'}</span>
                              <span className="flex items-center gap-1"><MapPin size={12} /> {quote.postalCode}</span>
                            </div>
                          </div>
                        </div>
                        <div className="w-full md:w-auto">
                          {quote.status === 'Quoted' ? (
                            <Button className="w-full md:w-auto bg-green-600 hover:bg-green-700">View Quote</Button>
                          ) : (
                            <Button variant="outline" className="w-full md:w-auto" disabled>Processing</Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-lg border-none">
               <CardHeader>
                 <CardTitle className="flex items-center gap-2"><User className="text-accent" /> Account Details</CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="grid md:grid-cols-2 gap-4">
                   <div className="space-y-1">
                     <Label className="text-muted-foreground">Full Name</Label>
                     <p className="font-medium">{user.name}</p>
                   </div>
                   <div className="space-y-1">
                     <Label className="text-muted-foreground">Email Address</Label>
                     <p className="font-medium">{user.email}</p>
                   </div>
                   <div className="space-y-1">
                     <Label className="text-muted-foreground">Account Status</Label>
                     <Badge className="bg-green-500">Active</Badge>
                   </div>
                 </div>
               </CardContent>
            </Card>
          </div>
        </div>
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
                      type={showPassword ? "text" : "password"}
                      {...register("password", { 
                        required: "Password is required",
                        minLength: { value: 8, message: "Password must be at least 8 characters" } 
                      })} 
                      className="pl-9 pr-10" 
                      placeholder="••••••••" 
                      autoComplete="new-password"
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
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="confirmPassword" 
                      type={showConfirmPassword ? "text" : "password"} 
                      {...register("confirmPassword", { 
                        validate: value => value === password || "Passwords do not match"
                      })} 
                      className="pl-9 pr-10" 
                      placeholder="••••••••" 
                      autoComplete="new-password"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-destructive text-xs">{errors.confirmPassword.message as string}</p>}
                </div>

                <div className="pt-2">
                  <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-white text-lg h-12" disabled={isSubmitting}>
                    {isSubmitting ? "Creating Account..." : "Create Profile"}
                  </Button>
                </div>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <Button 
                  type="button"
                  variant="outline" 
                  className="w-full h-12 gap-3"
                  onClick={() => window.location.href = '/api/auth/google'}
                  data-testid="button-google-signin"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Sign in with Google
                </Button>
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
