import { useQuery } from "@tanstack/react-query";
import { supabaseQuery } from "@/lib/supabase";

interface TimestampRow {
  [key: string]: string;
}

/**
 * Fetches the most recent timestamp from a Supabase table column.
 * Uses order + limit=1 via the REST API to get the max value efficiently.
 */
function useMaxTimestamp(table: string, column: string) {
  return useQuery<string | null>({
    queryKey: ["last_updated", table, column],
    queryFn: async () => {
      const rows = await supabaseQuery<TimestampRow>(
        table,
        `select=${column}&order=${column}.desc.nullslast&limit=1`
      );
      if (rows.length > 0 && rows[0][column]) {
        return rows[0][column];
      }
      return null;
    },
    staleTime: 60_000, // Cache for 1 minute
  });
}

/** Schedule page — games.updated_at */
export function useGamesLastUpdated() {
  return useMaxTimestamp("games", "updated_at");
}

/** Stats page — latest of batting_stats.updated_at and pitching_stats.updated_at */
export function useStatsLastUpdated() {
  const batting = useMaxTimestamp("batting_stats", "updated_at");
  const pitching = useMaxTimestamp("pitching_stats", "updated_at");

  const latest =
    batting.data && pitching.data
      ? batting.data > pitching.data
        ? batting.data
        : pitching.data
      : batting.data || pitching.data || null;

  return {
    data: latest,
    isLoading: batting.isLoading || pitching.isLoading,
  };
}

/** News page — news_articles.created_at */
export function useNewsLastUpdated() {
  return useMaxTimestamp("news_articles", "created_at");
}

/** Home page rankings — rankings.last_updated */
export function useRankingsLastUpdated() {
  return useMaxTimestamp("rankings", "last_updated");
}
