import {
  Briefcase,
  Calendar,
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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AppRole = "candidate" | "admin" | "reviewer" | string;

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

export const adminNav: NavItem[] = [
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
];

export const candidateNav: NavItem[] = [
  { type: "item", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { type: "item", href: "/jobs", label: "Jobs", icon: Briefcase },
  { type: "item", href: "/portal/status", label: "Applications", icon: Users },
  { type: "item", href: "/portal/onboarding", label: "Onboarding", icon: UserCheck },
];

export function navForRole(role: AppRole): NavItem[] {
  return role === "candidate" ? candidateNav : adminNav;
}
