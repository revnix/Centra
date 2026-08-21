"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  Layers,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useApplications } from "@/lib/hooks/useApplications";
import { useJobs } from "@/lib/hooks/useJobs";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const { data: applications = [] } = useApplications();
  const { data: jobs = [] } = useJobs();

  useEffect(() => {
    if (!isOpen) setQuery("");
  }, [isOpen]);

  const actions = useMemo(() => {
    const all = [
      {
        label: "Create New Job",
        icon: Plus,
        shortcut: "N",
        action: () => router.push("/dashboard/jobs/new"),
      },
      {
        label: "View Candidate Pipeline",
        icon: Layers,
        shortcut: "P",
        action: () => router.push("/dashboard/pipeline"),
      },
      {
        label: "AI Job Generator",
        icon: Sparkles,
        shortcut: "G",
        action: () => router.push("/dashboard/generated-jobs"),
      },
      {
        label: "View All Applications",
        icon: Users,
        shortcut: "A",
        action: () => router.push("/dashboard/applications"),
      },
    ];

    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((a) => a.label.toLowerCase().includes(q));
  }, [query, router]);

  const filteredCandidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return applications
      .filter((app: any) => {
        const name = (app.candidate?.full_name || "").toLowerCase();
        const title = (app.job?.title || "").toLowerCase();
        return name.includes(q) || title.includes(q);
      })
      .slice(0, 6);
  }, [applications, query]);

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return jobs
      .filter((j: any) => {
        const title = (j.title || "").toLowerCase();
        const dept = (j.department || "").toLowerCase();
        return title.includes(q) || dept.includes(q);
      })
      .slice(0, 6);
  }, [jobs, query]);

  const handleSelect = (fn: () => void) => {
    fn();
    onClose();
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Type a command or search candidates, jobs…"
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick Actions">
          {actions.map((act) => (
            <CommandItem key={act.label} onSelect={() => handleSelect(act.action)}>
              <act.icon className="h-4 w-4" />
              <span>{act.label}</span>
              <CommandShortcut>↵ {act.shortcut}</CommandShortcut>
              <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
            </CommandItem>
          ))}
        </CommandGroup>

        {(filteredCandidates.length > 0 || filteredJobs.length > 0) && <CommandSeparator />}

        {filteredCandidates.length > 0 && (
          <CommandGroup heading="Candidates">
            {filteredCandidates.map((app: any) => {
              const candidateName = app.candidate?.full_name || app.candidate?.email || "Candidate";
              const jobTitle = app.job?.title || "Job";
              return (
                <CommandItem
                  key={String(app.id ?? candidateName + jobTitle)}
                  onSelect={() => handleSelect(() => router.push(`/dashboard/applications/${app.id}`))}
                >
                  <Users className="h-4 w-4" />
                  <span className="truncate">{candidateName}</span>
                  <span className="ml-auto truncate text-xs text-muted-foreground">{jobTitle}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {filteredJobs.length > 0 && (
          <CommandGroup heading="Jobs">
            {filteredJobs.map((j: any) => (
              <CommandItem
                key={String(j.id ?? j.title)}
                onSelect={() => handleSelect(() => router.push(`/dashboard/jobs/${j.id}`))}
              >
                <Briefcase className="h-4 w-4" />
                <span className="truncate">{j.title || "Job"}</span>
                <span className="ml-auto truncate text-xs text-muted-foreground">{j.department || ""}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
