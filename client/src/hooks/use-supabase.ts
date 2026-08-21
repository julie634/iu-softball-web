import { useQuery } from "@tanstack/react-query";
import {
  supabaseQuery,
  type Game,
  type Player,
  type BattingStats,
  type PitchingStats,
  type NewsArticle,
  type SocialPost,
  type Ranking,
  type Coach,
  type DataSourceRun,
} from "@/lib/supabase";
import { SOURCED_COACHES } from "@/content/coaches";

export function useGames() {
  return useQuery<Game[]>({
    queryKey: ["games"],
    queryFn: () => supabaseQuery<Game>("games", "order=date.asc"),
    staleTime: 30_000,
    refetchInterval: (query) =>
      query.state.data?.some((g) => g.status === "live") ? 30_000 : 120_000,
  });
}

export function usePlayers() {
  return useQuery<Player[]>({
    queryKey: ["players"],
    queryFn: () => supabaseQuery<Player>("players", "order=number.asc"),
  });
}

export function useBattingStats() {
  return useQuery<BattingStats[]>({
    queryKey: ["batting_stats"],
    queryFn: () => supabaseQuery<BattingStats>("batting_stats"),
  });
}

export function usePitchingStats() {
  return useQuery<PitchingStats[]>({
    queryKey: ["pitching_stats"],
    queryFn: () => supabaseQuery<PitchingStats>("pitching_stats"),
  });
}

export function useNewsArticles() {
  return useQuery<NewsArticle[]>({
    queryKey: ["news_articles"],
    queryFn: () =>
      supabaseQuery<NewsArticle>("news_articles", "order=published_date.desc"),
  });
}

export function useSocialPosts() {
  return useQuery<SocialPost[]>({
    queryKey: ["social_posts"],
    queryFn: () =>
      supabaseQuery<SocialPost>("social_posts", "order=posted_date.desc"),
  });
}

export function useRankings() {
  return useQuery<Ranking[]>({
    queryKey: ["rankings"],
    queryFn: () =>
      supabaseQuery<Ranking>("rankings", "order=rpi_rank.asc.nullslast"),
  });
}

export function useCoaches() {
  return useQuery<Coach[]>({
    queryKey: ["coaches"],
    queryFn: async () => {
      try {
        const rows = await supabaseQuery<Coach>("coaches", "order=sort_order.asc");
        if (rows.length > 0) return rows;
      } catch {
        // Table is missing until the coaches migration is applied.
      }
      return SOURCED_COACHES;
    },
  });
}

export function useDataSourceRuns() {
  return useQuery<DataSourceRun[]>({
    queryKey: ["data_source_runs"],
    queryFn: async () => {
      try {
        return await supabaseQuery<DataSourceRun>(
          "data_source_runs",
          "order=started_at.desc&limit=40",
        );
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });
}
