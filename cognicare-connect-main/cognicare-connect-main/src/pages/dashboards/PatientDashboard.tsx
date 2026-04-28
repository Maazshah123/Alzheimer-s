import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Download, FileText, ImageIcon, Loader2, Pill, Stethoscope, User } from "lucide-react";
import DashboardShell from "./DashboardShell";
import { DashboardKpiStrip } from "./DashboardKpiStrip";
import NotificationBell from "@/components/NotificationBell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { downloadDataUrl, extensionFromDataUrl } from "@/lib/downloadAttachment";
import { errorMessageFromUnknown } from "@/lib/errorMessage";
import type { Database } from "@/integrations/supabase/types";

type MedicalCategory = Database["public"]["Enums"]["medical_record_category"];
type AppointmentStatus = Database["public"]["Enums"]["appointment_status"];

const RECORD_CATEGORY_OPTIONS: { value: MedicalCategory; label: string }[] = [
  { value: "past_medical_history", label: "Past medical history" },
  { value: "lab_report", label: "Lab report" },
  { value: "clinical_visit", label: "Clinical visit" },
  { value: "imaging", label: "Imaging" },
  { value: "other", label: "Other" },
];

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

type DoctorOption = { id: string; full_name: string | null; specialization: string | null };

type DoctorProfileRow = {
  full_name: string | null;
  specialization: string | null;
  avatar_url: string | null;
};

const PatientDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const uid = user?.id;

  const [records, setRecords] = useState<
    { id: string; category: MedicalCategory; title: string; notes: string | null; attachment_url: string | null; created_at: string }[]
  >([]);
  const [appointments, setAppointments] = useState<
    { id: string; doctor_id: string; scheduled_at: string; status: AppointmentStatus; notes: string | null; attachment_url: string | null }[]
  >([]);
  const [prescriptions, setPrescriptions] = useState<
    { id: string; medication_name: string; dosage: string | null; instructions: string | null; reminder_at: string | null; doctor_id: string; created_at: string }[]
  >([]);
  /** All doctors we need to display (appointments, prescriptions, booking list) */
  const [doctorById, setDoctorById] = useState<Record<string, DoctorProfileRow>>({});
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [myProfile, setMyProfile] = useState<{
    full_name: string | null;
    patient_code: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const [recCategory, setRecCategory] = useState<MedicalCategory>("past_medical_history");
  const [recTitle, setRecTitle] = useState("");
  const [recNotes, setRecNotes] = useState("");
  const [recFile, setRecFile] = useState<File | null>(null);
  const [recSubmitting, setRecSubmitting] = useState(false);

  const [apptDoctorId, setApptDoctorId] = useState("");
  const [apptWhen, setApptWhen] = useState("");
  const [apptNotes, setApptNotes] = useState("");
  const [apptImage, setApptImage] = useState<File | null>(null);
  const [apptSubmitting, setApptSubmitting] = useState(false);

  const loadDoctorProfiles = useCallback(async (ids: string[]) => {
    const uniq = [...new Set(ids.filter(Boolean))];
    if (!uniq.length) return {};
    const { data, error } = await supabase
      .from("profiles")
      .select("id,full_name,specialization,avatar_url")
      .in("id", uniq);
    if (error) throw error;
    const map: Record<string, DoctorProfileRow> = {};
    (data ?? []).forEach((p) => {
      map[p.id] = {
        full_name: p.full_name,
        specialization: p.specialization,
        avatar_url: p.avatar_url,
      };
    });
    return map;
  }, []);

  const refreshAll = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const [r1, r2, r3, me] = await Promise.all([
        supabase
          .from("medical_records")
          .select("id,category,title,notes,attachment_url,created_at")
          .eq("patient_id", uid)
          .order("created_at", { ascending: false }),
        supabase
          .from("appointments")
          .select("id,doctor_id,scheduled_at,status,notes,attachment_url")
          .eq("patient_id", uid)
          .order("scheduled_at", { ascending: false }),
        supabase
          .from("prescriptions")
          .select("id,medication_name,dosage,instructions,reminder_at,doctor_id,created_at")
          .eq("patient_id", uid)
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("full_name,patient_code,phone,avatar_url")
          .eq("id", uid)
          .maybeSingle(),
      ]);

      if (r1.error) throw r1.error;
      if (r2.error) throw r2.error;
      if (r3.error) throw r3.error;
      if (me.error) throw me.error;

      setRecords((r1.data ?? []) as typeof records);
      setAppointments((r2.data ?? []) as typeof appointments);
      setPrescriptions((r3.data ?? []) as typeof prescriptions);
      setMyProfile(me.data ?? null);

      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "doctor");
      const allDocIds = (roles ?? []).map((x) => x.user_id);
      const approvedIds = new Set<string>();
      if (allDocIds.length > 0) {
        const { data: statuses, error: stErr } = await supabase
          .from("doctor_status")
          .select("user_id,status")
          .in("user_id", allDocIds)
          .eq("status", "approved");
        if (stErr) throw stErr;
        (statuses ?? []).forEach((s) => approvedIds.add(s.user_id));
      }

      const docFromAppts = (r2.data ?? []).map((a) => a.doctor_id);
      const docFromRx = (r3.data ?? []).map((p) => p.doctor_id);
      const allRelevantDoctorIds = [...new Set([...docFromAppts, ...docFromRx, ...approvedIds])].filter(Boolean);

      const profileMap = await loadDoctorProfiles(allRelevantDoctorIds);
      setDoctorById(profileMap);

      setDoctors(
        [...approvedIds].map((id) => ({
          id,
          full_name: profileMap[id]?.full_name ?? null,
          specialization: profileMap[id]?.specialization ?? null,
        })),
      );
    } catch (e: unknown) {
      const msg = errorMessageFromUnknown(e);
      toast({
        title: "Could not load portal data",
        description:
          msg +
          (msg.includes("attachment_url") || msg.includes("column") ? " Apply pending Supabase migrations." : ""),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [uid, toast, loadDoctorProfiles]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const doctorLabel = (id: string) => {
    const p = doctorById[id];
    if (p?.full_name?.trim()) return p.full_name.trim();
    return "Doctor";
  };

  const tabCopy = useMemo(
    () =>
      ({
        overview: {
          title: "Profile & care team",
          subtitle: "Your account, assigned doctors, and quick overview of your care activity.",
        },
        records: {
          title: "Medical records",
          subtitle: "Add and review your health documents, labs, and visit summaries.",
        },
        appointments: {
          title: "Appointments",
          subtitle: "Book visits with approved doctors and track your requests.",
        },
        prescriptions: {
          title: "Prescriptions",
          subtitle: "Medicines and reminders shared by your care team.",
        },
      }) as const,
    [],
  );

  const myDoctors = useMemo(() => {
    const ids = new Set<string>();
    appointments
      .filter((a) => a.status !== "cancelled")
      .forEach((a) => ids.add(a.doctor_id));
    prescriptions.forEach((p) => ids.add(p.doctor_id));
    return [...ids];
  }, [appointments, prescriptions]);

  const categoryLabel = useMemo(
    () => Object.fromEntries(RECORD_CATEGORY_OPTIONS.map((o) => [o.value, o.label])) as Record<MedicalCategory, string>,
    [],
  );

  const submitRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;
    if (!recTitle.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    let attachment: string | null = null;
    if (recFile) {
      if (recFile.size > 2 * 1024 * 1024) {
        toast({ title: "File too large", description: "Max 2MB for uploads.", variant: "destructive" });
        return;
      }
      try {
        attachment = await fileToDataUrl(recFile);
      } catch (err: unknown) {
        toast({ title: "Upload failed", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
        return;
      }
    }
    setRecSubmitting(true);
    const { error } = await supabase.from("medical_records").insert({
      patient_id: uid,
      category: recCategory,
      title: recTitle.trim(),
      notes: recNotes.trim() || null,
      attachment_url: attachment,
    });
    setRecSubmitting(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Medical record saved" });
    setRecTitle("");
    setRecNotes("");
    setRecFile(null);
    await refreshAll();
  };

  const submitAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !apptDoctorId || !apptWhen) {
      toast({ title: "Choose doctor and date/time", variant: "destructive" });
      return;
    }
    let attachmentUrl: string | null = null;
    if (apptImage) {
      if (!apptImage.type.startsWith("image/")) {
        toast({ title: "Images only", description: "Please choose a photo (PNG, JPG, WebP, etc.).", variant: "destructive" });
        return;
      }
      if (apptImage.size > 2 * 1024 * 1024) {
        toast({ title: "Image too large", description: "Max 2MB for appointment photos.", variant: "destructive" });
        return;
      }
      try {
        attachmentUrl = await fileToDataUrl(apptImage);
      } catch (err: unknown) {
        toast({
          title: "Could not read image",
          description: err instanceof Error ? err.message : "Try another file.",
          variant: "destructive",
        });
        return;
      }
    }
    setApptSubmitting(true);
    const scheduled = new Date(apptWhen).toISOString();
    const { error } = await supabase.from("appointments").insert({
      patient_id: uid,
      doctor_id: apptDoctorId,
      scheduled_at: scheduled,
      notes: apptNotes.trim() || null,
      attachment_url: attachmentUrl,
      status: "pending",
    });
    setApptSubmitting(false);
    if (error) {
      toast({ title: "Booking failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Appointment requested", description: "Your doctor will be notified." });
    setApptNotes("");
    setApptWhen("");
    setApptImage(null);
    await refreshAll();
  };

  const downloadMyAppointmentPhoto = (a: (typeof appointments)[0]) => {
    if (!a.attachment_url) {
      toast({ title: "No file", description: "This booking has no upload.", variant: "destructive" });
      return;
    }
    const ext = extensionFromDataUrl(a.attachment_url);
    downloadDataUrl(a.attachment_url, `my-appointment-${a.id.slice(0, 8)}.${ext}`);
    toast({ title: "Download started" });
  };

  const cancelAppointment = async (id: string) => {
    const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
    if (error) toast({ title: "Could not cancel", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Appointment cancelled" });
      await refreshAll();
    }
  };

  const activeMeta = tabCopy[activeTab as keyof typeof tabCopy] ?? tabCopy.overview;

  return (
    <DashboardShell
      badge="Patient portal"
      title={activeMeta.title}
      subtitle={activeMeta.subtitle}
      headerExtra={<NotificationBell userId={uid} />}
      workspaceNav={{
        items: [
          { id: "overview", label: "Profile", icon: <User className="h-4 w-4 shrink-0 opacity-90" /> },
          { id: "records", label: "Records", icon: <FileText className="h-4 w-4 shrink-0 opacity-90" /> },
          { id: "appointments", label: "Appointments", icon: <Calendar className="h-4 w-4 shrink-0 opacity-90" /> },
          { id: "prescriptions", label: "Prescriptions", icon: <Pill className="h-4 w-4 shrink-0 opacity-90" /> },
        ],
        activeId: activeTab,
        onSelect: setActiveTab,
      }}
      workspaceActions={{ onSync: () => void refreshAll() }}
    >
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading your data…
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="hidden">
            <TabsTrigger value="overview" />
            <TabsTrigger value="records" />
            <TabsTrigger value="appointments" />
            <TabsTrigger value="prescriptions" />
          </TabsList>

          <DashboardKpiStrip
            items={[
              { label: "Medical records", value: records.length },
              { label: "Appointments", value: appointments.length },
              { label: "Prescriptions", value: prescriptions.length },
              { label: "Care team", value: myDoctors.length },
            ]}
          />

          <TabsContent value="overview" className="mt-0 space-y-8">
            <Card className="rounded-xl border-0 bg-[#F0F2F4] shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900 font-bold border-b border-gray-200/90 pb-3">Your profile</CardTitle>
                <CardDescription className="text-gray-500 pt-1">Your account details on CogniPredict.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-6 items-start">
                <div className="h-24 w-24 rounded-2xl border border-border/60 bg-muted/30 overflow-hidden shrink-0 flex items-center justify-center">
                  {myProfile?.avatar_url ? (
                    <img src={myProfile.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-1 text-sm min-w-0">
                  <p>
                    <span className="text-muted-foreground">Name:</span>{" "}
                    <span className="font-medium">{myProfile?.full_name || user?.email || "—"}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Patient code:</span>{" "}
                    <span className="font-mono">{myProfile?.patient_code || "—"}</span>
                  </p>
                  {myProfile?.phone && (
                    <p>
                      <span className="text-muted-foreground">Phone:</span> {myProfile.phone}
                    </p>
                  )}
                  <p className="text-muted-foreground text-xs pt-2">{user?.email}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-[#9B51E0]/20 bg-[#F0F2F4] shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2 border-b border-gray-200/90 pb-3">
                  <Stethoscope className="h-5 w-5 text-[#9B51E0] shrink-0" />
                  <CardTitle className="text-gray-900 font-bold border-0 pb-0">Your doctors</CardTitle>
                </div>
                <CardDescription className="text-gray-500 pt-3">
                  Everyone linked to you through an active appointment or a prescription. If a name is missing, the
                  doctor profile may still be syncing—refresh the page. New doctors only appear in &quot;Book&quot; after admin
                  approval.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {myDoctors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No doctors yet. Book an appointment under the Appointments tab once doctors are available.
                  </p>
                ) : (
                  myDoctors.map((docId) => {
                    const p = doctorById[docId];
                    return (
                      <div key={docId} className="flex flex-wrap gap-4 items-center rounded-xl border border-border/70 p-4">
                        <div className="h-14 w-14 rounded-xl border border-border/60 bg-muted/30 overflow-hidden shrink-0 flex items-center justify-center">
                          {p?.avatar_url ? (
                            <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Stethoscope className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium">{doctorLabel(docId)}</p>
                          {p?.specialization && (
                            <p className="text-sm text-muted-foreground">{p.specialization}</p>
                          )}
                          <p className="text-xs text-muted-foreground font-mono mt-1">{docId}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="records" className="mt-0 space-y-8">
            <Card className="rounded-xl border-0 bg-[#F0F2F4] shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900 font-bold border-b border-gray-200/90 pb-3">Add a record</CardTitle>
                <CardDescription>
                  Organise past history, lab reports, and other documents. Upload files for lab or imaging where needed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submitRecord} className="space-y-4 max-w-xl">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={recCategory} onValueChange={(v) => setRecCategory(v as MedicalCategory)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RECORD_CATEGORY_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mr-title">Title</Label>
                    <Input id="mr-title" value={recTitle} onChange={(e) => setRecTitle(e.target.value)} placeholder="e.g. Annual blood panel 2026" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mr-notes">Notes / summary</Label>
                    <Textarea id="mr-notes" value={recNotes} onChange={(e) => setRecNotes(e.target.value)} rows={3} placeholder="Symptoms, results summary, visit notes…" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mr-file">Attachment (optional — use for lab reports, scans)</Label>
                    <Input id="mr-file" type="file" accept="image/*,.pdf" onChange={(e) => setRecFile(e.target.files?.[0] ?? null)} />
                  </div>
                  <Button type="submit" disabled={recSubmitting}>
                    {recSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Save record
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-0 bg-[#F0F2F4] shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900 font-bold border-b border-gray-200/90 pb-3">Your records</CardTitle>
                <CardDescription>Newest first.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {records.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No records yet. Add your first entry above.</p>
                ) : (
                  records.map((row) => (
                    <div key={row.id} className="rounded-xl border border-border/70 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{row.title}</span>
                        <span className="text-xs rounded-full bg-muted px-2 py-0.5">{categoryLabel[row.category]}</span>
                      </div>
                      {row.notes && <p className="text-sm text-muted-foreground mt-2">{row.notes}</p>}
                      {row.attachment_url && (
                        <a href={row.attachment_url} target="_blank" rel="noreferrer" className="text-sm text-primary mt-2 inline-block">
                          View attachment
                        </a>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">{new Date(row.created_at).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointments" className="mt-0 space-y-8">
            <Card className="rounded-xl border-0 bg-[#F0F2F4] shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900 font-bold border-b border-gray-200/90 pb-3">Book with a doctor</CardTitle>
                <CardDescription>
                  All approved doctors are listed below. You can attach pictures (e.g. scan or symptom photo) so your
                  doctor can review or download them and run the Alzheimer&apos;s AI model on supported images.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {doctors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No approved doctors available yet. Check back later.</p>
                ) : (
                  <form onSubmit={submitAppointment} className="space-y-4 max-w-xl">
                    <div className="space-y-2">
                      <Label>Doctor</Label>
                      <Select value={apptDoctorId} onValueChange={setApptDoctorId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a doctor" />
                        </SelectTrigger>
                        <SelectContent>
                          {doctors.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.full_name || "Doctor"} {d.specialization ? `— ${d.specialization}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="appt-when">Preferred date & time</Label>
                      <Input id="appt-when" type="datetime-local" value={apptWhen} onChange={(e) => setApptWhen(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="appt-notes">Notes for the doctor (optional)</Label>
                      <Textarea id="appt-notes" value={apptNotes} onChange={(e) => setApptNotes(e.target.value)} rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="appt-image" className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        Pictures for this visit (optional)
                      </Label>
                      <Input
                        id="appt-image"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setApptImage(e.target.files?.[0] ?? null)}
                      />
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG, WebP, etc. Max 2MB. Your doctor can download this file or open it in AI scan for a model
                        result and confidence.
                      </p>
                    </div>
                    <Button type="submit" disabled={apptSubmitting}>
                      {apptSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Request appointment
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-xl border-0 bg-[#F0F2F4] shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900 font-bold border-b border-gray-200/90 pb-3">Your appointments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {appointments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No appointments yet.</p>
                ) : (
                  appointments.map((a) => (
                    <div key={a.id} className="rounded-xl border border-border/70 p-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{doctorLabel(a.doctor_id)}</p>
                        <p className="text-sm text-muted-foreground">{new Date(a.scheduled_at).toLocaleString()}</p>
                        <p className="text-xs capitalize mt-1">Status: {a.status}</p>
                        {a.notes && <p className="text-sm mt-2">{a.notes}</p>}
                        {a.attachment_url && (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs text-muted-foreground">Your uploaded picture</p>
                            {a.attachment_url.startsWith("data:image") ? (
                              <img
                                src={a.attachment_url}
                                alt="Appointment attachment"
                                className="max-h-40 rounded-lg border border-border/70 object-contain"
                              />
                            ) : (
                              <a href={a.attachment_url} target="_blank" rel="noreferrer" className="text-sm text-primary">
                                View attachment
                              </a>
                            )}
                            <div>
                              <Button type="button" size="sm" variant="outline" onClick={() => downloadMyAppointmentPhoto(a)}>
                                <Download className="h-3.5 w-3.5 mr-1" /> Download my file
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                      {a.status === "pending" && (
                        <Button type="button" variant="outline" size="sm" onClick={() => void cancelAppointment(a.id)}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prescriptions" className="mt-0">
            <Card className="rounded-xl border-0 bg-[#F0F2F4] shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900 font-bold border-b border-gray-200/90 pb-3">Prescriptions & reminders</CardTitle>
                <CardDescription>
                  When your doctor adds a medicine or reminder, it appears here. Use the bell above for instant alerts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {prescriptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No prescriptions yet.</p>
                ) : (
                  prescriptions.map((p) => (
                    <div key={p.id} className="rounded-xl border border-border/70 p-4">
                      <p className="font-medium">{p.medication_name}</p>
                      <p className="text-sm text-muted-foreground">Prescribed by {doctorLabel(p.doctor_id)}</p>
                      {p.dosage && <p className="text-sm mt-2">Dosage: {p.dosage}</p>}
                      {p.instructions && <p className="text-sm mt-1">Instructions: {p.instructions}</p>}
                      {p.reminder_at && (
                        <p className="text-sm text-primary mt-2 font-medium">Reminder: {new Date(p.reminder_at).toLocaleString()}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">{new Date(p.created_at).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </DashboardShell>
  );
};

export default PatientDashboard;
