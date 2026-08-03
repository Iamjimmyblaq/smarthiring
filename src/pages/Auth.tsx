import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { resolveLandingRoute } from "@/hooks/useIsAdmin";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, BadgeCheck, Bot, Sparkles, Users } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import hrDesk from "@/assets/hr-interview-desk.jpg";

const Auth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Sign in — SmartHire";
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) resolveLandingRoute().then((route) => navigate(route, { replace: true }));
    });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate(await resolveLandingRoute(), { replace: true });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const redirectUrl = `${window.location.origin}/jobs`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl, data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. Check your email to confirm, then sign in.");
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/jobs`,
    });
    if (result.error) {
      toast.error(result.error.message || "Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate("/jobs", { replace: true });
  };

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-background">
      <Helmet>
        <title>Sign in — SmartHire</title>
        <meta name="description" content="Sign in to SmartHire or create a free account to start ranking candidates with AI in seconds." />
        <link rel="canonical" href="https://smarthiring.lovable.app/auth" />
        <meta property="og:title" content="Sign in — SmartHire" />
        <meta property="og:description" content="Sign in or create a free SmartHire account to start ranking candidates." />
        <meta property="og:url" content="https://smarthiring.lovable.app/auth" />
      </Helmet>
      <h1 className="sr-only">Sign in or Create Account</h1>

      {/* Product showcase */}
      <aside className="relative hidden lg:flex flex-col justify-center gap-2 overflow-hidden bg-gradient-to-br from-primary/15 via-background to-accent/15 p-10 border-r">
        <div className="absolute -top-24 -right-24 size-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <h2 className="mt-8 text-4xl font-semibold tracking-tight leading-tight">
            Every interview,<br />intelligently run.
          </h2>
          <p className="mt-4 text-muted-foreground max-w-md">
            Screen, rank, interview and hire from one pipeline — with an AI interviewer that meets your candidates on video.
          </p>
        </div>
        <div className="relative my-8">
          <img
            src={hrDesk}
            alt="Recruiter reviewing a candidate resume across the desk during an interview"
            width={1024}
            height={1024}
            loading="lazy"
            className="w-full rounded-2xl border shadow-lg object-cover max-h-[340px]"
          />
          <div className="absolute -bottom-5 left-5 flex items-center gap-2 rounded-xl border bg-card/90 backdrop-blur px-4 py-3 shadow-lg">
            <Bot className="h-5 w-5 text-primary" />
            <div className="text-xs">
              <p className="font-semibold">AI interviewer live</p>
              <p className="text-muted-foreground">Video · audio · proctored</p>
            </div>
          </div>
        </div>
        <ul className="relative space-y-3 text-sm">
          {[
            { icon: Sparkles, text: "AI resume scoring with explainable results" },
            { icon: Users, text: "5-stage pipeline from sourced to hired" },
            { icon: BadgeCheck, text: "Automatic candidate status emails" },
          ].map((f) => (
            <li key={f.text} className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-4 w-4" />
              </span>
              {f.text}
            </li>
          ))}
        </ul>
      </aside>

      {/* Auth form */}
      <div className="flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md shadow-sm">
        <div className="px-6 pt-6 lg:hidden">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto h-10 w-10 rounded-md bg-primary flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Welcome to SmartHire</CardTitle>
          <CardDescription>Sign in to screen and rank candidates.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="si-pw">Password</Label>
                  <Input id="si-pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="su-name">Full name</Label>
                  <Input id="su-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-pw">Password</Label>
                  <Input id="su-pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating…" : "Create account"}</Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={handleGoogle}>Continue with Google</Button>
        </CardContent>
      </Card>
      </div>
    </main>
  );
};

export default Auth;