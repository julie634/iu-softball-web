const SUPABASE_URL = "https://thrwhtqeogdnkwpvcwlk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRocndodHFlb2dkbmt3cHZjd2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MjI4NzEsImV4cCI6MjA4OTE5ODg3MX0.-vmXUvEx9aNZkm5x4HkfhjtqPUn0fQRhu35kXIk1rVM";

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

export async function supabaseQuery<T>(
  table: string,
  query: string = ""
): Promise<T[]> {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ""}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Supabase error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// Types matching the Supabase tables
export interface Game {
  id: string;
  date: string;
  opponent: string;
  opponent_logo: string | null;
  location: "home" | "away" | "neutral";
  venue: string | null;
  city: string | null;
  status: "upcoming" | "live" | "completed" | "postponed" | "canceled";
  iu_score: number | null;
  opponent_score: number | null;
  broadcast_network: string | null;
  stream_url: string | null;
  box_score_url: string | null;
  is_conference_game: boolean;
  tournament_name: string | null;
  notes: string | null;
  innings_played: number | null;
}

export interface Player {
  id: string;
  number: number;
  first_name: string;
  last_name: string;
  position: string;
  class_year: string;
  hometown: string | null;
  height_display: string | null;
  headshot_url: string | null;
  bats: string | null;
  throws_hand: string | null;
}

export interface BattingStats {
  player_id: string;
  avg: number | null;
  ops: number | null;
  games_played: number | null;
  games_started: number | null;
  at_bats: number | null;
  runs: number | null;
  hits: number | null;
  doubles: number | null;
  triples: number | null;
  home_runs: number | null;
  rbi: number | null;
  total_bases: number | null;
  slug_pct: number | null;
  walks: number | null;
  hit_by_pitch: number | null;
  strikeouts: number | null;
  ob_pct: number | null;
  stolen_bases: number | null;
  stolen_base_attempts: number | null;
}

export interface PitchingStats {
  player_id: string;
  era: number | null;
  wins: number | null;
  losses: number | null;
  games_played: number | null;
  games_started: number | null;
  complete_games: number | null;
  shutouts: number | null;
  saves: number | null;
  innings_pitched: number | null;
  hits: number | null;
  runs: number | null;
  earned_runs: number | null;
  walks: number | null;
  strikeouts: number | null;
  opponent_avg: number | null;
  whip: number | null;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string | null;
  source: string | null;
  url: string | null;
  image_url: string | null;
  published_date: string | null;
  category: string | null;
}

export interface SocialPost {
  id: string;
  platform: string | null;
  author: string | null;
  author_handle: string | null;
  content: string | null;
  posted_date: string | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  media_url: string | null;
  post_url: string | null;
}

export interface PlayerWithStats extends Player {
  batting_stats?: BattingStats;
  pitching_stats?: PitchingStats;
}
