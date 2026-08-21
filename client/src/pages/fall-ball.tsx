import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  FALL_BALL,
  FALL_BALL_CALENDAR,
  FALL_BALL_HISTORY,
  FALL_BALL_PILLARS,
} from "@/content/fall-ball";
import { useGames } from "@/hooks/use-supabase";
import { fallBallGames, getNextGame } from "@/lib/selectors";
import { Calendar, CheckCircle2, ExternalLink } from "lucide-react";

export default function FallBallPage() {
  const { data: games } = useGames();
  const fallGames = games ? fallBallGames(games) : [];
  const nextFall = games ? getNextGame(fallGames) : undefined;

  return (
    <div className="space-y-6" data-testid="fall-ball-page">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-lg font-bold">{FALL_BALL.title}</h1>
          <Badge variant="secondary" className="text-[10px]">
            Exhibition
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{FALL_BALL.tagline}</p>
      </div>

      <Card className="p-5 border border-card-border">
        <p className="text-sm mb-3">{FALL_BALL.whatItIs}</p>
        <ul className="text-xs text-muted-foreground space-y-1.5">
          <li>Announcement window: {FALL_BALL.announcementWindow}</li>
          <li>Typical play: {FALL_BALL.typicalStart} – {FALL_BALL.typicalEnd}</li>
          <li>{FALL_BALL.admission}</li>
        </ul>
        {nextFall ? (
          <p className="text-sm font-semibold mt-4">
            Next exhibition: {nextFall.location === "away" ? "at " : "vs "}
            {nextFall.opponent}
          </p>
        ) : (
          <p className="text-sm mt-4 text-muted-foreground">
            The {FALL_BALL.year} slate is not in the hub yet. IU usually posts it{" "}
            {FALL_BALL.announcementWindow.toLowerCase()}.
          </p>
        )}
        <div className="flex flex-wrap gap-3 mt-4 text-xs">
          <Link href="/schedule" className="text-primary font-semibold hover:underline">
            View schedule
          </Link>
          <a
            href={FALL_BALL.officialScheduleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            Official IU schedule <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </Card>

      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Content pillars
        </h2>
        <div className="space-y-2">
          {FALL_BALL_PILLARS.map((pillar) => (
            <Card key={pillar.id} className="p-4 border border-card-border">
              <p className="text-sm font-semibold mb-1">{pillar.title}</p>
              <p className="text-xs text-muted-foreground">{pillar.body}</p>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Publishing calendar
        </h2>
        <div className="space-y-2">
          {FALL_BALL_CALENDAR.map((block) => (
            <Card key={block.week} className="p-4 border border-card-border">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm font-semibold">{block.week}</p>
                <Badge variant="outline" className="text-[10px]">
                  {block.owner}
                </Badge>
              </div>
              <ul className="space-y-1.5">
                {block.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Recent fall slates
        </h2>
        <div className="space-y-2">
          {FALL_BALL_HISTORY.map((row) => (
            <Card key={row.year} className="p-4 border border-card-border">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold">{row.year} · {row.games} games / {row.weekends} weekends</p>
              </div>
              <p className="text-xs text-muted-foreground">Announced {row.announced}. {row.note}</p>
            </Card>
          ))}
        </div>
      </div>

      {fallGames.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {fallGames.length} exhibition game{fallGames.length === 1 ? "" : "s"} loaded in the hub.
        </p>
      )}
    </div>
  );
}
