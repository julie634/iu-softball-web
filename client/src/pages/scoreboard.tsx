import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { addDays, format, subDays } from "date-fns";
import { calendarDayKey } from "@/lib/dates";
import {
  ChevronLeft,
  ChevronRight,
  Circle,
  Radio,
  RefreshCw,
  Trophy,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { track } from "@vercel/analytics";
import {
  fetchEspnScoreboard,
  isIUScoreboardGame,
  type ScoreboardGame,
  type ScoreboardTeam,
} from "@/lib/espn-scoreboard";

function useEspnScoreboard(date: Date) {
  return useQuery<ScoreboardGame[]>({
    queryKey: ["espn_scoreboard", calendarDayKey(date)],
    queryFn: () => fetchEspnScoreboard(date),
    refetchInterval: (query) =>
      query.state.data?.some((g) => g.state === "live") ? 30_000 : 120_000,
    staleTime: 15_000,
  });
}

const CONFERENCE_FILTERS = [
  { label: "All", value: "all" },
  { label: "Big Ten", value: "big-ten" },
  { label: "SEC", value: "sec" },
  { label: "ACC", value: "acc" },
  { label: "Big 12", value: "big-12" },
];

function GameCard({
  game,
  isHighlighted,
}: {
  game: ScoreboardGame;
  isHighlighted: boolean;
}) {
  const isLive = game.state === "live";
  const isFinal = game.state === "final";
  const isPre = game.state === "pre";

  return (
    <Card
      className={`border transition-colors ${
        isHighlighted
          ? "border-[#990000]/50 bg-[#990000]/5 dark:bg-[#990000]/10 ring-1 ring-[#990000]/20"
          : "border-card-border"
      }`}
      data-testid={`scoreboard-game-${game.id}`}
    >
      <div className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isLive && (
              <Badge
                variant="destructive"
                className="text-[10px] px-1.5 py-0 animate-pulse"
              >
                <Radio className="w-2.5 h-2.5 mr-1" />
                LIVE
              </Badge>
            )}
            {isFinal && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {game.finalMessage || "FINAL"}
              </Badge>
            )}
            {isPre && (
              <span className="text-[10px] text-muted-foreground font-medium">
                {game.startTime}
              </span>
            )}
            {isLive && game.period && (
              <span className="text-[10px] text-muted-foreground font-semibold tabular-nums">
                {game.period}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {game.contestName && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                <Trophy className="w-2.5 h-2.5 mr-1" />
                {game.contestName}
              </Badge>
            )}
            {game.network && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {game.network}
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <TeamRow
            team={game.away}
            isWinner={isFinal && game.away.winner}
            isLive={isLive}
            isFinal={isFinal}
            isPre={isPre}
          />
          <div className="border-t border-border/50" />
          <TeamRow
            team={game.home}
            isWinner={isFinal && game.home.winner}
            isLive={isLive}
            isFinal={isFinal}
            isPre={isPre}
          />
        </div>

        {(game.away.conferenceName || game.home.conferenceName) && (
          <div className="mt-2.5 pt-2 border-t border-border/30 flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>{game.away.conferenceName || "—"}</span>
            <span>vs</span>
            <span>{game.home.conferenceName || "—"}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

function TeamRow({
  team,
  isWinner,
  isLive,
  isFinal,
  isPre,
}: {
  team: ScoreboardTeam;
  isWinner: boolean;
  isLive: boolean;
  isFinal: boolean;
  isPre: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {team.rank && team.rank !== "0" && (
            <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
              #{team.rank}
            </span>
          )}
          <span
            className={`text-sm truncate ${
              team.isIU
                ? "font-bold text-[#990000] dark:text-red-400"
                : isWinner
                  ? "font-bold"
                  : isFinal
                    ? "text-muted-foreground"
                    : "font-medium"
            }`}
          >
            {team.shortName}
          </span>
        </div>
        {team.record && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {team.record}
          </span>
        )}
      </div>

      {!isPre && (
        <span
          className={`text-lg tabular-nums min-w-[2ch] text-right ${
            isWinner ? "font-bold" : isLive ? "font-semibold" : "text-muted-foreground"
          }`}
        >
          {team.score}
        </span>
      )}

      {isWinner && (
        <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500 flex-shrink-0" />
      )}
    </div>
  );
}

function ScoreboardSkeletons() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  );
}

export default function ScoreboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [conferenceFilter, setConferenceFilter] = useState("all");
  const { data: games, isLoading, isRefetching } = useEspnScoreboard(selectedDate);

  const goToPrev = useCallback(() => {
    setSelectedDate((d) => subDays(d, 1));
    track("Scoreboard Date Change", { direction: "prev" });
  }, []);

  const goToNext = useCallback(() => {
    setSelectedDate((d) => addDays(d, 1));
    track("Scoreboard Date Change", { direction: "next" });
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
    track("Scoreboard Date Change", { direction: "today" });
  }, []);

  const { iuGames, otherGames, liveCount } = useMemo(() => {
    if (!games) return { iuGames: [], otherGames: [], liveCount: 0 };

    let filtered = games;
    if (conferenceFilter !== "all") {
      filtered = filtered.filter(
        (g) =>
          g.away.conferenceSeo === conferenceFilter ||
          g.home.conferenceSeo === conferenceFilter,
      );
    }

    const iu = filtered.filter(isIUScoreboardGame);
    const others = filtered.filter((g) => !isIUScoreboardGame(g));
    const sortOrder = { live: 0, pre: 1, final: 2 };
    const sorter = (a: ScoreboardGame, b: ScoreboardGame) => {
      const aOrder = sortOrder[a.state];
      const bOrder = sortOrder[b.state];
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.startEpoch - b.startEpoch;
    };
    iu.sort(sorter);
    others.sort(sorter);
    return {
      iuGames: iu,
      otherGames: others,
      liveCount: filtered.filter((g) => g.state === "live").length,
    };
  }, [games, conferenceFilter]);

  const isToday =
    format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-4" data-testid="scoreboard-page">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Live Scoreboard</h1>
        <div className="flex items-center gap-2">
          {liveCount > 0 && (
            <Badge
              variant="destructive"
              className="text-[10px] px-1.5 py-0 animate-pulse"
            >
              <Radio className="w-2.5 h-2.5 mr-1" />
              {liveCount} Live
            </Badge>
          )}
          {isRefetching && (
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between bg-muted/50 rounded-xl p-2">
        <button
          onClick={goToPrev}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Previous day"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className={`text-sm font-semibold transition-colors ${
              isToday ? "text-primary" : "text-foreground hover:text-primary"
            }`}
          >
            {isToday ? "Today" : format(selectedDate, "EEEE")},{" "}
            {format(selectedDate, "MMM d, yyyy")}
          </button>
          {!isToday && (
            <button
              onClick={goToToday}
              className="text-[10px] text-primary font-semibold hover:underline"
            >
              Today
            </button>
          )}
        </div>
        <button
          onClick={goToNext}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Next day"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {CONFERENCE_FILTERS.map((conf) => (
          <button
            key={conf.value}
            onClick={() => {
              setConferenceFilter(conf.value);
              track("Scoreboard Filter", { conference: conf.label });
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              conferenceFilter === conf.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            {conf.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <ScoreboardSkeletons />
      ) : games && games.length === 0 ? (
        <Card className="p-8 text-center border border-card-border">
          <p className="text-muted-foreground text-sm">
            No D1 softball games on the ESPN board for this date.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {iuGames.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#990000] dark:text-red-400 mb-2">
                Indiana Hoosiers
              </h2>
              <div className="space-y-2">
                {iuGames.map((game) => (
                  <GameCard key={game.id} game={game} isHighlighted />
                ))}
              </div>
            </div>
          )}

          {otherGames.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                {conferenceFilter === "all"
                  ? `All D1 Games (${otherGames.length})`
                  : `${CONFERENCE_FILTERS.find((c) => c.value === conferenceFilter)?.label} Games (${otherGames.length})`}
              </h2>
              <div className="space-y-2">
                {otherGames.map((game) => (
                  <GameCard key={game.id} game={game} isHighlighted={false} />
                ))}
              </div>
            </div>
          )}

          {iuGames.length === 0 && otherGames.length === 0 && (
            <Card className="p-8 text-center border border-card-border">
              <p className="text-muted-foreground text-sm">
                No games match your filter.
              </p>
            </Card>
          )}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground text-center pt-2">
        Scores from ESPN college softball. Auto-refreshes every{" "}
        {liveCount > 0 ? "30 seconds" : "2 minutes"}.
      </p>
    </div>
  );
}
