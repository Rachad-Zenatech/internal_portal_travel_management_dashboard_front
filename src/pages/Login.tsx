import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Loader2,
  Code2,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshPermissions } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isDevLoading, setIsDevLoading] = useState(false);
  const [customDevEmail, setCustomDevEmail] = useState("");
  const hasProcessedLogin = useRef(false);

  useEffect(() => {
    const handleSsoCallback = async () => {
      if (hasProcessedLogin.current) return;

      const error = searchParams.get("error");
      const status = searchParams.get("status");

      if (error === "account_not_found") {
        hasProcessedLogin.current = true;
        setTimeout(() => {
          toast.error("Account does not exist. Please contact your administrator to be added.");
        }, 100);
        navigate("/login", { replace: true });
        return;
      }

      if (error === "account_deactivated") {
        hasProcessedLogin.current = true;
        setTimeout(() => {
          toast.error("Your account is deactivated");
        }, 100);
        navigate("/login", { replace: true });
        return;
      }

      if (status === "success") {
        hasProcessedLogin.current = true;
        setIsLoading(true);
        try {
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("user");
          sessionStorage.removeItem("ms_id_token");
          const token = searchParams.get("token");
          if (token) {
            sessionStorage.setItem("token", token);
          }
          await refreshPermissions();
          toast.success("Successfully logged in");
          window.history.replaceState({}, document.title, window.location.pathname);
          navigate("/dashboard");
        } catch (error) {
          console.error("Failed to process SSO login", error);
          toast.error("Failed to process login");
        } finally {
          setIsLoading(false);
        }
      }
    };

    handleSsoCallback();
  }, [searchParams, navigate, refreshPermissions]);

  const handleMicrosoftLogin = () => {
    const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
    const baseUrl = rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
    window.location.href = `${baseUrl}/api/auth/microsoft/login`;
  };

  const handleDevLogin = async (email: string) => {
    setIsDevLoading(true);
    const targetEmail = email.trim() || "dev@zenatech.com";
    const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
    const baseUrl = rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

    try {
      const response = await fetch(`${baseUrl}/api/auth/dev-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: targetEmail }),
      });

      if (!response.ok) {
        throw new Error(`Dev login returned status ${response.status}`);
      }

      const data = await response.json();
      if (data.token) {
        sessionStorage.setItem("token", data.token);
        if (data.user) {
          sessionStorage.setItem("user", JSON.stringify(data.user));
        }
      }

      await refreshPermissions();
      toast.success(`Logged in as ${data.user?.fullName || targetEmail}`);
      navigate("/dashboard");
    } catch (err) {
      console.warn("Direct POST dev login fallback to GET redirect:", err);
      // Fallback to GET redirect
      window.location.href = `${baseUrl}/api/auth/dev-login?email=${encodeURIComponent(targetEmail)}`;
    } finally {
      setIsDevLoading(false);
    }
  };

  const devPersonas = [
    {
      name: "Dev Administrator",
      email: "dev@zenatech.com",
      role: "Super Admin",
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    },
    {
      name: "Alex Rivera",
      email: "alex.rivera@zenatech.com",
      role: "Lead Combat Pilot",
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    },
    {
      name: "Elena Rostova",
      email: "elena.rostova@zenatech.com",
      role: "Avionics Tech",
      color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
    },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-zinc-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-600/20 to-transparent dark:from-blue-900/20 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-400/20 dark:bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl flex items-center justify-center border border-slate-200 dark:border-zinc-800">
            <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-500" />
          </div>
        </div>

        <Card className="border-slate-200/60 dark:border-zinc-800/60 shadow-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-[24px] overflow-hidden">
          <CardHeader className="space-y-2 text-center pt-8 pb-4">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                Travel & Flight Ops
              </Badge>
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
              Welcome
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-zinc-400 text-xs">
              Sign in with your @zenatech.com credentials or local dev bypass
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-0">
            {/* Microsoft SSO Primary Button */}
            <Button
              onClick={handleMicrosoftLogin}
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
              disabled={isLoading || isDevLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in with Microsoft...
                </>
              ) : (
                "Sign in with Microsoft Entra ID"
              )}
            </Button>

            {/* Local Development Mode Section */}
            <div className="pt-2">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-border"></div>
                <span className="flex-shrink mx-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Code2 className="w-3.5 h-3.5 text-primary" />
                  <span>Local Dev Bypass</span>
                </span>
                <div className="flex-grow border-t border-border"></div>
              </div>

              {/* Instant 1-Click Super Admin Dev Login */}
              <div className="mt-2 space-y-2.5">
                <Button
                  type="button"
                  onClick={() => handleDevLogin("dev@zenatech.com")}
                  disabled={isDevLoading || isLoading}
                  variant="outline"
                  className="w-full h-10 border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-semibold text-xs flex items-center justify-between"
                >
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span>One-Click Dev Login (Super Admin)</span>
                  </span>
                  {isDevLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                  )}
                </Button>

                {/* Quick Persona Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {devPersonas.slice(1).map((p) => (
                    <button
                      key={p.email}
                      type="button"
                      onClick={() => handleDevLogin(p.email)}
                      disabled={isDevLoading || isLoading}
                      className="p-2 rounded-lg border border-border bg-card/60 hover:bg-accent text-left transition-all text-xs flex flex-col justify-between"
                    >
                      <span className="font-semibold text-foreground line-clamp-1">{p.name}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">{p.role}</span>
                    </button>
                  ))}
                </div>

                {/* Custom Email Dev Login */}
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    type="email"
                    value={customDevEmail}
                    onChange={(e) => setCustomDevEmail(e.target.value)}
                    placeholder="custom.dev@zenatech.com"
                    className="h-8 text-xs"
                    disabled={isDevLoading || isLoading}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDevLogin(customDevEmail)}
                    disabled={isDevLoading || isLoading || !customDevEmail}
                    className="h-8 text-xs shrink-0"
                  >
                    Dev In
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-center pb-6 pt-3 border-t border-slate-100 dark:border-zinc-800/50 mt-1 bg-slate-50/50 dark:bg-zinc-950/30">
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Dev server port: <span className="font-mono text-primary font-semibold">5178</span> • API port: <span className="font-mono text-primary font-semibold">8008</span>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
