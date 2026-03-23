import { useNewsArticles } from "@/hooks/use-supabase";
import { useNewsLastUpdated } from "@/hooks/use-last-updated";
import LastUpdated from "@/components/LastUpdated";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ExternalLink } from "lucide-react";
import { track } from "@vercel/analytics";
import type { NewsArticle } from "@/lib/supabase";

function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <a
      href={article.url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
      onClick={() => track('News Click', { title: article.title, source: article.source || 'unknown' })}
      data-testid={`news-article-${article.id}`}
    >
      <Card className="overflow-hidden border border-card-border hover-elevate transition-colors">
        {article.image_url && (
          <div className="h-40 bg-muted overflow-hidden">
            <img
              src={article.image_url}
              alt={article.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).parentElement!.style.display = "none";
              }}
            />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            {article.category && (
              <Badge variant="secondary" className="text-[10px]">
                {article.category}
              </Badge>
            )}
            {article.source && (
              <span className="text-xs text-muted-foreground font-medium">{article.source}</span>
            )}
          </div>
          <h3 className="font-bold text-sm line-clamp-2 mb-1">{article.title}</h3>
          {article.summary && (
            <p className="text-xs text-muted-foreground line-clamp-3 mb-2">{article.summary}</p>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {article.published_date && (
              <span>{format(new Date(article.published_date), "MMM d, yyyy")}</span>
            )}
            <span className="text-primary flex items-center gap-1 font-medium">
              Read More <ExternalLink className="w-3 h-3" />
            </span>
          </div>
        </div>
      </Card>
    </a>
  );
}

const socialLinks = [
  {
    name: "Instagram",
    handle: "@indianasb",
    url: "https://www.instagram.com/indianasb/",
    color: "from-purple-500 to-pink-500",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    name: "X",
    handle: "@IndianaSB",
    url: "https://x.com/IndianaSB",
    color: "from-gray-700 to-gray-900 dark:from-gray-300 dark:to-gray-100",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: "TikTok",
    handle: "@indianasoftball",
    url: "https://www.tiktok.com/@indianasoftball",
    color: "from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48v-7.1a8.16 8.16 0 005.58 2.2V11.3a4.85 4.85 0 01-3.58-1.59V6.69h3.58z" />
      </svg>
    ),
  },
];

function FollowSection() {
  return (
    <div data-testid="follow-section">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
        Follow IU Softball
      </h2>
      <div className="grid grid-cols-3 gap-2.5">
        {socialLinks.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("Social Follow Click", { platform: link.name })}
            data-testid={`follow-${link.name.toLowerCase()}`}
          >
            <Card className="p-3.5 border border-card-border hover-elevate transition-colors flex flex-col items-center gap-2 cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground">
                {link.icon}
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold leading-tight">{link.name}</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  {link.handle}
                </p>
              </div>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}

function NewsSkeletons() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-32" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-48 rounded-xl" />
      ))}
    </div>
  );
}

export default function NewsPage() {
  const { data: articles, isLoading } = useNewsArticles();
  const { data: newsUpdatedAt, isLoading: tsLoading } = useNewsLastUpdated();

  if (isLoading) return <NewsSkeletons />;

  return (
    <div className="space-y-6" data-testid="news-page">
      <div>
        <h1 className="text-lg font-bold">News</h1>
        <LastUpdated timestamp={newsUpdatedAt} isLoading={tsLoading} />
      </div>

      <div className="space-y-3">
        {articles && articles.length > 0 ? (
          articles.map((article) => (
            <NewsCard key={article.id} article={article} />
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No news articles yet.</p>
          </div>
        )}
      </div>

      <FollowSection />
    </div>
  );
}
