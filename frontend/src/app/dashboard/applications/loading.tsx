import { Skeleton } from "@/components/ui/skeleton";

export default function ApplicationsLoading() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-9 w-48" />
                    <Skeleton className="h-4 w-80" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-56 rounded-md" />
                    <Skeleton className="h-10 w-28 rounded-md" />
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <Skeleton className="h-10 w-44 rounded-md" />
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <Skeleton className="h-5 w-full" />
                </div>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-slate-50">
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                        <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-4 w-36" />
                            <Skeleton className="h-3 w-48" />
                        </div>
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-8 w-24 rounded-md" />
                    </div>
                ))}
            </div>
        </div>
    );
}
