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
} from "@/lib/supabase";

export function useGames() {
  return useQuery<Game[]>({
    queryKey: ["games"],
    queryFn: () => supabaseQuery<Game>("games", "order=date.asc"),
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
