import { useGames, useNewsArticles, useRankings } from "@/hooks/use-supabase";
import { useRankingsLastUpdated, useGamesLastUpdated } from "@/hooks/use-last-updated";
import LastUpdated from "@/components/LastUpdated";
import { useWeather } from "@/hooks/use-weather";
import WeatherBadge from "@/components/WeatherBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays, differenceInHours, differenceInMinutes, isPast } from "date-fns";
import {
  Calendar,
  Clock,
  MapPin,
  Newspaper,
  ChevronRight,
  Tv,
} from "lucide-react";
import { Link } from "wouter";
import type { Game, Ranking } from "@/lib/supabase";

function HeroBanner({
  record,
  iuRanking,
}: {
  record: { wins: number; losses: number; confWins: number; confLosses: number };
  iuRanking: Ranking | undefined;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#990000] via-[#780000] to-[#1a0000] text-white p-6 md:p-8"
      data-testid="hero-banner"
    >
      <div className="absolute inset-0 opacity-10">
        <svg viewBox="0 0 400 200" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <circle cx="350" cy="100" r="120" fill="white" opacity="0.08" />
          <circle cx="380" cy="60" r="80" fill="white" opacity="0.05" />
          <path d="M0 150 Q100 100 200 150 T400 150 V200 H0Z" fill="white" opacity="0.04" />
        </svg>
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
            <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none">
              <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2" />
              <path d="M16 3C16 3 10 10 10 16C10 22 16 29 16 29" stroke="currentColor" strokeWidth="1.5" />
              <path d="M16 3C16 3 22 10 22 16C22 22 16 29 16 29" stroke="currentColor" strokeWidth="1.5" />
              <line x1="3" y1="16" x2="29" y2="16" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">IU Softball</h1>
            <p className="text-white/70 text-sm font-medium">Indiana Hoosiers</p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <span className="text-3xl font-bold tabular-nums">
            {record.wins}-{record.losses}
          </span>
          <Badge variant="secondary" className="bg-white/20 text-white border-0 hover:bg-white/25 text-xs font-semibold">
            {record.confWins}-{record.confLosses} B1G
          </Badge>
        </div>
        {iuRanking && (iuRanking.rpi_rank || iuRanking.elo_rank) && (
          <p className="text-white/70 text-xs mt-1.5 tabular-nums" data-testid="hero-rankings">
            {iuRanking.rpi_rank ? `RPI #${iuRanking.rpi_rank}` : ""}
            {iuRanking.rpi_rank && iuRanking.elo_rank ? " · " : ""}
            {iuRanking.elo_rank ? `ELO #${iuRanking.elo_rank}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const now = new Date();
  const days = Math.max(0, differenceInDays(targetDate, now));
  const hours = Math.max(0, differenceInHours(targetDate, now) % 24);
  const minutes = Math.max(0, differenceInMinutes(targetDate, now) % 60);

  return (
    <div className="flex gap-3" data-testid="countdown-timer">
      {[
        { value: days, label: "DAYS" },
        { value: hours, label: "HRS" },
        { value: minutes, label: "MIN" },
      ].map(({ value, label }) => (
        <div key={label} className="flex flex-col items-center">
          <span className="text-2xl font-bold tabular-nums text-primary">{value}</span>
          <span className="text-[10px] font-semibold text-muted-foreground tracking-wider">{label}</span>
        </div>
      ))}
    </div>
  );
}

function NextGameWeather({ game }: { game: Game }) {
  const { temp, precipProbability, windSpeed, weatherCode, isLoading } =
    useWeather(game.venue_lat, game.venue_lon, game.date);

  if (isLoading || temp == null) return null;

  return (
    <div className="pt-3 mt-3 border-t border-border">
      <WeatherBadge
        temp={temp}
        precipProbability={precipProbability}
        windSpeed={windSpeed}
        weatherCode={weatherCode}
        compact={true}
      />
    </div>
  );
}

function NextGameCard({
  games,
  rankings,
}: {
  games: Game[];
  rankings: Ranking[];
}) {
  const nextGame = games.find((g) => g.status === "upcoming");
  if (!nextGame) return null;

  const gameDate = new Date(nextGame.date);

  // Look up opponent in rankings for their record
  const opponentRanking = rankings.find(
    (r) =>
      r.team_name.toLowerCase() === nextGame.opponent.toLowerCase() ||
      nextGame.opponent.toLowerCase().includes(r.team_name.toLowerCase()) ||
      r.team_name.toLowerCase().includes(nextGame.opponent.toLowerCase())
  );

  return (
    <Card className="p-5 border border-card-border" data-testid="next-game-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Next Game</h2>
        <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
          <Clock className="w-3 h-3 mr-1" />
          {isPast(gameDate) ? "Today" : format(gameDate, "MMM d")}
        </Badge>
      </div>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
          {nextGame.opponent_logo ? (
            <img
              src={nextGame.opponent_logo}
              alt={nextGame.opponent}
              className="w-10 h-10 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-lg font-bold text-muted-foreground">${nextGame.opponent?.charAt(0) || "?"}</span>`;
              }}
            />
          ) : (
            <span className="text-lg font-bold text-muted-foreground">
              {nextGame.opponent?.charAt(0) || "?"}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base truncate" data-testid="next-game-opponent">
            {nextGame.location === "away" ? "at " : "vs "}
            {nextGame.opponent}
            {opponentRanking?.record && (
              <span className="text-muted-foreground font-normal text-sm ml-1">
                ({opponentRanking.record})
              </span>
            )}
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            {nextGame.venue_lat != null && nextGame.venue_lon != null ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${nextGame.venue_lat},${nextGame.venue_lon}`}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-primary/80 underline decoration-primary/30 underline-offset-2 hover:text-primary hover:decoration-primary/60 transition-colors"
                onClick={(e) => e.stopPropagation()}
                data-testid="next-game-venue-link"
              >
                {nextGame.venue || nextGame.city || "TBD"}
              </a>
            ) : (
              <span className="truncate">{nextGame.venue || nextGame.city || "TBD"}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <CountdownTimer targetDate={gameDate} />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {nextGame.broadcast_network && (
            <Badge variant="secondary" className="text-xs">
              <Tv className="w-3 h-3 mr-1" />
              {nextGame.broadcast_network}
            </Badge>
          )}
        </div>
      </div>
      {/* Compact weather below existing content */}
      {nextGame.venue_lat != null && nextGame.venue_lon != null && (
        <NextGameWeather game={nextGame} />
      )}
    </Card>
  );
}

function RecentNews({ articles }: { articles: any[] }) {
  const recent = articles.slice(0, 3);
  if (recent.length === 0) return null;

  return (
    <div data-testid="recent-news-section">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Newspaper className="w-4 h-4" />
          Recent News
        </h2>
        <Link href="/news" className="text-primary text-xs font-semibold flex items-center hover:underline">
          View All <ChevronRight className="w-3 h-3 ml-0.5" />
        </Link>
      </div>
      <div className="space-y-3">
        {recent.map((article) => (
          <a
            key={article.id}
            href={article.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
            data-testid={`news-card-${article.id}`}
          >
            <Card className="p-4 hover-elevate border border-card-border transition-colors">
              <h3 className="font-semibold text-sm line-clamp-2 mb-1">{article.title}</h3>
              {article.summary && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{article.summary}</p>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {article.source && <span className="font-medium">{article.source}</span>}
                {article.published_date && (
                  <>
                    <span>·</span>
                    <span>{format(new Date(article.published_date), "MMM d")}</span>
                  </>
                )}
              </div>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}

function FollowBar() {
  const links = [
    {
      name: "Instagram",
      url: "https://www.instagram.com/indianasb/",
      icon: (
        <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      ),
    },
    {
      name: "X",
      url: "https://x.com/IndianaSB",
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: "TikTok",
      url: "https://www.tiktok.com/@indianasoftball",
      icon: (
        <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48v-7.1a8.16 8.16 0 005.58 2.2V11.3a4.85 4.85 0 01-3.58-1.59V6.69h3.58z" />
        </svg>
      ),
    },
  ];

  return (
    <div data-testid="follow-bar">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
        Follow IU Softball
      </h2>
      <div className="flex gap-2">
        {links.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-muted hover:bg-muted/80 transition-colors text-foreground"
          >
            {link.icon}
            <span className="text-xs font-semibold">{link.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function QuickLinks() {
  const links = [
    { label: "Schedule", href: "/schedule", icon: Calendar },
    { label: "Roster", href: "/roster", icon: () => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )},
    { label: "News", href: "/news", icon: Newspaper },
  ];

  return (
    <div className="grid grid-cols-3 gap-3" data-testid="quick-links">
      {links.map(({ label, href, icon: Icon }) => (
        <Link key={label} href={href}>
          <Card className="p-4 flex flex-col items-center gap-2 hover-elevate border border-card-border cursor-pointer transition-colors">
            <Icon className="w-5 h-5 text-primary" />
            <span className="text-xs font-semibold">{label}</span>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function HomeSkeletons() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-36 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const { data: games, isLoading: gamesLoading } = useGames();
  const { data: articles, isLoading: newsLoading } = useNewsArticles();
  const { data: rankings } = useRankings();
  const { data: rankingsUpdatedAt, isLoading: rtsLoading } = useRankingsLastUpdated();
  const { data: gamesUpdatedAt, isLoading: gtsLoading } = useGamesLastUpdated();

  const isLoading = gamesLoading || newsLoading;

  const record = games
    ? {
        wins: games.filter((g) => g.status === "completed" && g.iu_score != null && g.opponent_score != null && g.iu_score > g.opponent_score).length,
        losses: games.filter((g) => g.status === "completed" && g.iu_score != null && g.opponent_score != null && g.iu_score < g.opponent_score).length,
        confWins: games.filter((g) => g.status === "completed" && g.is_conference_game && g.iu_score != null && g.opponent_score != null && g.iu_score > g.opponent_score).length,
        confLosses: games.filter((g) => g.status === "completed" && g.is_conference_game && g.iu_score != null && g.opponent_score != null && g.iu_score < g.opponent_score).length,
      }
    : { wins: 0, losses: 0, confWins: 0, confLosses: 0 };

  // Find IU's ranking
  const iuRanking = rankings?.find(
    (r) => r.team_name.toLowerCase() === "indiana"
  );

  const rankingsData = rankings ?? [];

  if (isLoading) return <HomeSkeletons />;

  return (
    <div className="space-y-6" data-testid="home-page">
      <HeroBanner record={record} iuRanking={iuRanking} />
      <LastUpdated timestamp={rankingsUpdatedAt} isLoading={rtsLoading} className="-mt-3" />
      {games && <NextGameCard games={games} rankings={rankingsData} />}
      <LastUpdated timestamp={gamesUpdatedAt} isLoading={gtsLoading} className="-mt-3" />
      <QuickLinks />
      {articles && <RecentNews articles={articles} />}
      <FollowBar />
    </div>
  );
}
