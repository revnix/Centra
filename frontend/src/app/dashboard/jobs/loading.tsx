import { Skeleton } from "@/components/ui/skeleton";

export default function JobsLoading() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-9 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-11 w-40 rounded-xl" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-28 rounded-2xl" />
                ))}
            </div>

            {/* Job cards */}
            <div>
                <Skeleton className="h-6 w-36 mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-52 rounded-2xl" />
                    ))}
                </div>
            </div>
        </div>
    );
}
