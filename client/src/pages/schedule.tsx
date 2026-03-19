import { useGames } from "@/hooks/use-supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, ExternalLink, MapPin, Tv, Trophy } from "lucide-react";
import { useState } from "react";
import { track } from "@vercel/analytics";
import type { Game } from "@/lib/supabase";

function GameRow({ game }: { game: Game }) {
  const isCompleted = game.status === "completed";
  const isWin = isCompleted && game.iu_score != null && game.opponent_score != null && game.iu_score > game.opponent_score;
  const isLoss = isCompleted && game.iu_score != null && game.opponent_score != null && game.iu_score < game.opponent_score;
  const gameDate = new Date(game.date);

  return (
    <Card
      className="p-3 sm:p-4 border border-card-border transition-colors hover-elevate"
      data-testid={`game-row-${game.id}`}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        {/* Date block */}
        <div className="flex flex-col items-center w-10 sm:w-12 flex-shrink-0 pt-0.5">
          <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
            {format(gameDate, "MMM")}
          </span>
          <span className="text-lg font-bold tabular-nums leading-tight">{format(gameDate, "d")}</span>
        </div>

        {/* Opponent logo */}
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
          {game.opponent_logo ? (
            <img
              src={game.opponent_logo}
              alt={game.opponent}
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-xs font-bold text-muted-foreground">${game.opponent?.charAt(0) || "?"}</span>`;
              }}
            />
          ) : (
            <span className="text-xs font-bold text-muted-foreground">
              {game.opponent?.charAt(0) || "?"}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-semibold text-sm">
                  {game.location === "away" ? "at " : "vs "}
                  {game.opponent}
                </p>
                {game.is_conference_game && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary flex-shrink-0">
                    B1G
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                {isCompleted ? (
                  <>
                    {game.venue && (
                      <>
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{game.venue}</span>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <span className="whitespace-nowrap">{format(gameDate, "h:mm a")}</span>
                    {game.venue && (
                      <>
                        <span>·</span>
                        <span className="truncate">{game.venue}</span>
                      </>
                    )}
                  </>
                )}
              </div>
              {game.tournament_name && (
                <div className="flex items-center gap-1 mt-1">
                  <Trophy className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-[10px] text-muted-foreground font-medium">{game.tournament_name}</span>
                </div>
              )}
            </div>

            {/* Score or broadcast info */}
            <div className="flex flex-col items-end flex-shrink-0">
              {isCompleted ? (
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-xs sm:text-sm font-bold px-2 py-0.5 rounded whitespace-nowrap ${
                      isWin
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : isLoss
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isWin ? "W" : isLoss ? "L" : "T"} {game.iu_score}-{game.opponent_score}
                  </span>
                  {game.box_score_url && (
                    <a
                      href={game.box_score_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 transition-colors"
                      onClick={(e) => { e.stopPropagation(); track('Box Score Click', { opponent: game.opponent, game_id: game.id }); }}
                      data-testid={`box-score-link-${game.id}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-end gap-1">
                  {game.broadcast_network && (
                    <Badge variant="secondary" className="text-[10px]">
                      <Tv className="w-3 h-3 mr-1" />
                      {game.broadcast_network}
                    </Badge>
                  )}
                  {game.status === "postponed" && (
                    <Badge variant="destructive" className="text-[10px]">PPD</Badge>
                  )}
                  {game.status === "canceled" && (
                    <Badge variant="destructive" className="text-[10px]">CAN</Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ScheduleSkeletons() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-40 mb-4" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}

export default function SchedulePage() {
  const { data: games, isLoading } = useGames();
  const [showCompleted, setShowCompleted] = useState(false);

  if (isLoading) return <ScheduleSkeletons />;
  if (!games) return null;

  const completedGames = games
    .filter((g) => g.status === "completed")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const upcomingGames = games
    .filter((g) => g.status !== "completed")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-4" data-testid="schedule-page">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Schedule</h1>
        <Badge variant="secondary" className="text-xs">
          {completedGames.length}W · {upcomingGames.length} Remaining
        </Badge>
      </div>

      {/* Upcoming games */}
      {upcomingGames.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Upcoming Games ({upcomingGames.length})
          </h2>
          <div className="space-y-2">
            {upcomingGames.map((game) => (
              <GameRow key={game.id} game={game} />
            ))}
          </div>
        </div>
      )}

      {/* Completed games (collapsible) */}
      {completedGames.length > 0 && (
        <div>
          <button
            onClick={() => { track('Toggle Completed Games', { action: showCompleted ? 'collapse' : 'expand' }); setShowCompleted(!showCompleted); }}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 hover:text-foreground transition-colors w-full"
            data-testid="toggle-completed"
          >
            Completed Games ({completedGames.length})
            {showCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showCompleted && (
            <div className="space-y-2">
              {completedGames.map((game) => (
                <GameRow key={game.id} game={game} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
