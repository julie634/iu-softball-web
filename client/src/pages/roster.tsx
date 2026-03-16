import { usePlayers, useBattingStats, usePitchingStats } from "@/hooks/use-supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useParams } from "wouter";
import { ArrowLeft, MapPin, Ruler, User } from "lucide-react";
import type { Player, BattingStats, PitchingStats } from "@/lib/supabase";

function PlayerCard({ player }: { player: Player }) {
  const isPitcher = player.position?.toLowerCase().includes("p") && !player.position?.toLowerCase().includes("dp");

  return (
    <Link href={`/roster/${player.id}`} data-testid={`player-card-${player.id}`}>
      <Card className="p-4 border border-card-border hover-elevate cursor-pointer transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {player.headshot_url ? (
              <img
                src={player.headshot_url}
                alt={`${player.first_name} ${player.last_name}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-lg font-bold text-primary">#${player.number}</span>`;
                }}
              />
            ) : (
              <span className="text-lg font-bold text-primary">#{player.number}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm">
                #{player.number} {player.first_name} {player.last_name}
              </p>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge
                variant="secondary"
                className={`text-[10px] ${
                  isPitcher
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {player.position}
              </Badge>
              <span className="text-xs text-muted-foreground">{player.class_year}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function StatLine({ label, value }: { label: string; value: string | number | null }) {
  if (value == null) return null;
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/50">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function PlayerDetail({
  player,
  batting,
  pitching,
}: {
  player: Player;
  batting?: BattingStats;
  pitching?: PitchingStats;
}) {
  const isPitcher = pitching && (pitching.innings_pitched || 0) > 0;

  return (
    <div className="space-y-4" data-testid={`player-detail-${player.id}`}>
      <Link href="/roster" className="inline-flex items-center gap-1 text-sm text-primary hover:underline" data-testid="back-to-roster">
        <ArrowLeft className="w-4 h-4" />
        Back to Roster
      </Link>

      <Card className="p-5 border border-card-border">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
            {player.headshot_url ? (
              <img
                src={player.headshot_url}
                alt={`${player.first_name} ${player.last_name}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-2xl font-bold text-primary">#${player.number}</span>`;
                }}
              />
            ) : (
              <span className="text-2xl font-bold text-primary">#{player.number}</span>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold">
              {player.first_name} {player.last_name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{player.position}</Badge>
              <span className="text-sm text-muted-foreground">{player.class_year}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-4">
          {player.hometown && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground col-span-2">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              {player.hometown}
            </div>
          )}
          {player.height_display && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Ruler className="w-3.5 h-3.5" />
              {player.height_display}
            </div>
          )}
          {(player.bats || player.throws_hand) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-3.5 h-3.5" />
              {player.bats && `B: ${player.bats}`}
              {player.bats && player.throws_hand && " / "}
              {player.throws_hand && `T: ${player.throws_hand}`}
            </div>
          )}
        </div>
      </Card>

      {batting && (batting.at_bats || 0) > 0 && (
        <Card className="p-5 border border-card-border">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Batting Stats
          </h2>
          <StatLine label="Batting Average" value={batting.avg?.toFixed(3).replace(/^0/, "") ?? null} />
          <StatLine label="OPS" value={batting.ops?.toFixed(3).replace(/^0/, "") ?? null} />
          <StatLine label="Games Played" value={batting.games_played} />
          <StatLine label="At Bats" value={batting.at_bats} />
          <StatLine label="Runs" value={batting.runs} />
          <StatLine label="Hits" value={batting.hits} />
          <StatLine label="Doubles" value={batting.doubles} />
          <StatLine label="Triples" value={batting.triples} />
          <StatLine label="Home Runs" value={batting.home_runs} />
          <StatLine label="RBI" value={batting.rbi} />
          <StatLine label="Walks" value={batting.walks} />
          <StatLine label="Strikeouts" value={batting.strikeouts} />
          <StatLine label="Stolen Bases" value={batting.stolen_bases} />
          <StatLine label="Slugging Pct" value={batting.slug_pct?.toFixed(3).replace(/^0/, "") ?? null} />
          <StatLine label="On Base Pct" value={batting.ob_pct?.toFixed(3).replace(/^0/, "") ?? null} />
        </Card>
      )}

      {isPitcher && pitching && (
        <Card className="p-5 border border-card-border">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Pitching Stats
          </h2>
          <StatLine label="ERA" value={pitching.era?.toFixed(2) ?? null} />
          <StatLine label="Record" value={`${pitching.wins ?? 0}-${pitching.losses ?? 0}`} />
          <StatLine label="Games Played" value={pitching.games_played} />
          <StatLine label="Games Started" value={pitching.games_started} />
          <StatLine label="Innings Pitched" value={pitching.innings_pitched?.toFixed(1) ?? null} />
          <StatLine label="Strikeouts" value={pitching.strikeouts} />
          <StatLine label="Walks" value={pitching.walks} />
          <StatLine label="WHIP" value={pitching.whip?.toFixed(2) ?? null} />
          <StatLine label="Complete Games" value={pitching.complete_games} />
          <StatLine label="Shutouts" value={pitching.shutouts} />
          <StatLine label="Saves" value={pitching.saves} />
          <StatLine label="Opponent AVG" value={pitching.opponent_avg?.toFixed(3).replace(/^0/, "") ?? null} />
        </Card>
      )}
    </div>
  );
}

function RosterSkeletons() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-24 mb-2" />
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}

export default function RosterPage() {
  const { data: players, isLoading: pLoading } = usePlayers();
  const { data: battingStats, isLoading: bLoading } = useBattingStats();
  const { data: pitchingStats, isLoading: piLoading } = usePitchingStats();
  const params = useParams<{ id: string }>();

  const isLoading = pLoading || bLoading || piLoading;

  if (isLoading) return <RosterSkeletons />;
  if (!players) return null;

  // Player detail view
  if (params.id) {
    const playerId = params.id;
    const player = players.find((p) => String(p.id) === playerId);
    if (!player) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Player not found</p>
          <Link href="/roster" className="text-primary hover:underline text-sm mt-2 inline-block">
            Back to Roster
          </Link>
        </div>
      );
    }
    const batting = battingStats?.find((s) => String(s.player_id) === playerId);
    const pitching = pitchingStats?.find((s) => String(s.player_id) === playerId);
    return <PlayerDetail player={player} batting={batting} pitching={pitching} />;
  }

  // Roster list
  return (
    <div className="space-y-3" data-testid="roster-page">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Roster</h1>
        <Badge variant="secondary" className="text-xs">{players.length} Players</Badge>
      </div>
      <div className="space-y-2">
        {players.map((player) => (
          <PlayerCard key={player.id} player={player} />
        ))}
      </div>
    </div>
  );
}
