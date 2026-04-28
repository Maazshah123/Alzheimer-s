import { Link, useLocation } from "react-router-dom";
import { Clock, XCircle, PauseCircle } from "lucide-react";
import AuthShell from "@/components/AuthShell";
import { Button } from "@/components/ui/button";

const PendingApproval = () => {
  const { state } = useLocation() as { state?: { status?: string; reason?: string; role?: "doctor" | "patient" } };
  const status = state?.status ?? "pending";
  const roleLabel = state?.role ?? "doctor";

  const config = {
    pending: {
      icon: Clock,
      title: "Awaiting approval",
      msg: `Your ${roleLabel} application is under review. You'll be able to log in after admin approval.`,
    },
    rejected: {
      icon: XCircle,
      title: "Application not approved",
      msg: state?.reason || "Unfortunately your application was not approved. Please contact support for details.",
    },
    suspended: {
      icon: PauseCircle,
      title: "Account suspended",
      msg: "Your account has been temporarily suspended. Please reach out to support.",
    },
  }[status as "pending" | "rejected" | "suspended"] ?? {
    icon: Clock, title: "Awaiting approval", msg: "Pending review.",
  };

  const Icon = config.icon;

  return (
    <AuthShell title="Almost there">
      <div className="text-center py-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Icon className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mt-6 font-display text-2xl font-medium">{config.title}</h2>
        <p className="mt-3 text-muted-foreground max-w-md mx-auto">{config.msg}</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild variant="soft" size="lg" className="rounded-full">
            <Link to="/">Back to home</Link>
          </Button>
          <Button asChild variant="hero" size="lg" className="rounded-full">
            <Link to="/login">Try login again</Link>
          </Button>
        </div>
      </div>
    </AuthShell>
  );
};

export default PendingApproval;
