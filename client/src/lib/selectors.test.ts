import { describe, expect, it } from "vitest";
import type { Game } from "./supabase";
import {
  completedResultLabel,
  computeRecord,
  getNextGame,
  getSeasonState,
  isFallBallGame,
  partitionGames,
  shouldShowLiveNav,
} from "./selectors";

function game(partial: Partial<Game> & Pick<Game, "id" | "date" | "status">): Game {
  return {
    opponent: "Opponent",
    opponent_logo: null,
    location: "home",
    venue: "Andy Mohr Field",
    city: "Bloomington",
    iu_score: null,
    opponent_score: null,
    broadcast_network: null,
    stream_url: null,
    box_score_url: null,
    is_conference_game: false,
    tournament_name: null,
    notes: null,
    innings_played: null,
    venue_lat: null,
    venue_lon: null,
    opponent_record: null,
    ...partial,
  };
}

describe("computeRecord", () => {
  it("counts real wins/losses and conference splits; ignores null scores", () => {
    const games = [
      game({
        id: "1",
        date: "2026-03-01T18:00:00.000Z",
        status: "completed",
        iu_score: 5,
        opponent_score: 2,
        is_conference_game: true,
      }),
      game({
        id: "2",
        date: "2026-03-02T18:00:00.000Z",
        status: "completed",
        iu_score: 1,
        opponent_score: 3,
        is_conference_game: true,
      }),
      game({
        id: "3",
        date: "2026-03-03T18:00:00.000Z",
        status: "completed",
        iu_score: 4,
        opponent_score: 0,
        is_conference_game: false,
      }),
      game({
        id: "4",
        date: "2026-03-04T18:00:00.000Z",
        status: "completed",
        iu_score: null,
        opponent_score: null,
      }),
      game({
        id: "5",
        date: "2026-03-05T18:00:00.000Z",
        status: "upcoming",
        iu_score: null,
        opponent_score: null,
      }),
    ];
    expect(computeRecord(games)).toEqual({
      wins: 2,
      losses: 1,
      confWins: 1,
      confLosses: 1,
    });
  });
});

describe("partitionGames", () => {
  it("does not treat past-dated upcoming as upcoming", () => {
    const now = new Date("2026-04-15T16:00:00.000Z"); // Indy Apr 15
    const games = [
      game({
        id: "stale",
        date: "2026-04-10T18:00:00.000Z",
        status: "upcoming",
      }),
      game({
        id: "today",
        date: "2026-04-15T23:00:00.000Z",
        status: "upcoming",
      }),
      game({
        id: "future",
        date: "2026-04-20T18:00:00.000Z",
        status: "upcoming",
      }),
      game({
        id: "done",
        date: "2026-04-01T18:00:00.000Z",
        status: "completed",
        iu_score: 3,
        opponent_score: 1,
      }),
    ];
    const p = partitionGames(games, now);
    expect(p.upcoming.map((g) => g.id)).toEqual(["today", "future"]);
    expect(p.resultPending.map((g) => g.id)).toEqual(["stale"]);
    expect(p.completed.map((g) => g.id)).toEqual(["done"]);
  });
});

describe("getNextGame / Today badge inputs", () => {
  it("prefers live game over later upcoming", () => {
    const now = new Date("2026-04-15T16:00:00.000Z");
    const games = [
      game({ id: "u", date: "2026-04-16T18:00:00.000Z", status: "upcoming" }),
      game({ id: "l", date: "2026-04-15T17:00:00.000Z", status: "live" }),
    ];
    expect(getNextGame(games, now)?.id).toBe("l");
  });
});

describe("completedResultLabel", () => {
  it("never shows T for missing scores", () => {
    const label = completedResultLabel(
      game({
        id: "x",
        date: "2026-03-01T18:00:00.000Z",
        status: "completed",
        iu_score: null,
        opponent_score: 2,
      }),
    );
    expect(label.kind).toBe("unavailable");
    expect(label.text).toMatch(/score unavailable/i);
    expect(label.text).not.toMatch(/^T\b/);
  });
});

describe("isFallBallGame / computeRecord", () => {
  it("does not count August–November exhibition games in the official record", () => {
    const games = [
      game({
        id: "spring-w",
        date: "2026-03-01T18:00:00.000Z",
        status: "completed",
        iu_score: 5,
        opponent_score: 1,
      }),
      game({
        id: "fall-w",
        date: "2026-09-27T18:00:00.000Z",
        status: "completed",
        iu_score: 8,
        opponent_score: 2,
        tournament_name: "Fall Ball",
      }),
    ];
    expect(isFallBallGame(games[1]!)).toBe(true);
    expect(computeRecord(games)).toEqual({
      wins: 1,
      losses: 0,
      confWins: 0,
      confLosses: 0,
    });
  });
});

describe("getSeasonState", () => {
  it("returns fall-ball during the August–November window", () => {
    const games = [
      game({ id: "1", date: "2026-02-10T18:00:00.000Z", status: "completed", iu_score: 1, opponent_score: 0 }),
      game({ id: "2", date: "2026-05-20T18:00:00.000Z", status: "completed", iu_score: 2, opponent_score: 1 }),
    ];
    expect(getSeasonState(games, new Date("2026-08-21T16:00:00.000Z"))).toBe(
      "fall-ball",
    );
  });

  it("returns offseason outside schedule window", () => {
    const games = [
      game({ id: "1", date: "2026-02-10T18:00:00.000Z", status: "completed", iu_score: 1, opponent_score: 0 }),
      game({ id: "2", date: "2026-05-20T18:00:00.000Z", status: "completed", iu_score: 2, opponent_score: 1 }),
    ];
    expect(getSeasonState(games, new Date("2026-07-09T16:00:00.000Z"))).toBe(
      "offseason",
    );
  });

  it("returns postseason when today is in NCAA tournament window", () => {
    const games = [
      game({ id: "r", date: "2026-03-01T18:00:00.000Z", status: "completed", iu_score: 1, opponent_score: 0 }),
      game({
        id: "n1",
        date: "2026-05-16T18:00:00.000Z",
        status: "completed",
        iu_score: 3,
        opponent_score: 2,
        tournament_name: "NCAA Regionals",
      }),
      game({
        id: "n2",
        date: "2026-05-18T18:00:00.000Z",
        status: "upcoming",
        tournament_name: "NCAA Regionals",
      }),
    ];
    expect(getSeasonState(games, new Date("2026-05-17T16:00:00.000Z"))).toBe(
      "postseason",
    );
  });

  it("returns in-season during regular season", () => {
    const games = [
      game({ id: "1", date: "2026-02-10T18:00:00.000Z", status: "completed", iu_score: 1, opponent_score: 0 }),
      game({ id: "2", date: "2026-04-01T18:00:00.000Z", status: "upcoming" }),
      game({ id: "3", date: "2026-05-01T18:00:00.000Z", status: "upcoming" }),
    ];
    expect(getSeasonState(games, new Date("2026-03-15T16:00:00.000Z"))).toBe(
      "in-season",
    );
  });
});

describe("shouldShowLiveNav", () => {
  it("shows live only for live or today games", () => {
    const now = new Date("2026-04-15T16:00:00.000Z");
    expect(
      shouldShowLiveNav(
        [game({ id: "1", date: "2026-04-20T18:00:00.000Z", status: "upcoming" })],
        now,
      ),
    ).toBe(false);
    expect(
      shouldShowLiveNav(
        [game({ id: "1", date: "2026-04-15T23:00:00.000Z", status: "upcoming" })],
        now,
      ),
    ).toBe(true);
    expect(
      shouldShowLiveNav(
        [game({ id: "1", date: "2026-04-10T18:00:00.000Z", status: "live" })],
        now,
      ),
    ).toBe(true);
  });
});
