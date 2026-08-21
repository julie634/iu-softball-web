import { describe, expect, it } from "vitest";
import {
  ESPN_IU_TEAM_ID,
  espnScoreboardDateKey,
  mapEspnScoreboard,
} from "./espn-scoreboard";

describe("espnScoreboardDateKey", () => {
  it("uses the Indianapolis calendar day as YYYYMMDD", () => {
    // 2026-09-27 02:00 UTC is still Sep 26 evening in Indianapolis
    expect(espnScoreboardDateKey(new Date("2026-09-27T02:00:00.000Z"))).toBe(
      "20260926",
    );
  });
});

describe("mapEspnScoreboard", () => {
  it("maps IU live games and conference ids", () => {
    const games = mapEspnScoreboard({
      events: [
        {
          id: "401",
          date: "2026-09-27T18:00:00Z",
          name: "IU Indy at Indiana",
          competitions: [
            {
              date: "2026-09-27T18:00:00Z",
              broadcasts: [{ names: ["B1G+"] }],
              status: {
                type: { state: "in", completed: false, shortDetail: "4th" },
                displayClock: "1:20",
              },
              competitors: [
                {
                  homeAway: "away",
                  score: { value: "1" },
                  team: {
                    id: "1",
                    shortDisplayName: "IU Indy",
                    displayName: "IU Indianapolis",
                    conferenceId: "7",
                  },
                },
                {
                  homeAway: "home",
                  score: "3",
                  team: {
                    id: ESPN_IU_TEAM_ID,
                    shortDisplayName: "Indiana",
                    displayName: "Indiana Hoosiers",
                    conferenceId: "7",
                  },
                  curatedRank: { current: 0 },
                },
              ],
            },
          ],
        },
      ],
    });

    expect(games).toHaveLength(1);
    expect(games[0]?.state).toBe("live");
    expect(games[0]?.home.isIU).toBe(true);
    expect(games[0]?.home.score).toBe(3);
    expect(games[0]?.away.score).toBe(1);
    expect(games[0]?.network).toBe("B1G+");
    expect(games[0]?.home.conferenceSeo).toBe("big-ten");
  });
});
