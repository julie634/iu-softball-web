import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ExternalLink } from "lucide-react";
import { useCoaches } from "@/hooks/use-supabase";
import {
  COACHES_SOURCE_URL,
  COACHES_SOURCED_AT,
  coachingStaff,
  supportStaff,
} from "@/content/coaches";
import CoachCard from "@/components/CoachCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function CoachesPage() {
  const { data: coaches, isLoading } = useCoaches();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  const rows = coaches ?? [];
  const coaching = coachingStaff(rows);
  const support = supportStaff(rows);

  return (
    <div className="space-y-6" data-testid="coaches-page">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-bold">Coaches</h1>
          <Badge variant="secondary" className="text-xs">
            {coaching.length} staff
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Sourced {COACHES_SOURCED_AT} from{" "}
          <a
            href={COACHES_SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            IU Athletics coaches
            <ExternalLink className="w-3 h-3" />
          </a>
          . Names, titles, and contacts only.
        </p>
      </div>

      <div className="space-y-2">
        {coaching.map((coach) => (
          <CoachCard key={coach.id} coach={coach} />
        ))}
      </div>

      {support.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Support staff
          </h2>
          <div className="space-y-2">
            {support.map((coach) => (
              <CoachCard key={coach.id} coach={coach} />
            ))}
          </div>
        </div>
      )}

      <Link href="/roster" className="text-sm text-primary hover:underline">
        Back to roster
      </Link>
    </div>
  );
}
