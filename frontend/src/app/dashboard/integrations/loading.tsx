import { Skeleton } from "@/components/ui/skeleton";

export default function IntegrationsLoading() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-9 w-44" />
                <Skeleton className="h-4 w-64" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-40 rounded-2xl" />
                ))}
            </div>
        </div>
    );
}
