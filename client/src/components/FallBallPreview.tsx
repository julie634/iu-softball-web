import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Ticket, Newspaper } from "lucide-react";
import { Link } from "wouter";
import { FALL_BALL, FALL_BALL_PILLARS } from "@/content/fall-ball";

export default function FallBallPreview() {
  return (
    <Card className="p-5 border border-card-border" data-testid="fall-ball-preview">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          {FALL_BALL.title}
        </h2>
        <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
          Exhibition
        </Badge>
      </div>
      <p className="text-sm font-semibold mb-1">{FALL_BALL.tagline}</p>
      <p className="text-xs text-muted-foreground mb-4">{FALL_BALL.whatItIs}</p>
      <div className="grid grid-cols-2 gap-2 text-xs mb-4">
        <div className="flex items-start gap-2 text-muted-foreground">
          <CalendarDays className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
          <span>
            Slate usually lands {FALL_BALL.announcementWindow.toLowerCase()}. Typical window:{" "}
            {FALL_BALL.typicalStart} through {FALL_BALL.typicalEnd}.
          </span>
        </div>
        <div className="flex items-start gap-2 text-muted-foreground">
          <Ticket className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
          <span>{FALL_BALL.admission}</span>
        </div>
        <div className="flex items-start gap-2 text-muted-foreground col-span-2">
          <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
          <span>Most home dates at {FALL_BALL.venue}.</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {FALL_BALL_PILLARS.map((pillar) => (
          <div key={pillar.id} className="rounded-lg bg-muted/60 p-2.5">
            <p className="text-xs font-semibold mb-0.5">{pillar.title}</p>
            <p className="text-[11px] text-muted-foreground leading-snug">{pillar.body}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <Link
          href="/fall-ball"
          className="text-primary font-semibold hover:underline"
          data-testid="fall-ball-hub-link"
        >
          Open the Fall Ball hub
        </Link>
        <span className="text-muted-foreground">·</span>
        <a
          href={FALL_BALL.officialScheduleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <Newspaper className="w-3 h-3" />
          IU Athletics schedule
        </a>
      </div>
    </Card>
  );
}
