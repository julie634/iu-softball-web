import { describe, expect, it } from "vitest";
import type { Game } from "./supabase";
import {
  completedResultLabel,
  computeRecord,
  fallBallInningsLabel,
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

describe("isFallBallGame", () => {
  it("matches tournament_name with flexible Fall Ball spacing/case", () => {
    expect(
      isFallBallGame(
        game({
          id: "fb",
          date: "2026-09-13T17:00:00.000Z",
          status: "upcoming",
          tournament_name: "Fall Ball",
        }),
      ),
    ).toBe(true);
    expect(
      isFallBallGame(
        game({
          id: "fb2",
          date: "2026-09-13T17:00:00.000Z",
          status: "upcoming",
          tournament_name: "fall  ball",
        }),
      ),
    ).toBe(true);
    expect(
      isFallBallGame(
        game({
          id: "ncaa",
          date: "2026-05-16T18:00:00.000Z",
          status: "completed",
          tournament_name: "NCAA Regionals",
        }),
      ),
    ).toBe(false);
    expect(
      isFallBallGame(
        game({
          id: "reg",
          date: "2026-03-01T18:00:00.000Z",
          status: "completed",
        }),
      ),
    ).toBe(false);
  });
});

describe("fallBallInningsLabel", () => {
  it("reads an inning count from notes and does not invent one", () => {
    expect(
      fallBallInningsLabel(
        game({
          id: "n",
          date: "2026-09-13T17:00:00.000Z",
          status: "upcoming",
          notes: "10-inning exhibition",
        }),
      ),
    ).toBe("10 innings");
    expect(
      fallBallInningsLabel(
        game({
          id: "plain",
          date: "2026-09-13T17:00:00.000Z",
          status: "upcoming",
          notes: "Free admission",
        }),
      ),
    ).toBeNull();
    expect(
      fallBallInningsLabel(
        game({
          id: "empty",
          date: "2026-09-13T17:00:00.000Z",
          status: "upcoming",
        }),
      ),
    ).toBeNull();
  });
});

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

  it("ignores completed Fall Ball exhibitions so spring W-L stays official", () => {
    const games = [
      game({
        id: "spring-w",
        date: "2026-03-01T18:00:00.000Z",
        status: "completed",
        iu_score: 5,
        opponent_score: 2,
        is_conference_game: true,
      }),
      game({
        id: "spring-l",
        date: "2026-03-02T18:00:00.000Z",
        status: "completed",
        iu_score: 1,
        opponent_score: 3,
        is_conference_game: true,
      }),
      game({
        id: "fall-w",
        date: "2026-09-13T17:00:00.000Z",
        status: "completed",
        iu_score: 8,
        opponent_score: 1,
        tournament_name: "Fall Ball",
      }),
    ];
    expect(computeRecord(games)).toEqual({
      wins: 1,
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

describe("getSeasonState", () => {
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

  it("hides Live nav for Fall Ball-only upcoming or live days", () => {
    const gameday = new Date("2026-09-13T16:00:00.000Z");
    expect(
      shouldShowLiveNav(
        [
          game({
            id: "fb",
            date: "2026-09-13T17:00:00.000Z",
            status: "upcoming",
            tournament_name: "Fall Ball",
          }),
        ],
        gameday,
      ),
    ).toBe(false);
    expect(
      shouldShowLiveNav(
        [
          game({
            id: "fb-live",
            date: "2026-09-13T17:00:00.000Z",
            status: "live",
            tournament_name: "Fall Ball",
          }),
        ],
        gameday,
      ),
    ).toBe(false);
  });

  it("still shows Live nav when a non-Fall Ball game is today", () => {
    const now = new Date("2026-04-15T16:00:00.000Z");
    expect(
      shouldShowLiveNav(
        [
          game({
            id: "fb",
            date: "2026-09-13T17:00:00.000Z",
            status: "upcoming",
            tournament_name: "Fall Ball",
          }),
          game({
            id: "spring",
            date: "2026-04-15T23:00:00.000Z",
            status: "upcoming",
          }),
        ],
        now,
      ),
    ).toBe(true);
  });
});
