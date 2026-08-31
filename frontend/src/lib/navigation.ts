import {
  Briefcase,
  Calendar,
  CalendarDays,
  DatabaseZap,
  LayoutDashboard,
  Layers,
  Shield,
  Share2,
  Sparkles,
  UserCheck,
  Users,
  Inbox,
  Plus,
  Building2,
  User,
  CheckSquare,
  Contact,
  Users2,
  Bot,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AppRole =
  | "candidate"
  | "employee"
  | "admin"
  | "hr"
  | "reviewer"
  | string;

export type NavItem =
  | {
      type: "item";
      label: string;
      href: string;
      icon: LucideIcon;
    }
  | {
      type: "group";
      label: string;
      icon: LucideIcon;
      items: Array<{ label: string; href: string; icon: LucideIcon }>;
    };

// Admin/HR/Reviewer (staff)
export const staffNav: NavItem[] = [
  { type: "item", href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  {
    type: "group",
    label: "Jobs",
    icon: Briefcase,
    items: [
      { href: "/dashboard/jobs/new", label: "Create New Job", icon: Plus },
      { href: "/dashboard/jobs", label: "All Jobs", icon: Briefcase },
      { href: "/dashboard/generated-jobs", label: "AI Generated Jobs", icon: Sparkles },
    ],
  },
  {
    type: "group",
    label: "Applications",
    icon: Users,
    items: [
      { href: "/dashboard/applications", label: "All Applications", icon: Users },
      { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
      { href: "/dashboard/candidates/pool", label: "Resume Pool", icon: DatabaseZap },
    ],
  },
  { type: "item", href: "/dashboard/pipeline", label: "Pipeline", icon: Layers },
  { type: "item", href: "/dashboard/onboarding", label: "Onboarding", icon: UserCheck },
  { type: "item", href: "/dashboard/interviews", label: "Interviews", icon: Calendar },
  { type: "item", href: "/dashboard/integrations", label: "Integrations", icon: Share2 },
  { type: "item", href: "/dashboard/admin", label: "Settings", icon: Shield },
  { type: "item", href: "/dashboard/admin/departments", label: "Departments", icon: Building2 },
  { type: "item", href: "/dashboard/hr/employees", label: "Employees", icon: Contact },
  { type: "item", href: "/dashboard/hr/shifts", label: "Shifts", icon: CheckSquare },
  { type: "item", href: "/dashboard/agent", label: "Agent", icon: Bot },
];

// Employee base
export const employeeNav: NavItem[] = [
  { type: "item", href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { type: "item", href: "/dashboard/me", label: "My Profile", icon: User },
  { type: "item", href: "/dashboard/attendance", label: "Attendance", icon: CheckSquare },
  { type: "item", href: "/dashboard/agent", label: "Agent", icon: Bot },
];

// Lead extras (only when isLead=true)
export const leadExtras: NavItem[] = [
  { type: "item", href: "/dashboard/team", label: "My Team", icon: Users2 },
];

export const candidateNav: NavItem[] = [
  { type: "item", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { type: "item", href: "/jobs", label: "Jobs", icon: Briefcase },
  { type: "item", href: "/portal/status", label: "Applications", icon: Users },
  { type: "item", href: "/portal/onboarding", label: "Onboarding", icon: UserCheck },
  { type: "item", href: "/dashboard/agent", label: "Agent", icon: Bot },
];

export function navForUser(role: AppRole, opts?: { isLead?: boolean }): NavItem[] {
  const r = String(role || "").toLowerCase();

  if (r === "candidate") return candidateNav;

  if (r === "employee") {
    return opts?.isLead ? [...employeeNav, ...leadExtras] : employeeNav;
  }

  // hr/admin/reviewer -> staff nav for now
  return staffNav;
}
