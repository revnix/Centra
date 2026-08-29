"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  useCreateDepartment,
  useDeleteDepartment,
  useDepartments,
} from "@/lib/hooks/useDepartments";
import { useEmployees } from "@/lib/hooks/useEmployees";

export default function DepartmentsAdminPage() {
  const router = useRouter();
  const { data, isLoading, error } = useDepartments();
  const { data: employees } = useEmployees();
  const createMutation = useCreateDepartment();
  const deleteMutation = useDeleteDepartment();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const departments = useMemo(() => data ?? [], [data]);

  const employeeByUserId = useMemo(() => {
    const map = new Map<number, { name: string; email: string }>();
    (employees ?? []).forEach((e) => {
      map.set(e.user_id, { name: e.full_name || "", email: e.email });
    });
    return map;
  }, [employees]);

  const onCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Department name is required");
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: trimmed,
        description: description.trim() ? description.trim() : null,
        lead_user_id: null,
      });
      toast.success("Department created");
      setName("");
      setDescription("");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to create department");
    }
  };

  const onDelete = async (id: number) => {
    if (!confirm("Delete this department?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Department deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete department");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <h1 className="text-xl font-semibold">Departments</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Admin creates departments. HR assigns employees and department leads.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create department</DialogTitle>
              <DialogDescription>
                Keep it simple. You can assign lead and members later.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dept-name">Name</Label>
                <Input
                  id="dept-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Engineering"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dept-desc">Description (optional)</Label>
                <Input
                  id="dept-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Web, AI, Shopify"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={onCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating…" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All departments</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : error ? (
            <div className="text-sm text-destructive">Failed to load departments</div>
          ) : departments.length === 0 ? (
            <div className="text-sm text-muted-foreground">No departments yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead className="w-[96px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((d) => {
                  let leadLabel = "";
                  if (d.lead_user_id) {
                    const u = employeeByUserId.get(d.lead_user_id);
                    leadLabel = u?.name || u?.email || `User #${d.lead_user_id}`;
                  }

                  return (
                    <TableRow
                      key={d.id}
                      className="cursor-pointer"
                      onClick={() => router.push("/dashboard/admin/departments/" + d.id)}
                    >
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {d.description || "—"}
                      </TableCell>
                      <TableCell>
                        {d.lead_user_id ? (
                          <Badge variant="secondary">{leadLabel}</Badge>
                        ) : (
                          <Badge variant="outline">Unassigned</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(d.id);
                          }}
                          disabled={deleteMutation.isPending}
                          aria-label="Delete department"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
