import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import AuthShell from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { loginSchema, LoginValues } from "@/lib/authSchemas";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

/** Ensures AuthContext state is committed before ProtectedRoute mounts on the next screen. */
const waitForNextPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });

const Login = () => {
  const nav = useNavigate();
  const { toast } = useToast();
  const { refresh } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginValues) => {
    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (error) {
      setSubmitting(false);
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      return;
    }
    const uid = data.user!.id;
    // Pass session from sign-in so `refresh` skips `getSession()` — avoids deadlock with `onAuthStateChange`.
    const role = await refresh(uid, data.session);
    if (!role) {
      await supabase.auth.signOut();
      setSubmitting(false);
      toast({ title: "Login incomplete", description: "No role found for this account. Contact support.", variant: "destructive" });
      return;
    }

    if (role === "doctor") {
      const { data: ds } = await supabase
        .from("doctor_status").select("status,rejection_reason").eq("user_id", uid).maybeSingle();
      if (ds?.status !== "approved") {
        await supabase.auth.signOut();
        setSubmitting(false);
        nav("/pending-approval", { state: { status: ds?.status, reason: ds?.rejection_reason, role: "doctor" } });
        return;
      }
      setSubmitting(false);
      await waitForNextPaint();
      nav("/doctor");
    } else if (role === "admin") {
      setSubmitting(false);
      await waitForNextPaint();
      nav("/admin");
    } else {
      const { data: ps } = await supabase
        .from("patient_status").select("status,rejection_reason").eq("user_id", uid).maybeSingle();
      if (ps?.status !== "approved") {
        await supabase.auth.signOut();
        setSubmitting(false);
        nav("/pending-approval", { state: { status: ps?.status, reason: ps?.rejection_reason, role: "patient" } });
        return;
      }
      setSubmitting(false);
      await waitForNextPaint();
      nav("/patient");
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue your cognitive care journey."
      footer={
        <>
          New to CogniPredict?{" "}
          <Link className="text-primary underline-offset-4 hover:underline" to="/signup">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" {...register("password")} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          <div className="text-right">
            <Link className="text-xs text-primary underline-offset-4 hover:underline" to="/forgot-password">
              Forgot password?
            </Link>
          </div>
        </div>
        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
};

export default Login;
