import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  format,
  addDays,
  subDays,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Radio,
  RefreshCw,
  Trophy,
  Circle,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { track } from "@vercel/analytics";

// ---- NCAA Scoreboard Types ----

interface NCAATeam {
  score: string;
  names: {
    char6: string;
    short: string;
    seo: string;
    full: string;
  };
  winner: boolean;
  seed: string;
  description: string; // record like "(19-7-0)"
  rank: string;
  conferences: Array<{
    conferenceName: string;
    conferenceSeo: string;
  }>;
}

interface NCAAGame {
  gameID: string;
  away: NCAATeam;
  home: NCAATeam;
  finalMessage: string;
  bracketRound: string;
  title: string;
  contestName: string;
  url: string;
  network: string;
  liveVideoEnabled: boolean;
  startTime: string;
  startTimeEpoch: string;
  bracketId: string;
  gameState: "pre" | "live" | "final" | string;
  startDate: string;
  currentPeriod: string;
  videoState: string;
  bracketRegion: string;
  contestClock: string;
}

interface NCAAScoreboardResponse {
  games: Array<{ game: NCAAGame }>;
}

// ---- Helper: identify IU Bloomington ----

function isIUBloomington(team: NCAATeam): boolean {
  return team.names.full === "Indiana University, Bloomington";
}

function isIUGame(game: NCAAGame): boolean {
  return isIUBloomington(game.away) || isIUBloomington(game.home);
}

// ---- Hook: fetch NCAA scoreboard for a date ----

function formatDateForAPI(date: Date): string {
  // NCAA API uses calendar year 2025 for current season
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  // Use 2025 for the season (college softball season spans Feb-June)
  return `2025/${month}/${day}`;
}

function useNCAASCoreboard(date: Date) {
  const dateStr = formatDateForAPI(date);

  return useQuery<NCAAGame[]>({
    queryKey: ["ncaa_scoreboard", dateStr],
    queryFn: async () => {
      const url = `https://data.ncaa.com/casablanca/scoreboard/softball/d1/${dateStr}/scoreboard.json`;
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) return []; // No games on this date
        throw new Error(`NCAA API error: ${res.status}`);
      }
      const data: NCAAScoreboardResponse = await res.json();
      return data.games?.map((g) => g.game) || [];
    },
    refetchInterval: (query) => {
      // Auto-refresh every 30 seconds if there are live games
      const games = query.state.data;
      if (games?.some((g) => g.gameState === "live")) {
        return 30_000;
      }
      return 120_000; // Every 2 minutes otherwise
    },
    staleTime: 15_000,
  });
}

// ---- Conference filter options ----

const CONFERENCE_FILTERS = [
  { label: "All", value: "all" },
  { label: "Big Ten", value: "big-ten" },
  { label: "SEC", value: "sec" },
  { label: "ACC", value: "acc" },
  { label: "Big 12", value: "big-12" },
  { label: "Pac-12", value: "pac-12" },
];

// ---- Game Card Component ----

function GameCard({
  game,
  isHighlighted,
}: {
  game: NCAAGame;
  isHighlighted: boolean;
}) {
  const isLive = game.gameState === "live";
  const isFinal = game.gameState === "final";
  const isPre = game.gameState === "pre";

  const awayScore = parseInt(game.away.score) || 0;
  const homeScore = parseInt(game.home.score) || 0;

  return (
    <Card
      className={`border transition-colors ${
        isHighlighted
          ? "border-[#990000]/50 bg-[#990000]/5 dark:bg-[#990000]/10 ring-1 ring-[#990000]/20"
          : "border-card-border"
      }`}
      data-testid={`scoreboard-game-${game.gameID}`}
    >
      <div className="p-3 sm:p-4">
        {/* Status bar */}
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
                {game.startTime !== "TBA"
                  ? game.startTime
                  : "TBA"}
              </span>
            )}
            {isLive && game.currentPeriod && (
              <span className="text-[10px] text-muted-foreground font-semibold tabular-nums">
                {game.currentPeriod}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {game.contestName && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0"
              >
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

        {/* Teams */}
        <div className="space-y-2">
          {/* Away team */}
          <TeamRow
            team={game.away}
            score={awayScore}
            isWinner={isFinal && game.away.winner}
            isLive={isLive}
            isFinal={isFinal}
            isPre={isPre}
            isIU={isIUBloomington(game.away)}
          />

          {/* Divider */}
          <div className="border-t border-border/50" />

          {/* Home team */}
          <TeamRow
            team={game.home}
            score={homeScore}
            isWinner={isFinal && game.home.winner}
            isLive={isLive}
            isFinal={isFinal}
            isPre={isPre}
            isIU={isIUBloomington(game.home)}
          />
        </div>

        {/* Conference info */}
        {(game.away.conferences?.[0]?.conferenceName ||
          game.home.conferences?.[0]?.conferenceName) && (
          <div className="mt-2.5 pt-2 border-t border-border/30 flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>{game.away.conferences?.[0]?.conferenceName || "—"}</span>
            <span>vs</span>
            <span>{game.home.conferences?.[0]?.conferenceName || "—"}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

function TeamRow({
  team,
  score,
  isWinner,
  isLive,
  isFinal,
  isPre,
  isIU,
}: {
  team: NCAATeam;
  score: number;
  isWinner: boolean;
  isLive: boolean;
  isFinal: boolean;
  isPre: boolean;
  isIU: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      {/* Team name + record */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {team.rank && (
            <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
              #{team.rank}
            </span>
          )}
          <span
            className={`text-sm truncate ${
              isIU
                ? "font-bold text-[#990000] dark:text-red-400"
                : isWinner
                ? "font-bold"
                : isFinal
                ? "text-muted-foreground"
                : "font-medium"
            }`}
          >
            {team.names.short}
          </span>
          {team.seed && (
            <span className="text-[10px] text-muted-foreground">
              ({team.seed})
            </span>
          )}
        </div>
        {team.description && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {team.description}
          </span>
        )}
      </div>

      {/* Score */}
      {!isPre && (
        <span
          className={`text-lg tabular-nums min-w-[2ch] text-right ${
            isWinner
              ? "font-bold"
              : isLive
              ? "font-semibold"
              : "text-muted-foreground"
          }`}
        >
          {score}
        </span>
      )}

      {/* Winner indicator */}
      {isWinner && (
        <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500 flex-shrink-0" />
      )}
    </div>
  );
}

// ---- Skeletons ----

function ScoreboardSkeletons() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  );
}

// ---- Main Page ----

export default function ScoreboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [conferenceFilter, setConferenceFilter] = useState("all");

  const { data: games, isLoading, isRefetching } = useNCAASCoreboard(selectedDate);

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

  // Filter and sort games
  const { iuGames, otherGames, liveCount } = useMemo(() => {
    if (!games) return { iuGames: [], otherGames: [], liveCount: 0 };

    let filtered = games;

    // Conference filter
    if (conferenceFilter !== "all") {
      filtered = filtered.filter(
        (g) =>
          g.away.conferences?.some(
            (c) => c.conferenceSeo === conferenceFilter
          ) ||
          g.home.conferences?.some(
            (c) => c.conferenceSeo === conferenceFilter
          )
      );
    }

    // Split IU games and others
    const iu = filtered.filter(isIUGame);
    const others = filtered.filter((g) => !isIUGame(g));

    // Sort: live games first, then pre, then final
    const sortOrder = { live: 0, pre: 1, final: 2 };
    const sorter = (a: NCAAGame, b: NCAAGame) => {
      const aOrder = sortOrder[a.gameState as keyof typeof sortOrder] ?? 1;
      const bOrder = sortOrder[b.gameState as keyof typeof sortOrder] ?? 1;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (parseInt(a.startTimeEpoch) || 0) - (parseInt(b.startTimeEpoch) || 0);
    };

    iu.sort(sorter);
    others.sort(sorter);

    const liveCount = filtered.filter((g) => g.gameState === "live").length;

    return { iuGames: iu, otherGames: others, liveCount };
  }, [games, conferenceFilter]);

  const isToday =
    format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-4" data-testid="scoreboard-page">
      {/* Header */}
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

      {/* Date navigator */}
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

      {/* Conference filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
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

      {/* Content */}
      {isLoading ? (
        <ScoreboardSkeletons />
      ) : games && games.length === 0 ? (
        <Card className="p-8 text-center border border-card-border">
          <p className="text-muted-foreground text-sm">
            No D1 softball games scheduled for this date.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* IU Games (always shown first, highlighted) */}
          {iuGames.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#990000] dark:text-red-400 mb-2 flex items-center gap-2">
                <svg
                  viewBox="0 0 32 32"
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="16" cy="16" r="13" />
                  <path d="M16 3C16 3 10 10 10 16C10 22 16 29 16 29" />
                  <path d="M16 3C16 3 22 10 22 16C22 22 16 29 16 29" />
                  <line x1="3" y1="16" x2="29" y2="16" />
                </svg>
                Indiana Hoosiers
              </h2>
              <div className="space-y-2">
                {iuGames.map((game) => (
                  <GameCard
                    key={game.gameID}
                    game={game}
                    isHighlighted={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other Games */}
          {otherGames.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                {conferenceFilter === "all"
                  ? `All D1 Games (${otherGames.length})`
                  : `${
                      CONFERENCE_FILTERS.find(
                        (c) => c.value === conferenceFilter
                      )?.label
                    } Games (${otherGames.length})`}
              </h2>
              <div className="space-y-2">
                {otherGames.map((game) => (
                  <GameCard
                    key={game.gameID}
                    game={game}
                    isHighlighted={false}
                  />
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

      {/* Data attribution */}
      <p className="text-[10px] text-muted-foreground text-center pt-2">
        Scores provided by NCAA. Auto-refreshes every{" "}
        {liveCount > 0 ? "30 seconds" : "2 minutes"}.
      </p>
    </div>
  );
}
