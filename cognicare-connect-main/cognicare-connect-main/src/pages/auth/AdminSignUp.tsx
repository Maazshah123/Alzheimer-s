import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ShieldCheck } from "lucide-react";
import AuthShell from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { adminSignupSchema, AdminSignupValues } from "@/lib/authSchemas";
import { useToast } from "@/hooks/use-toast";

// Hidden bootstrap. Change this to a private value for your team.
const ADMIN_INVITE_CODE = "COGNI-ADMIN-2026";
const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });

const AdminSignUp = () => {
  const nav = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<AdminSignupValues>({
    resolver: zodResolver(adminSignupSchema),
    defaultValues: { agree: undefined as any },
  });
  const agree = watch("agree");

  const onSubmit = async (v: AdminSignupValues) => {
    if (v.invite_code !== ADMIN_INVITE_CODE) {
      return toast({ title: "Invalid invite code", variant: "destructive" });
    }
    if (!avatarFile) {
      return toast({ title: "Profile photo required", description: "Please upload a profile picture to continue.", variant: "destructive" });
    }
    if (avatarFile.size > 2 * 1024 * 1024) {
      return toast({ title: "Image too large", description: "Please upload an image up to 2MB.", variant: "destructive" });
    }

    setSubmitting(true);
    let avatarUrl = "";
    try {
      avatarUrl = await fileToDataUrl(avatarFile);
    } catch (e: any) {
      setSubmitting(false);
      return toast({ title: "Image upload failed", description: e.message, variant: "destructive" });
    }

    const { error } = await supabase.auth.signUp({
      email: v.email,
      password: v.password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: { full_name: v.full_name, role: "admin", avatar_url: avatarUrl },
      },
    });
    setSubmitting(false);
    if (error) return toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    toast({ title: "Admin created", description: "You can now log in." });
    nav("/login");
  };

  return (
    <AuthShell
      title="Admin enrolment"
      subtitle="Restricted area. An invite code is required."
      footer={<Link className="text-primary underline-offset-4 hover:underline" to="/login">Back to login</Link>}
    >
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
        <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
        <span className="text-muted-foreground">
          This route is unlisted. Don't share it publicly.
        </span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="a_name">Full name</Label>
          <Input id="a_name" {...register("full_name")} />
          {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="a_email">Email</Label>
          <Input id="a_email" type="email" {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="a_invite">Invite code</Label>
          <Input id="a_invite" {...register("invite_code")} />
          {errors.invite_code && <p className="text-xs text-destructive">{errors.invite_code.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="a_avatar">Profile picture (required)</Label>
          <Input
            id="a_avatar"
            type="file"
            accept="image/*"
            required
            onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="a_pw">Password</Label>
            <Input id="a_pw" type="password" {...register("password")} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="a_pw2">Confirm password</Label>
            <Input id="a_pw2" type="password" {...register("confirm")} />
            {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
          </div>
        </div>

        <label className="flex items-start gap-3 text-sm">
          <Checkbox checked={!!agree} onCheckedChange={(c) => setValue("agree", !!c as any, { shouldValidate: true })} className="mt-0.5" />
          <span className="text-muted-foreground">I accept the platform's admin responsibilities.</span>
        </label>
        {errors.agree && <p className="text-xs text-destructive -mt-3">{errors.agree.message}</p>}

        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Create admin account
        </Button>
      </form>
    </AuthShell>
  );
};

export default AdminSignUp;
