import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-10 w-72" />
                <Skeleton className="h-4 w-80" />
            </div>

            {/* Stat cards */}
            <div className="grid gap-5 md:grid-cols-3">
                {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-36 rounded-2xl" />
                ))}
            </div>

            {/* Middle row */}
            <div className="grid gap-6 lg:grid-cols-7">
                <Skeleton className="lg:col-span-4 h-72 rounded-2xl" />
                <div className="lg:col-span-3 space-y-6">
                    <Skeleton className="h-48 rounded-2xl" />
                    <Skeleton className="h-48 rounded-2xl" />
                </div>
            </div>

            {/* Bottom strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 rounded-2xl" />
                ))}
            </div>
        </div>
    );
}
