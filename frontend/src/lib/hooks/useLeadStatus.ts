import { useMemo } from 'react';
import { useDepartments } from '@/lib/hooks/useDepartments';

export function useIsDepartmentLead(userId: number | null | undefined) {
  const { data: departments } = useDepartments();

  return useMemo(() => {
    if (!userId) return false;
    return (departments ?? []).some((d) => d.lead_user_id === userId);
  }, [departments, userId]);
}
