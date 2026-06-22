import { Skeleton } from "@/components/ui/skeleton";

export default function GeneratedJobsLoading() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-9 w-56" />
                    <Skeleton className="h-4 w-72" />
                </div>
                <Skeleton className="h-10 w-36 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-52 rounded-2xl" />
                ))}
            </div>
        </div>
    );
}
