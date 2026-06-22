import { Skeleton } from "@/components/ui/skeleton";

export default function PipelineLoading() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="space-y-2">
                <Skeleton className="h-9 w-40" />
                <Skeleton className="h-4 w-60" />
            </div>

            {/* Kanban columns */}
            <div className="flex gap-4 overflow-x-auto pb-4">
                {[0, 1, 2, 3, 4, 5].map((col) => (
                    <div key={col} className="flex-shrink-0 w-64 space-y-3">
                        <Skeleton className="h-10 w-full rounded-xl" />
                        {[0, 1, 2].map((card) => (
                            <Skeleton key={card} className="h-28 w-full rounded-xl" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
