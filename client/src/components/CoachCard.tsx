import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone } from "lucide-react";
import type { Coach } from "@/lib/supabase";

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function CoachCard({ coach }: { coach: Coach }) {
  return (
    <Card
      className="p-4 border border-card-border"
      data-testid={`coach-card-${slug(coach.name)}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-lg font-bold text-primary">
            {coach.name.charAt(0)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">{coach.name}</p>
          <Badge
            variant="secondary"
            className="text-[10px] bg-primary/10 text-primary mt-0.5"
          >
            {coach.title}
          </Badge>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {coach.email && (
              <a
                href={`mailto:${coach.email}`}
                className="inline-flex items-center gap-1 text-xs text-primary/80 hover:text-primary transition-colors"
                data-testid={`coach-email-${slug(coach.name)}`}
              >
                <Mail className="w-3 h-3" />
                {coach.email}
              </a>
            )}
            {coach.phone && (
              <a
                href={`tel:${coach.phone.replace(/[^\d+]/g, "")}`}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Phone className="w-3 h-3" />
                {coach.phone}
              </a>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
