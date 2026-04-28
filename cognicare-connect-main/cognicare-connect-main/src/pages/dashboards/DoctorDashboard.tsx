import { useCallback, useEffect, useMemo, useState } from "react";
import { Brain, CalendarDays, ClipboardList, Download, Loader2, ScanLine, Sparkles, Users } from "lucide-react";
import DashboardShell from "./DashboardShell";
import { DashboardKpiStrip } from "./DashboardKpiStrip";
import NotificationBell from "@/components/NotificationBell";
import DoctorScanPanel from "./DoctorScanPanel";
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

type AppointmentStatus = Database["public"]["Enums"]["appointment_status"];
type MedicalCategory = Database["public"]["Enums"]["medical_record_category"];

type AppointmentRow = {
  id: string;
  patient_id: string;
  scheduled_at: string;
  status: AppointmentStatus;
  notes: string | null;
  attachment_url: string | null;
};

type MedicalRecordRow = {
  id: string;
  patient_id: string;
  category: MedicalCategory;
  title: string;
  notes: string | null;
  attachment_url: string | null;
  created_at: string;
};

const CATEGORY_LABEL: Record<MedicalCategory, string> = {
  past_medical_history: "Past medical history",
  lab_report: "Lab report",
  clinical_visit: "Clinical visit",
  imaging: "Imaging",
  other: "Other",
};

const DoctorDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const uid = user?.id;

  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [patientNames, setPatientNames] = useState<Record<string, string>>({});
  const [recordsByPatient, setRecordsByPatient] = useState<Record<string, MedicalRecordRow[]>>({});
  const [prescriptions, setPrescriptions] = useState<
    { id: string; patient_id: string; medication_name: string; dosage: string | null; instructions: string | null; reminder_at: string | null; created_at: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("appointments");

  const [rxPatientId, setRxPatientId] = useState("");
  const [rxMed, setRxMed] = useState("");
  const [rxDosage, setRxDosage] = useState("");
  const [rxInstr, setRxInstr] = useState("");
  const [rxReminder, setRxReminder] = useState("");
  const [rxSubmitting, setRxSubmitting] = useState(false);

  const [preselectRxPatient, setPreselectRxPatient] = useState<string | null>(null);
  const [preselectCwtImage, setPreselectCwtImage] = useState<string | null>(null);

  const loadPatientNames = useCallback(async (ids: string[]) => {
    const uniq = [...new Set(ids.filter(Boolean))];
    if (!uniq.length) return {};
    const { data } = await supabase.from("profiles").select("id,full_name").in("id", uniq);
    const map: Record<string, string> = {};
    (data ?? []).forEach((p) => {
      map[p.id] = p.full_name || p.id.slice(0, 8);
    });
    return map;
  }, []);

  const refreshAll = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const { data: appts, error: e1 } = await supabase
        .from("appointments")
        .select("id,patient_id,scheduled_at,status,notes,attachment_url")
        .eq("doctor_id", uid)
        .order("scheduled_at", { ascending: true });
      if (e1) throw e1;
      const list = (appts ?? []) as AppointmentRow[];
      setAppointments(list);
      const pids = list.map((a) => a.patient_id);

      const { data: rx, error: e2 } = await supabase
        .from("prescriptions")
        .select("id,patient_id,medication_name,dosage,instructions,reminder_at,created_at")
        .eq("doctor_id", uid)
        .order("created_at", { ascending: false });
      if (e2) throw e2;
      setPrescriptions((rx ?? []) as typeof prescriptions);
      const rxPids = (rx ?? []).map((r) => r.patient_id);
      const [nAppt, nRx] = await Promise.all([loadPatientNames(pids), loadPatientNames(rxPids)]);
      setPatientNames({ ...nAppt, ...nRx });

      const uniqPatients = [...new Set(pids)];
      if (uniqPatients.length) {
        const { data: recs, error: e3 } = await supabase
          .from("medical_records")
          .select("id,patient_id,category,title,notes,attachment_url,created_at")
          .in("patient_id", uniqPatients)
          .order("created_at", { ascending: false });
        if (e3) throw e3;
        const grouped: Record<string, MedicalRecordRow[]> = {};
        (recs ?? []).forEach((r) => {
          const row = r as MedicalRecordRow;
          if (!grouped[row.patient_id]) grouped[row.patient_id] = [];
          grouped[row.patient_id].push(row);
        });
        setRecordsByPatient(grouped);
      } else {
        setRecordsByPatient({});
      }
    } catch (e: unknown) {
      const msg = errorMessageFromUnknown(e);
      toast({
        title: "Could not load doctor workspace",
        description:
          msg +
          (msg.includes("attachment_url") || msg.includes("column") ? " Apply pending Supabase migrations." : ""),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [uid, toast, loadPatientNames]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (preselectRxPatient) {
      setRxPatientId(preselectRxPatient);
      setPreselectRxPatient(null);
    }
  }, [preselectRxPatient]);

  const pendingAppointments = useMemo(() => appointments.filter((a) => a.status === "pending"), [appointments]);
  const acceptedAppointments = useMemo(
    () => appointments.filter((a) => a.status === "confirmed"),
    [appointments],
  );
  const otherAppointments = useMemo(
    () => appointments.filter((a) => a.status !== "pending" && a.status !== "confirmed"),
    [appointments],
  );

  const tabCopy = useMemo(
    () =>
      ({
        appointments: {
          title: "Appointments",
          subtitle: "Review requests, accept visits, and access patient uploads.",
        },
        prescriptions: {
          title: "Prescriptions",
          subtitle: "Prescribe for patients with an accepted or completed visit.",
        },
        cwt: {
          title: "CWT scan analysis",
          subtitle: "Upload CWT spectrogram images (STFT-based time–frequency maps) and run the classifier.",
        },
        mri: {
          title: "MRI scan analysis",
          subtitle: "Upload MRI slice images (PNG/JPG) for the dedicated MRI model (MRI.h5 on the server).",
        },
        patients: {
          title: "Patients",
          subtitle: "Everyone who has booked with you.",
        },
      }) as const,
    [],
  );

  const uniquePatientCount = useMemo(() => new Set(appointments.map((a) => a.patient_id)).size, [appointments]);

  const patientOptionsForRx = useMemo(() => {
    const ids = [
      ...new Set(
        appointments.filter((a) => a.status === "confirmed" || a.status === "completed").map((a) => a.patient_id),
      ),
    ];
    return ids.map((id) => ({ id, name: patientNames[id] || id.slice(0, 8) }));
  }, [appointments, patientNames]);

  const setApptStatus = async (id: string, status: AppointmentStatus) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: status === "confirmed" ? "Appointment accepted" : "Appointment updated" });
      await refreshAll();
    }
  };

  const downloadAppointmentImage = (a: AppointmentRow) => {
    if (!a.attachment_url) {
      toast({ title: "No image", description: "This request has no photo.", variant: "destructive" });
      return;
    }
    const ext = extensionFromDataUrl(a.attachment_url);
    downloadDataUrl(a.attachment_url, `appointment-${a.id.slice(0, 8)}.${ext}`);
    toast({ title: "Download started" });
  };

  const downloadRecord = (row: MedicalRecordRow) => {
    if (!row.attachment_url) {
      toast({ title: "No file attached", description: "This record has no upload.", variant: "destructive" });
      return;
    }
    const ext = row.attachment_url.startsWith("data:application/pdf") ? "pdf" : "png";
    downloadDataUrl(row.attachment_url, `${row.title.replace(/\s+/g, "-").slice(0, 40)}-${row.id.slice(0, 8)}.${ext}`);
    toast({ title: "Download started" });
  };

  const submitPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !rxPatientId || !rxMed.trim()) {
      toast({ title: "Patient and medication required", variant: "destructive" });
      return;
    }
    const allowed = patientOptionsForRx.some((p) => p.id === rxPatientId);
    if (!allowed) {
      toast({ title: "Patient not eligible", description: "Only patients with an accepted appointment can receive prescriptions.", variant: "destructive" });
      return;
    }
    setRxSubmitting(true);
    const { error } = await supabase.from("prescriptions").insert({
      patient_id: rxPatientId,
      doctor_id: uid,
      medication_name: rxMed.trim(),
      dosage: rxDosage.trim() || null,
      instructions: rxInstr.trim() || null,
      reminder_at: rxReminder ? new Date(rxReminder).toISOString() : null,
    });
    setRxSubmitting(false);
    if (error) {
      toast({ title: "Could not save prescription", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Prescription saved", description: "The patient receives a notification." });
    setRxMed("");
    setRxDosage("");
    setRxInstr("");
    setRxReminder("");
    await refreshAll();
  };

  const goPrescribe = (patientId: string) => {
    setPreselectRxPatient(patientId);
    setActiveTab("prescriptions");
  };

  const openCwtFromAppointment = (a: AppointmentRow) => {
    setPreselectCwtImage(a.attachment_url?.startsWith("data:image") ? a.attachment_url : null);
    setActiveTab("cwt");
  };

  const activeMeta = tabCopy[activeTab as keyof typeof tabCopy] ?? tabCopy.appointments;

  return (
    <DashboardShell
      badge="Doctor portal"
      title={activeMeta.title}
      subtitle={activeMeta.subtitle}
      headerExtra={<NotificationBell userId={uid} />}
      workspaceNav={{
        items: [
          { id: "appointments", label: "Appointments", icon: <CalendarDays className="h-4 w-4 shrink-0 opacity-90" /> },
          { id: "prescriptions", label: "Prescriptions", icon: <ClipboardList className="h-4 w-4 shrink-0 opacity-90" /> },
          { id: "cwt", label: "CWT scan", icon: <Brain className="h-4 w-4 shrink-0 opacity-90" /> },
          { id: "mri", label: "MRI scan", icon: <ScanLine className="h-4 w-4 shrink-0 opacity-90" /> },
          { id: "patients", label: "Patients", icon: <Users className="h-4 w-4 shrink-0 opacity-90" /> },
        ],
        activeId: activeTab,
        onSelect: setActiveTab,
      }}
      workspaceActions={{ onSync: () => void refreshAll() }}
    >
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="hidden">
            <TabsTrigger value="appointments" />
            <TabsTrigger value="prescriptions" />
            <TabsTrigger value="cwt" />
            <TabsTrigger value="mri" />
            <TabsTrigger value="patients" />
          </TabsList>

          <TabsContent value="appointments" className="mt-0 space-y-8">
            <DashboardKpiStrip
              items={[
                { label: "Pending requests", value: pendingAppointments.length },
                { label: "Accepted visits", value: acceptedAppointments.length },
                { label: "Prescriptions", value: prescriptions.length },
                { label: "Patients", value: uniquePatientCount },
              ]}
            />

            <Card className="rounded-xl border border-amber-200/80 bg-[#F0F2F4] shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900 font-bold border-b border-gray-200/90 pb-3">Pending requests</CardTitle>
                <CardDescription>Accept to schedule care, or reject to decline this slot.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingAppointments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending appointment requests.</p>
                ) : (
                  pendingAppointments.map((a) => (
                    <div key={a.id} className="rounded-xl border border-border/70 p-4 flex flex-wrap gap-3 justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{patientNames[a.patient_id] || "Patient"}</p>
                        <p className="text-sm text-muted-foreground">{new Date(a.scheduled_at).toLocaleString()}</p>
                        {a.notes && <p className="text-sm mt-2">{a.notes}</p>}
                        {a.attachment_url && (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs text-muted-foreground">Patient photo with this request</p>
                            {a.attachment_url.startsWith("data:image") ? (
                              <img
                                src={a.attachment_url}
                                alt=""
                                className="max-h-40 rounded-lg border border-border/70 object-contain"
                              />
                            ) : (
                              <a href={a.attachment_url} target="_blank" rel="noreferrer" className="text-sm text-primary">
                                Open attachment
                              </a>
                            )}
                            <div className="flex flex-wrap gap-2">
                              <Button type="button" size="sm" variant="outline" onClick={() => downloadAppointmentImage(a)}>
                                <Download className="h-3.5 w-3.5 mr-1" /> Download
                              </Button>
                              {a.attachment_url.startsWith("data:image") && (
                                <Button type="button" size="sm" variant="secondary" onClick={() => openCwtFromAppointment(a)}>
                                  <Sparkles className="h-3.5 w-3.5 mr-1" /> Run CWT on this photo
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => void setApptStatus(a.id, "confirmed")}>
                          Accept
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => void setApptStatus(a.id, "cancelled")}>
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-[#9B51E0]/25 bg-[#F0F2F4] shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900 font-bold border-b border-gray-200/90 pb-3">Accepted appointments</CardTitle>
                <CardDescription>
                  After accepting: download patient uploads (lab/imaging), add prescriptions, or run AI analysis on a scan image.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {acceptedAppointments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No accepted visits yet.</p>
                ) : (
                  acceptedAppointments.map((a) => {
                    const recs = recordsByPatient[a.patient_id] ?? [];
                    return (
                      <div key={a.id} className="rounded-xl border border-border/80 p-4 space-y-4">
                        <div className="flex flex-wrap justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-lg">{patientNames[a.patient_id] || "Patient"}</p>
                            <p className="text-sm text-muted-foreground">{new Date(a.scheduled_at).toLocaleString()}</p>
                            {a.notes && <p className="text-sm mt-2">{a.notes}</p>}
                            {a.attachment_url && (
                              <div className="mt-3 space-y-2">
                                <p className="text-xs text-muted-foreground">Photo shared with this visit</p>
                                {a.attachment_url.startsWith("data:image") ? (
                                  <img
                                    src={a.attachment_url}
                                    alt=""
                                    className="max-h-36 rounded-lg border border-border/70 object-contain"
                                  />
                                ) : (
                                  <a href={a.attachment_url} target="_blank" rel="noreferrer" className="text-sm text-primary">
                                    Open attachment
                                  </a>
                                )}
                                <div className="flex flex-wrap gap-2">
                                  <Button type="button" size="sm" variant="outline" onClick={() => downloadAppointmentImage(a)}>
                                    <Download className="h-3.5 w-3.5 mr-1" /> Download
                                  </Button>
                                  {a.attachment_url?.startsWith("data:image") && (
                                    <Button type="button" size="sm" variant="secondary" onClick={() => openCwtFromAppointment(a)}>
                                      <Sparkles className="h-3.5 w-3.5 mr-1" /> Run CWT on visit photo
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="secondary" onClick={() => goPrescribe(a.patient_id)}>
                              Prescribe
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openCwtFromAppointment(a)}>
                              CWT scan
                            </Button>
                            <Button size="sm" onClick={() => void setApptStatus(a.id, "completed")}>
                              Mark completed
                            </Button>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-medium mb-2">Patient medical records & uploads</p>
                          {recs.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No records uploaded by this patient yet.</p>
                          ) : (
                            <ul className="space-y-2">
                              {recs.map((r) => (
                                <li
                                  key={r.id}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm"
                                >
                                  <div>
                                    <span className="font-medium">{r.title}</span>
                                    <span className="text-muted-foreground text-xs ml-2">({CATEGORY_LABEL[r.category]})</span>
                                    {r.notes && <p className="text-xs text-muted-foreground mt-0.5">{r.notes}</p>}
                                  </div>
                                  {r.attachment_url ? (
                                    <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => downloadRecord(r)}>
                                      <Download className="h-3.5 w-3.5 mr-1" /> Download
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">No file</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {(otherAppointments.length > 0) && (
              <Card className="rounded-xl border-0 bg-[#F0F2F4] shadow-sm">
                <CardHeader>
                  <CardTitle className="text-gray-900 font-bold border-b border-gray-200/90 pb-3">Completed & declined</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {otherAppointments.map((a) => (
                    <div key={a.id} className="text-sm text-muted-foreground flex justify-between gap-2 border-b border-border/40 py-2 last:border-0">
                      <span>{patientNames[a.patient_id] || "Patient"}</span>
                      <span className="capitalize">{a.status}</span>
                      <span>{new Date(a.scheduled_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="prescriptions" className="mt-0 space-y-6">
            <Card className="rounded-xl border-0 bg-[#F0F2F4] shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900 font-bold border-b border-gray-200/90 pb-3">New prescription</CardTitle>
                <CardDescription>Available for patients with an accepted or completed appointment with you.</CardDescription>
              </CardHeader>
              <CardContent>
                {patientOptionsForRx.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Accept an appointment first to enable prescribing.</p>
                ) : (
                  <form onSubmit={submitPrescription} className="space-y-4 max-w-xl">
                    <div className="space-y-2">
                      <Label>Patient</Label>
                      <Select value={rxPatientId} onValueChange={setRxPatientId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select patient" />
                        </SelectTrigger>
                        <SelectContent>
                          {patientOptionsForRx.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rx-med">Medication</Label>
                      <Input id="rx-med" value={rxMed} onChange={(e) => setRxMed(e.target.value)} placeholder="e.g. Donepezil" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rx-dose">Dosage</Label>
                      <Input id="rx-dose" value={rxDosage} onChange={(e) => setRxDosage(e.target.value)} placeholder="e.g. 5mg once daily" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rx-ins">Instructions</Label>
                      <Textarea id="rx-ins" value={rxInstr} onChange={(e) => setRxInstr(e.target.value)} rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rx-rem">Reminder (optional)</Label>
                      <Input id="rx-rem" type="datetime-local" value={rxReminder} onChange={(e) => setRxReminder(e.target.value)} />
                    </div>
                    <Button type="submit" disabled={rxSubmitting}>
                      {rxSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Save prescription
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-xl border-0 bg-[#F0F2F4] shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900 font-bold border-b border-gray-200/90 pb-3">Recent prescriptions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {prescriptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None yet.</p>
                ) : (
                  prescriptions.map((p) => (
                    <div key={p.id} className="rounded-xl border border-border/70 p-3 text-sm">
                      <span className="font-medium">{p.medication_name}</span>
                      <span className="text-muted-foreground"> — {patientNames[p.patient_id] || "Patient"}</span>
                      {p.reminder_at && (
                        <p className="text-xs text-primary mt-1">Reminder: {new Date(p.reminder_at).toLocaleString()}</p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cwt" className="mt-0">
            <DoctorScanPanel
              fileInputId="cwt-scan-file"
              cardTitle="CWT (STFT) Alzheimer&apos;s detection"
              description="Upload a CWT spectrogram image derived from your signal (e.g. STFT-based time–frequency representation). The model expects this representation, not raw MRI."
              predictPath="/predict"
              preselectImageDataUrl={preselectCwtImage}
              onConsumedPreselect={() => setPreselectCwtImage(null)}
              runButtonLabel="Run CWT model"
            />
          </TabsContent>

          <TabsContent value="mri" className="mt-0">
            <DoctorScanPanel
              fileInputId="mri-scan-file"
              cardTitle="MRI scan classification"
              description="Upload an MRI slice or processed MRI image (PNG/JPG). The server runs MRI.h5 on POST /predict/mri — separate from the CWT model."
              predictPath="/predict/mri"
              runButtonLabel="Run MRI model"
            />
          </TabsContent>

          <TabsContent value="patients" className="mt-0">
            <Card className="rounded-xl border-0 bg-[#F0F2F4] shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900 font-bold border-b border-gray-200/90 pb-3">Patients on your schedule</CardTitle>
                <CardDescription>Anyone who has booked with you (any status).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {[...new Set(appointments.map((a) => a.patient_id))].length === 0 ? (
                  <p className="text-sm text-muted-foreground">No patients yet.</p>
                ) : (
                  [...new Set(appointments.map((a) => a.patient_id))].map((pid) => (
                    <div key={pid} className="rounded-lg border border-border/60 px-3 py-2 text-sm flex justify-between gap-2">
                      <span>{patientNames[pid] || pid}</span>
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

export default DoctorDashboard;
