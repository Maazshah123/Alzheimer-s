import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Stethoscope, HeartPulse } from "lucide-react";
import AuthShell from "@/components/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  doctorSignupSchema, DoctorSignupValues,
  patientSignupSchema, PatientSignupValues,
} from "@/lib/authSchemas";
import { useToast } from "@/hooks/use-toast";

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });

const SignUp = () => {
  const nav = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState<"patient" | "doctor">("patient");

  return (
    <AuthShell
      title="Create your account"
      subtitle="Choose how you'll use CogniPredict."
      footer={
        <>
          Already have an account?{" "}
          <Link className="text-primary underline-offset-4 hover:underline" to="/login">
            Log in
          </Link>
        </>
      }
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as "patient" | "doctor")} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12 p-1 rounded-full bg-muted/60">
          <TabsTrigger value="patient" className="rounded-full gap-2 data-[state=active]:bg-background">
            <HeartPulse className="h-4 w-4" /> Patient
          </TabsTrigger>
          <TabsTrigger value="doctor" className="rounded-full gap-2 data-[state=active]:bg-background">
            <Stethoscope className="h-4 w-4" /> Doctor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="patient" className="mt-6">
          <PatientForm onDone={() => nav("/pending-approval", { state: { status: "pending", role: "patient" } })} toast={toast} />
        </TabsContent>
        <TabsContent value="doctor" className="mt-6">
          <DoctorForm onDone={() => nav("/pending-approval", { state: { status: "pending", role: "doctor" } })} toast={toast} />
        </TabsContent>
      </Tabs>
    </AuthShell>
  );
};

const PatientForm = ({ onDone, toast }: { onDone: () => void; toast: any }) => {
  const [submitting, setSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<PatientSignupValues>({
    resolver: zodResolver(patientSignupSchema),
    defaultValues: { agree: undefined as any },
  });
  const agree = watch("agree");

  const onSubmit = async (v: PatientSignupValues) => {
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
        data: { full_name: v.full_name, phone: v.phone, role: "patient", avatar_url: avatarUrl },
      },
    });
    setSubmitting(false);
    if (error) return toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    toast({ title: "Application submitted", description: "An admin will review your patient account shortly." });
    onDone();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Field label="Full name" id="p_name" error={errors.full_name?.message}>
        <Input id="p_name" {...register("full_name")} />
      </Field>
      <Field label="Email" id="p_email" error={errors.email?.message}>
        <Input id="p_email" type="email" {...register("email")} />
      </Field>
      <Field label="Phone (optional)" id="p_phone" error={errors.phone?.message}>
        <Input id="p_phone" {...register("phone")} />
      </Field>
      <Field label="Profile picture (required)" id="p_avatar">
        <Input
          id="p_avatar"
          type="file"
          accept="image/*"
          required
          onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
        />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Password" id="p_pw" error={errors.password?.message}>
          <Input id="p_pw" type="password" {...register("password")} />
        </Field>
        <Field label="Confirm password" id="p_pw2" error={errors.confirm?.message}>
          <Input id="p_pw2" type="password" {...register("confirm")} />
        </Field>
      </div>
      <AgreeRow checked={!!agree} onChange={(c) => setValue("agree", c as any, { shouldValidate: true })} error={errors.agree?.message} />
      <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Create patient account
      </Button>
    </form>
  );
};

const DoctorForm = ({ onDone, toast }: { onDone: () => void; toast: any }) => {
  const [submitting, setSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<DoctorSignupValues>({
    resolver: zodResolver(doctorSignupSchema),
    defaultValues: { agree: undefined as any },
  });
  const agree = watch("agree");

  const onSubmit = async (v: DoctorSignupValues) => {
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
        data: {
          full_name: v.full_name,
          specialization: v.specialization,
          experience_years: String(v.experience_years),
          role: "doctor",
          avatar_url: avatarUrl,
        },
      },
    });
    setSubmitting(false);
    if (error) return toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    toast({ title: "Application submitted", description: "An admin will review your account shortly." });
    onDone();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Field label="Full name" id="d_name" error={errors.full_name?.message}>
        <Input id="d_name" {...register("full_name")} />
      </Field>
      <Field label="Email" id="d_email" error={errors.email?.message}>
        <Input id="d_email" type="email" {...register("email")} />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Specialization" id="d_spec" error={errors.specialization?.message}>
          <Input id="d_spec" placeholder="e.g. Neurology" {...register("specialization")} />
        </Field>
        <Field label="Years of experience" id="d_yr" error={errors.experience_years?.message}>
          <Input id="d_yr" type="number" min={0} {...register("experience_years", { valueAsNumber: true })} />
        </Field>
      </div>
      <Field label="Profile picture (required)" id="d_avatar">
        <Input
          id="d_avatar"
          type="file"
          accept="image/*"
          required
          onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
        />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Password" id="d_pw" error={errors.password?.message}>
          <Input id="d_pw" type="password" {...register("password")} />
        </Field>
        <Field label="Confirm password" id="d_pw2" error={errors.confirm?.message}>
          <Input id="d_pw2" type="password" {...register("confirm")} />
        </Field>
      </div>
      <AgreeRow checked={!!agree} onChange={(c) => setValue("agree", c as any, { shouldValidate: true })} error={errors.agree?.message} />
      <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Apply as doctor
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        Doctor accounts require admin approval before login.
      </p>
    </form>
  );
};

const Field = ({ label, id, error, children }: any) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    {children}
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
);

const AgreeRow = ({ checked, onChange, error }: { checked: boolean; onChange: (c: boolean) => void; error?: string }) => (
  <div>
    <label className="flex items-start gap-3 text-sm">
      <Checkbox checked={checked} onCheckedChange={(c) => onChange(!!c)} className="mt-0.5" />
      <span className="text-muted-foreground">
        I agree to the <a href="#" className="text-primary underline-offset-4 hover:underline">Terms</a> and{" "}
        <a href="#" className="text-primary underline-offset-4 hover:underline">Privacy Policy</a>.
      </span>
    </label>
    {error && <p className="text-xs text-destructive mt-1">{error}</p>}
  </div>
);

export default SignUp;
