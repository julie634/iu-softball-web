/** Editorial + fan-facing Fall Ball 2026 content. Slate is announced late Aug / early Sep. */

export const FALL_BALL_YEAR = 2026;

export const FALL_BALL = {
  year: FALL_BALL_YEAR,
  title: `Fall Ball ${FALL_BALL_YEAR}`,
  tagline: "Exhibition weekends that preview the 2027 Hoosiers.",
  announcementWindow: "Late August through early September",
  typicalStart: "Last weekend of September",
  typicalEnd: "Mid to late October",
  venue: "Andy Mohr Field",
  admission: "Home games have historically been free.",
  officialScheduleUrl: "https://iuhoosiers.com/sports/softball/schedule",
  newsUrl: "https://iuhoosiers.com/sports/softball",
  whatItIs:
    "Fall ball is IU's exhibition slate. Games do not count toward the official NCAA record. They are the first look at the new roster, pitching staff, and weekend rhythm before February.",
} as const;

export const FALL_BALL_PILLARS = [
  {
    id: "slate",
    title: "The slate",
    body: "IU typically plays 7–8 exhibition games across 3–4 weekends, mostly at Andy Mohr Field, with one road trip.",
  },
  {
    id: "roster",
    title: "Who's new",
    body: "Use fall weekends to introduce incoming players, position battles, and returning leaders before the spring media guide drops.",
  },
  {
    id: "how-to-go",
    title: "How to go",
    body: "Home fall games have been free. Publish parking, first-pitch times, and weather as soon as IU announces the slate.",
  },
  {
    id: "watch",
    title: "What to watch",
    body: "Pitching depth, midweek bats, and Big Ten-style weekend series habits. Treat each weekend as a preview, not a verdict.",
  },
] as const;

export const FALL_BALL_CALENDAR = [
  {
    week: "Now–early September",
    owner: "Site + social",
    items: [
      "Ship Fall Ball hub and keep the homepage out of \"season complete\" mode",
      "Watch IU Athletics for the official slate announcement",
      "Refresh roster/coaches if IU posts 2026–27 updates",
    ],
  },
  {
    week: "Announcement week",
    owner: "News + schedule",
    items: [
      "Add every fall game to Supabase with tournament_name \"Fall Ball\"",
      "Mark exhibition notes so W-L stays the official 2026 spring record",
      "Publish a \"how to attend\" card: free admission, Andy Mohr, first-pitch times",
    ],
  },
  {
    week: "Each fall weekend",
    owner: "Live + recap",
    items: [
      "Next-game countdown, weather, and stream/network if listed",
      "Same-day recap: score, notable at-bats, pitching lines (exhibition label)",
      "Pull 1–2 IU Athletics or social clips into News",
    ],
  },
  {
    week: "After the last weekend",
    owner: "Look-ahead",
    items: [
      "Fall recap: what we learned, open questions for February",
      "Point to the 2027 spring schedule when IU publishes it",
      "Park the site in offseason mode after Nov 15",
    ],
  },
] as const;

export const FALL_BALL_HISTORY = [
  {
    year: 2025,
    announced: "September 4, 2025",
    games: 8,
    weekends: 4,
    note: "Opened vs IU Indy (Sep 27); mostly Andy Mohr; road game at Kentucky.",
  },
  {
    year: 2024,
    announced: "August 30, 2024",
    games: 7,
    weekends: 3,
    note: "Opened vs Danville; 10-inning exhibitions vs Indiana State and Indiana Tech.",
  },
] as const;
