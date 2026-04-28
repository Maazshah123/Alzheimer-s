import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Loader2, Stethoscope, Trash2, User, UserX } from "lucide-react";
import DashboardShell from "./DashboardShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type ApprovalStatus = "pending" | "approved" | "rejected" | "suspended";
type ManagedRole = "doctor" | "patient";

interface ManagedUser {
  user_id: string;
  role: ManagedRole;
  status: ApprovalStatus;
  rejection_reason: string | null;
  full_name: string | null;
  phone: string | null;
  specialization: string | null;
  experience_years: number | null;
  patient_code: string | null;
}

const AdminDashboard = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ManagedRole>("doctor");
  const [doctorUsers, setDoctorUsers] = useState<ManagedUser[]>([]);
  const [patientUsers, setPatientUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadUsersByRole = async (role: ManagedRole) => {
    const statusTable = role === "doctor" ? "doctor_status" : "patient_status";
    const { data: roles, error: roleErr } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("role", role);
    if (roleErr) throw roleErr;

    const ids = (roles ?? []).map((r) => r.user_id);
    if (!ids.length) return [];

    const [{ data: statusRows, error: statusErr }, { data: profiles, error: profileErr }] = await Promise.all([
      supabase.from(statusTable).select("user_id,status,rejection_reason").in("user_id", ids),
      supabase
        .from("profiles")
        .select("id,full_name,phone,specialization,experience_years,patient_code")
        .in("id", ids),
    ]);

    if (statusErr) throw statusErr;
    if (profileErr) throw profileErr;

    const statusMap = new Map((statusRows ?? []).map((s) => [s.user_id, s]));
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    return ids.map((id) => {
      const s = statusMap.get(id);
      const p = profileMap.get(id);
      return {
        user_id: id,
        role,
        status: (s?.status as ApprovalStatus | undefined) ?? "pending",
        rejection_reason: s?.rejection_reason ?? null,
        full_name: p?.full_name ?? null,
        phone: p?.phone ?? null,
        specialization: p?.specialization ?? null,
        experience_years: p?.experience_years ?? null,
        patient_code: p?.patient_code ?? null,
      };
    });
  };

  const refreshUsers = async () => {
    setLoading(true);
    try {
      const [docs, patients] = await Promise.all([
        loadUsersByRole("doctor"),
        loadUsersByRole("patient"),
      ]);
      setDoctorUsers(docs);
      setPatientUsers(patients);
    } catch (error: any) {
      toast({ title: "Failed to load admin data", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const updateStatus = async (row: ManagedUser, nextStatus: ApprovalStatus) => {
    setBusyId(row.user_id);
    const table = row.role === "doctor" ? "doctor_status" : "patient_status";
    const rejectionReason =
      nextStatus === "rejected"
        ? window.prompt(`Reason for rejecting ${row.full_name || row.user_id}:`, row.rejection_reason ?? "") ?? "Rejected by admin"
        : null;

    try {
      const { error } = await supabase
        .from(table)
        .update({
          status: nextStatus,
          reviewed_by: user?.id ?? null,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq("user_id", row.user_id);
      if (error) throw error;
      toast({ title: "Status updated", description: `${row.role} account ${nextStatus}.` });
      await refreshUsers();
    } catch (error: any) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const deleteUser = async (row: ManagedUser) => {
    const ok = window.confirm(`Delete ${row.role} account "${row.full_name || row.user_id}" permanently?`);
    if (!ok) return;
    setBusyId(row.user_id);
    try {
      const { error } = await supabase.rpc("admin_delete_user", { target_user_id: row.user_id });
      if (error) throw error;
      toast({ title: "Account deleted", description: `${row.role} profile removed successfully.` });
      await refreshUsers();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: `${error.message}. Run the latest migration to enable admin_delete_user.`,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const activeUsers = activeTab === "doctor" ? doctorUsers : patientUsers;
  const counts = useMemo(() => ({
    doctorPending: doctorUsers.filter((u) => u.status === "pending").length,
    patientPending: patientUsers.filter((u) => u.status === "pending").length,
    totalManaged: doctorUsers.length + patientUsers.length,
  }), [doctorUsers, patientUsers]);

  const adminMeta =
    activeTab === "doctor"
      ? {
          title: "Doctor approvals",
          subtitle: "Review applications, approve or reject, and remove accounts when needed.",
        }
      : {
          title: "Patient approvals",
          subtitle: "Review registrations, approve or reject, and remove accounts when needed.",
        };

  return (
    <DashboardShell
      badge="Admin console"
      title={adminMeta.title}
      subtitle={adminMeta.subtitle}
      workspaceNav={{
        items: [
          { id: "doctor", label: "Doctors", icon: <Stethoscope className="h-4 w-4 shrink-0 opacity-90" /> },
          { id: "patient", label: "Patients", icon: <User className="h-4 w-4 shrink-0 opacity-90" /> },
        ],
        activeId: activeTab,
        onSelect: (id) => setActiveTab(id as ManagedRole),
      }}
      workspaceActions={{ onSync: () => void refreshUsers() }}
    >
      <div className="grid md:grid-cols-3 gap-4">
        <StatCard title="Pending doctors" value={counts.doctorPending} icon={Clock} />
        <StatCard title="Pending patients" value={counts.patientPending} icon={Clock} />
        <StatCard title="Managed accounts" value={counts.totalManaged} icon={CheckCircle2} />
      </div>

      <Card className="mt-6 rounded-xl border-0 bg-[#F0F2F4] shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900 font-bold border-b border-gray-200/90 pb-3">Approval queue</CardTitle>
          <CardDescription className="text-gray-500 pt-3">
            Doctor and patient requests are separated in the sidebar for faster review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ManagedRole)}>
            <TabsList className="hidden">
              <TabsTrigger value="doctor" />
              <TabsTrigger value="patient" />
            </TabsList>
            <TabsContent value="doctor" forceMount className="mt-4">
              <ApprovalList rows={activeUsers} loading={loading} busyId={busyId} onApprove={updateStatus} onReject={updateStatus} onDelete={deleteUser} />
            </TabsContent>
            <TabsContent value="patient" forceMount className="mt-4">
              <ApprovalList rows={activeUsers} loading={loading} busyId={busyId} onApprove={updateStatus} onReject={updateStatus} onDelete={deleteUser} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </DashboardShell>
  );
};

const StatCard = ({ title, value, icon: Icon }: { title: string; value: number; icon: any }) => (
  <Card className="rounded-xl border border-black/[0.04] bg-[#F0F2F4] shadow-sm">
    <CardHeader className="pb-2">
      <CardDescription className="text-gray-500 text-xs uppercase tracking-wide font-medium">{title}</CardDescription>
      <CardTitle className="text-3xl font-bold text-gray-900 tabular-nums">{value}</CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#9B51E0]/15 text-[#9B51E0]">
        <Icon className="h-5 w-5" />
      </div>
    </CardContent>
  </Card>
);

const ApprovalList = ({
  rows,
  loading,
  busyId,
  onApprove,
  onReject,
  onDelete,
}: {
  rows: ManagedUser[];
  loading: boolean;
  busyId: string | null;
  onApprove: (row: ManagedUser, nextStatus: ApprovalStatus) => void;
  onReject: (row: ManagedUser, nextStatus: ApprovalStatus) => void;
  onDelete: (row: ManagedUser) => void;
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading accounts...
      </div>
    );
  }

  if (!rows.length) {
    return <p className="py-8 text-center text-muted-foreground">No accounts in this category yet.</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.user_id} className="rounded-xl border border-gray-200/90 bg-white/60 p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="font-medium">{row.full_name || "Unnamed user"}</p>
              <p className="text-xs text-muted-foreground">User ID: {row.user_id}</p>
              {row.role === "doctor" ? (
                <p className="text-sm text-muted-foreground">
                  {row.specialization || "No specialization"} {row.experience_years != null ? `- ${row.experience_years} yrs` : ""}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Code: {row.patient_code || "N/A"} {row.phone ? `- ${row.phone}` : ""}
                </p>
              )}
              {row.rejection_reason && <p className="text-xs text-destructive">Reason: {row.rejection_reason}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs capitalize">
                {row.status}
              </span>
              <Button size="sm" className="rounded-full" disabled={busyId === row.user_id} onClick={() => onApprove(row, "approved")}>
                Approve
              </Button>
              <Button size="sm" variant="secondary" className="rounded-full" disabled={busyId === row.user_id} onClick={() => onReject(row, "rejected")}>
                <UserX className="h-4 w-4 mr-1" /> Reject
              </Button>
              <Button size="sm" variant="destructive" className="rounded-full" disabled={busyId === row.user_id} onClick={() => onDelete(row)}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminDashboard;
