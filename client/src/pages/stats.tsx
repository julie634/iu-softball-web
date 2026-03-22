import { usePlayers, useBattingStats, usePitchingStats, useGames } from "@/hooks/use-supabase";
import { useStatsLastUpdated } from "@/hooks/use-last-updated";
import LastUpdated from "@/components/LastUpdated";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { ArrowUpDown, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { track } from "@vercel/analytics";
import type { Player, BattingStats, PitchingStats } from "@/lib/supabase";

function fmt(val: number | null, decimals = 3): string {
  if (val == null) return "—";
  if (decimals === 3) return val.toFixed(3).replace(/^0/, "");
  return val.toFixed(decimals);
}

function fmtInt(val: number | null): string {
  return val != null ? String(val) : "—";
}

type BattingSortKey = "avg" | "home_runs" | "rbi" | "ops" | "stolen_bases";
type PitchingSortKey = "era" | "wl" | "innings_pitched" | "strikeouts" | "whip";

function TeamSummary({
  games,
  battingStats,
  pitchingStats,
}: {
  games: any[];
  battingStats: BattingStats[];
  pitchingStats: PitchingStats[];
}) {
  const completed = games.filter((g: any) => g.status === "completed");
  const wins = completed.filter((g: any) => g.iu_score > g.opponent_score).length;
  const losses = completed.filter((g: any) => g.iu_score < g.opponent_score).length;

  const totalAvg = battingStats.length > 0
    ? battingStats.reduce((sum, s) => sum + (s.avg || 0) * (s.at_bats || 0), 0) /
      Math.max(1, battingStats.reduce((sum, s) => sum + (s.at_bats || 0), 0))
    : 0;

  const totalEra = pitchingStats.length > 0
    ? pitchingStats.reduce((sum, s) => sum + (s.era || 0) * (s.innings_pitched || 0), 0) /
      Math.max(1, pitchingStats.reduce((sum, s) => sum + (s.innings_pitched || 0), 0))
    : 0;

  const totalHR = battingStats.reduce((sum, s) => sum + (s.home_runs || 0), 0);
  const totalSB = battingStats.reduce((sum, s) => sum + (s.stolen_bases || 0), 0);

  const stats = [
    { label: "Record", value: `${wins}-${losses}` },
    { label: "AVG", value: totalAvg.toFixed(3).replace(/^0/, "") },
    { label: "ERA", value: totalEra.toFixed(2) },
    { label: "HR", value: String(totalHR) },
    { label: "SB", value: String(totalSB) },
  ];

  return (
    <Card className="p-4 border border-card-border bg-gradient-to-r from-primary/5 to-transparent" data-testid="team-summary">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Team Stats</h2>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {stats.map(({ label, value }) => (
          <div key={label} className="text-center">
            <p className="text-lg font-bold tabular-nums">{value}</p>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function BattingTable({
  players,
  stats,
}: {
  players: Player[];
  stats: BattingStats[];
}) {
  const [sortKey, setSortKey] = useState<BattingSortKey>("avg");
  const [sortDesc, setSortDesc] = useState(true);

  const playerMap = new Map(players.map((p) => [p.id, p]));
  const merged = stats
    .filter((s) => {
      const p = playerMap.get(s.player_id);
      return p && (s.at_bats || 0) > 0;
    })
    .sort((a, b) => {
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
      return sortDesc ? Number(bVal) - Number(aVal) : Number(aVal) - Number(bVal);
    });

  const handleSort = (key: BattingSortKey) => {
    if (sortKey === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  const columns: { key: BattingSortKey; label: string }[] = [
    { key: "avg", label: "AVG" },
    { key: "home_runs", label: "HR" },
    { key: "rbi", label: "RBI" },
    { key: "ops", label: "OPS" },
    { key: "stolen_bases", label: "SB" },
  ];

  return (
    <div className="overflow-x-auto -mx-1" data-testid="batting-table">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground sticky left-0 bg-background z-10">
              Player
            </th>
            {columns.map(({ key, label }) => (
              <th
                key={key}
                className="text-right py-2 px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                onClick={() => handleSort(key)}
                data-testid={`sort-batting-${key}`}
              >
                <span className="inline-flex items-center gap-0.5">
                  {label}
                  <ArrowUpDown className={`w-3 h-3 ${sortKey === key ? "text-primary" : "opacity-30"}`} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {merged.map((s) => {
            const p = playerMap.get(s.player_id)!;
            return (
              <tr
                key={s.player_id}
                className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                data-testid={`batting-row-${s.player_id}`}
              >
                <td className="py-2.5 px-2 sticky left-0 bg-background z-10">
                  <Link
                    href={`/roster/${s.player_id}`}
                    className="text-sm font-semibold text-primary hover:underline whitespace-nowrap"
                    data-testid={`player-link-batting-${s.player_id}`}
                  >
                    {p.first_name.charAt(0)}. {p.last_name}
                  </Link>
                </td>
                <td className="text-right py-2.5 px-2 tabular-nums font-medium">{fmt(s.avg)}</td>
                <td className="text-right py-2.5 px-2 tabular-nums">{fmtInt(s.home_runs)}</td>
                <td className="text-right py-2.5 px-2 tabular-nums">{fmtInt(s.rbi)}</td>
                <td className="text-right py-2.5 px-2 tabular-nums">{fmt(s.ops)}</td>
                <td className="text-right py-2.5 px-2 tabular-nums">{fmtInt(s.stolen_bases)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PitchingTable({
  players,
  stats,
}: {
  players: Player[];
  stats: PitchingStats[];
}) {
  const [sortKey, setSortKey] = useState<PitchingSortKey>("era");
  const [sortDesc, setSortDesc] = useState(false);

  const playerMap = new Map(players.map((p) => [p.id, p]));
  const merged = stats
    .filter((s) => {
      const p = playerMap.get(s.player_id);
      return p && (s.innings_pitched || 0) > 0;
    })
    .sort((a, b) => {
      if (sortKey === "wl") {
        const aWins = a.wins ?? 0;
        const bWins = b.wins ?? 0;
        return sortDesc ? Number(bWins) - Number(aWins) : Number(aWins) - Number(bWins);
      }
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
      return sortDesc ? Number(bVal) - Number(aVal) : Number(aVal) - Number(bVal);
    });

  const handleSort = (key: PitchingSortKey) => {
    if (sortKey === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(key);
      setSortDesc(key === "era" || key === "whip" ? false : true);
    }
  };

  const columns: { key: PitchingSortKey; label: string }[] = [
    { key: "era", label: "ERA" },
    { key: "wl", label: "W-L" },
    { key: "innings_pitched", label: "IP" },
    { key: "strikeouts", label: "K" },
    { key: "whip", label: "WHIP" },
  ];

  return (
    <div className="overflow-x-auto -mx-1" data-testid="pitching-table">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground sticky left-0 bg-background z-10">
              Player
            </th>
            {columns.map(({ key, label }) => (
              <th
                key={key}
                className="text-right py-2 px-2 text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                onClick={() => handleSort(key)}
                data-testid={`sort-pitching-${key}`}
              >
                <span className="inline-flex items-center gap-0.5">
                  {label}
                  <ArrowUpDown className={`w-3 h-3 ${sortKey === key ? "text-primary" : "opacity-30"}`} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {merged.map((s) => {
            const p = playerMap.get(s.player_id)!;
            return (
              <tr
                key={s.player_id}
                className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                data-testid={`pitching-row-${s.player_id}`}
              >
                <td className="py-2.5 px-2 sticky left-0 bg-background z-10">
                  <Link
                    href={`/roster/${s.player_id}`}
                    className="text-sm font-semibold text-primary hover:underline whitespace-nowrap"
                    data-testid={`player-link-pitching-${s.player_id}`}
                  >
                    {p.first_name.charAt(0)}. {p.last_name}
                  </Link>
                </td>
                <td className="text-right py-2.5 px-2 tabular-nums font-medium">{fmt(s.era, 2)}</td>
                <td className="text-right py-2.5 px-2 tabular-nums">{fmtInt(s.wins)}-{fmtInt(s.losses)}</td>
                <td className="text-right py-2.5 px-2 tabular-nums">{fmt(s.innings_pitched, 1)}</td>
                <td className="text-right py-2.5 px-2 tabular-nums">{fmtInt(s.strikeouts)}</td>
                <td className="text-right py-2.5 px-2 tabular-nums">{fmt(s.whip, 2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatsSkeletons() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-10 rounded-lg" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded" />
        ))}
      </div>
    </div>
  );
}

export default function StatsPage() {
  const { data: players, isLoading: pLoading } = usePlayers();
  const { data: battingStats, isLoading: bLoading } = useBattingStats();
  const { data: pitchingStats, isLoading: piLoading } = usePitchingStats();
  const { data: games, isLoading: gLoading } = useGames();
  const { data: statsUpdatedAt, isLoading: tsLoading } = useStatsLastUpdated();

  const isLoading = pLoading || bLoading || piLoading || gLoading;

  if (isLoading) return <StatsSkeletons />;
  if (!players || !battingStats || !pitchingStats || !games) return null;

  return (
    <div className="space-y-4" data-testid="stats-page">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Stats</h1>
      </div>
      <LastUpdated timestamp={statsUpdatedAt} isLoading={tsLoading} />

      <TeamSummary games={games} battingStats={battingStats} pitchingStats={pitchingStats} />

      <Tabs defaultValue="batting" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="batting" onClick={() => track('Stats Tab', { tab: 'Batting' })} data-testid="tab-batting">Batting</TabsTrigger>
          <TabsTrigger value="pitching" onClick={() => track('Stats Tab', { tab: 'Pitching' })} data-testid="tab-pitching">Pitching</TabsTrigger>
        </TabsList>
        <TabsContent value="batting" className="mt-3">
          <BattingTable players={players} stats={battingStats} />
        </TabsContent>
        <TabsContent value="pitching" className="mt-3">
          <PitchingTable players={players} stats={pitchingStats} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
