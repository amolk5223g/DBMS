import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { GraduationCap, Sparkles } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [college, setCollege] = useState("");

  useEffect(() => { if (user) navigate("/"); }, [user, navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate("/");
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName, college },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — you're in!");
    navigate("/");
  };

  return (
    <div className="min-h-screen grid place-items-center p-4 perspective-scene">
      <div className="w-full max-w-md animate-fade-in" style={{ transform: "rotateX(2deg)" }}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl aurora-bg shadow-2xl mb-4">
            <GraduationCap className="w-8 h-8 text-background" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Attendly<span className="aurora-text">Pro</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3" /> Lightning-fast 3D attendance
          </p>
        </div>
        <div className="glass-card rounded-3xl p-6">
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full mb-6 bg-muted/40">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-4">
                <div><Label>Email</Label><Input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
                <div><Label>Password</Label><Input type="password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
                <Button type="submit" disabled={loading} className="w-full neu-fab text-background font-semibold">
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-4">
                <div><Label>Full name</Label><Input required value={fullName} onChange={e => setFullName(e.target.value)} /></div>
                <div><Label>College</Label><Input required value={college} onChange={e => setCollege(e.target.value)} placeholder="Used on PDF reports" /></div>
                <div><Label>Email</Label><Input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
                <div><Label>Password</Label><Input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} /></div>
                <Button type="submit" disabled={loading} className="w-full neu-fab text-background font-semibold">
                  {loading ? "Creating…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Auth;