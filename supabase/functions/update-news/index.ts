import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://iuhoosiers.com";

// Build regex patterns using new RegExp() with string concatenation to avoid
// literal closing-tag sequences that break the Supabase Dashboard editor
const RE_TABLE_ROW = new RegExp(
  "<tr[^>]*s-table-body__row[^>]*>[\\s\\S]*?<" + "/tr>",
  "g"
);
const RE_DATE_SPAN = new RegExp(
  '<span[^>]*class="block text-center"[^>]*>([\\s\\S]*?)<' + "/span>"
);
const RE_BR_TAG = new RegExp("<br[^>]*>", "g");
const RE_HEADLINE_LINK = new RegExp(
  '<a[^>]*href="(' + "/news/[^\"]+)\"[^>]*>[\\s\\S]*?<span[^>]*>([\\s\\S]*?)<" + "/span>"
);
const RE_HTML_TAG = new RegExp("<[^>]+>", "g");
const RE_OG_IMAGE = new RegExp(
  '<meta[^>]*property="og:image"[^>]*content="([^"]+)"'
);
const RE_OG_DESC = new RegExp(
  '<meta[^>]*property="og:description"[^>]*content="([^"]+)"'
);
const RE_ARTICLE_BODY = new RegExp(
  'class="prose story-page__content__body[^"]*"[^>]*>([\\s\\S]*?)<' + "/div>"
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startedAt = new Date().toISOString();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Get existing article URLs so we don't re-fetch ones we already have
    const { data: existingArticles, error: fetchError } = await supabase
      .from("news_articles")
      .select("url");

    if (fetchError) throw new Error(`DB fetch failed: ${fetchError.message}`);
    const existingUrls = new Set(
      (existingArticles || []).map((a) => a.url)
    );

    // 2. Fetch the archives page
    const res = await fetch(
      `${BASE_URL}/sports/softball/archives`,
      { headers: { "User-Agent": "IUSoftballFanHub/1.0" } }
    );
    if (!res.ok) throw new Error(`Archives fetch failed: ${res.status}`);
    const html = await res.text();

    // 3. Parse article entries from the archives table
    const articles = parseArchivesList(html);
    console.log(`Found ${articles.length} articles on archives page`);

    // 4. Filter to only new articles
    const newArticles = articles.filter((a) => !existingUrls.has(a.url));
    console.log(`${newArticles.length} new articles to process`);

    if (newArticles.length === 0) {
      await supabase.from("data_source_runs").insert({
        source: "update-news",
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        status: "success",
        rows_parsed: articles.length,
        rows_written: 0,
        error_summary: null,
      });
      return jsonResponse({
        message: "No new articles found",
        status: "success",
        total_on_page: articles.length,
        already_in_db: existingUrls.size,
        added: 0,
      });
    }

    // 5. For each new article (limit to 10 to avoid timeout), fetch full details
    const toProcess = newArticles.slice(0, 10);
    const added: string[] = [];
    const failed: string[] = [];

    for (const article of toProcess) {
      try {
        const details = await fetchArticleDetails(article.url);

        // Generate a unique ID based on the URL slug
        const slug = article.url.split("/").pop() || "";
        const id = `news-${slug}`.substring(0, 100);

        const record = {
          id,
          title: article.title,
          summary: details.summary || "",
          source: "IU Athletics",
          url: article.url,
          image_url: details.imageUrl,
          published_date: article.date,
          category: "Softball",
          created_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("news_articles")
          .upsert(record, { onConflict: "id" });

        if (error) {
          console.error(`Insert failed for ${article.title}: ${error.message}`);
          failed.push(article.title);
        } else {
          added.push(article.title);
          console.log(`Added article: ${article.title}`);
        }
      } catch (e) {
        console.error(`Failed to process ${article.url}: ${e}`);
        failed.push(article.title);
      }
    }

    let runStatus: "success" | "partial" | "failure" = "success";
    if (failed.length > 0 && added.length === 0) runStatus = "failure";
    else if (failed.length > 0) runStatus = "partial";

    await supabase.from("data_source_runs").insert({
      source: "update-news",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: runStatus,
      rows_parsed: toProcess.length,
      rows_written: added.length,
      error_summary: failed.length ? failed.slice(0, 10).join("; ") : null,
    });

    return new Response(
      JSON.stringify(
        {
          message: "News update complete",
          status: runStatus,
          total_on_page: articles.length,
          new_found: newArticles.length,
          processed: toProcess.length,
          added: added.length,
          failed: failed.length,
          articles_added: added,
          articles_failed: failed,
          checkedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      {
        status: runStatus === "failure" ? 500 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error:", error);
    await supabase.from("data_source_runs").insert({
      source: "update-news",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      status: "failure",
      rows_parsed: 0,
      rows_written: 0,
      error_summary: (error as Error).message,
    });
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

interface ArchiveEntry {
  title: string;
  url: string;
  date: string;
}

/**
 * Parse the archives list page to extract article titles, URLs, and dates.
 * Each article is a table row with: date | headline link | category
 */
function parseArchivesList(html: string): ArchiveEntry[] {
  const entries: ArchiveEntry[] = [];

  const rowMatches = html.match(RE_TABLE_ROW);
  if (!rowMatches) return entries;

  for (const rowHtml of rowMatches) {
    // Extract date from first td span
    const dateMatch = rowHtml.match(RE_DATE_SPAN);
    if (!dateMatch) continue;

    // Date format: "March<br> 18, 2026"
    const rawDate = dateMatch[1]
      .replace(RE_BR_TAG, " ")
      .replace(/\s+/g, " ")
      .trim();

    const parsedDate = parseDate(rawDate);
    if (!parsedDate) continue;

    // Extract headline link
    const linkMatch = rowHtml.match(RE_HEADLINE_LINK);
    if (!linkMatch) continue;

    const url = `${BASE_URL}${linkMatch[1]}`;
    const title = linkMatch[2]
      .replace(RE_HTML_TAG, "")
      .replace(/\s+/g, " ")
      .trim();

    if (title && url) {
      entries.push({ title, url, date: parsedDate });
    }
  }

  return entries;
}

/**
 * Fetch a full article page and extract the summary and hero image.
 */
async function fetchArticleDetails(
  url: string
): Promise<{ summary: string | null; imageUrl: string | null }> {
  const res = await fetch(url, {
    headers: { "User-Agent": "IUSoftballFanHub/1.0" },
  });
  if (!res.ok) {
    console.error(`Article fetch failed for ${url}: ${res.status}`);
    return { summary: null, imageUrl: null };
  }
  const html = await res.text();

  // Extract og:image meta tag for hero image
  let imageUrl: string | null = null;
  const ogImageMatch = html.match(RE_OG_IMAGE);
  if (ogImageMatch) {
    imageUrl = ogImageMatch[1];
  }

  // Extract og:description for summary
  let summary: string | null = null;
  const ogDescMatch = html.match(RE_OG_DESC);
  if (ogDescMatch) {
    summary = ogDescMatch[1]
      .replace(/&amp;/g, "&")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .trim();
  }

  // If no og:description, try the article body first paragraph
  if (!summary) {
    const bodyMatch = html.match(RE_ARTICLE_BODY);
    if (bodyMatch) {
      const bodyText = bodyMatch[1]
        .replace(RE_HTML_TAG, " ")
        .replace(/\s+/g, " ")
        .trim();
      summary = bodyText.substring(0, 300);
      if (bodyText.length > 300) summary += "...";
    }
  }

  return { summary, imageUrl };
}

/**
 * Parse date strings like "March 18, 2026" into ISO date strings.
 */
function parseDate(dateStr: string): string | null {
  const months: Record<string, number> = {
    January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
    July: 6, August: 7, September: 8, October: 9, November: 10, December: 11,
  };

  const match = dateStr.match(
    new RegExp("(\\w+)\\s+(\\d{1,2}),?\\s+(\\d{4})")
  );
  if (!match) return null;

  const month = months[match[1]];
  if (month === undefined) return null;
  const day = parseInt(match[2]);
  const year = parseInt(match[3]);

  const d = new Date(Date.UTC(year, month, day, 12, 0, 0));
  return d.toISOString();
}

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}