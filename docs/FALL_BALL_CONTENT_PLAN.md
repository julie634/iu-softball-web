# Fall Ball 2026 content plan

IU has not posted the 2026 fall slate yet (as of 21 Aug 2026). The last two years landed between 30 Aug and 4 Sep, with 7–8 exhibition games from late September through mid-October, mostly at Andy Mohr Field, free admission.

Exhibition games **do not** count toward the official NCAA record. The hub now treats August–November (and any game tagged `Fall Ball` / exhibition) as fall ball so the 2026 spring W-L stays clean.

## Pillars

1. **The slate** — first-pitch times, venue, weather, how to get in.
2. **Who's new** — incoming class, returners, pitching depth.
3. **How to go** — free home admission historically; parking and first pitch.
4. **What to watch** — weekend habits, not a spring verdict.

## Calendar

| Window | Publish |
| --- | --- |
| Now–early September | Fall Ball hub live. Homepage leaves “season complete.” Watch IU Athletics for the slate. |
| Announcement week | Load every fall game into `games` with `tournament_name = 'Fall Ball'`. Recap + attend card. |
| Each fall weekend | Countdown, weather, recap with an exhibition label, 1–2 news/social clips. |
| After last weekend | What we learned. Point to the 2027 spring schedule when it posts. Offseason after 15 Nov. |

## Data checklist

When IU publishes the slate:

1. Insert rows in `games` (do not reuse spring 2026 rows).
2. Set `tournament_name` to `Fall Ball` so the record math stays official.
3. Fill `venue`, `city`, `venue_lat` / `venue_lon` for Andy Mohr weather.
4. Leave `is_conference_game` false.
5. Confirm `update-news` is picking up the announcement story.

## Do not

- Mix fall scores into the official 2026 record.
- Leave the homepage on “Season complete” through October.
- Point Live at the old NCAA `2025/` Casablanca path (it 404s).
