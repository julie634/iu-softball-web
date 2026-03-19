import { useNewsArticles, useSocialPosts } from "@/hooks/use-supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ExternalLink, Heart, MessageCircle, Share2 } from "lucide-react";
import { track } from "@vercel/analytics";
import type { NewsArticle, SocialPost } from "@/lib/supabase";

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

function SocialCard({ post }: { post: SocialPost }) {
  return (
    <a
      href={post.post_url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
      onClick={() => track('Social Click', { author: post.author || 'unknown', platform: post.platform || 'unknown' })}
      data-testid={`social-post-${post.id}`}
    >
      <Card className="p-4 border border-card-border hover-elevate transition-colors">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-primary">
              {post.author?.charAt(0) || "@"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{post.author || "Unknown"}</p>
            <p className="text-xs text-muted-foreground truncate">{post.author_handle}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {post.platform && (
              <Badge variant="outline" className="text-[10px]">
                {post.platform}
              </Badge>
            )}
          </div>
        </div>

        <p className="text-sm text-foreground/90 mb-3 whitespace-pre-line">{post.content}</p>

        {post.media_url && (
          <div className="rounded-lg overflow-hidden bg-muted mb-3 max-h-48">
            <img
              src={post.media_url}
              alt="Post media"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).parentElement!.style.display = "none";
              }}
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {post.likes != null && (
              <span className="flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" /> {post.likes.toLocaleString()}
              </span>
            )}
            {post.comments != null && (
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5" /> {post.comments.toLocaleString()}
              </span>
            )}
            {post.shares != null && (
              <span className="flex items-center gap-1">
                <Share2 className="w-3.5 h-3.5" /> {post.shares.toLocaleString()}
              </span>
            )}
          </div>
          {post.posted_date && (
            <span className="text-xs text-muted-foreground">
              {format(new Date(post.posted_date), "MMM d")}
            </span>
          )}
        </div>
      </Card>
    </a>
  );
}

function NewsSkeletons() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-10 rounded-lg" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-48 rounded-xl" />
      ))}
    </div>
  );
}

export default function NewsPage() {
  const { data: articles, isLoading: aLoading } = useNewsArticles();
  const { data: posts, isLoading: sLoading } = useSocialPosts();

  const isLoading = aLoading || sLoading;

  if (isLoading) return <NewsSkeletons />;

  return (
    <div className="space-y-4" data-testid="news-page">
      <h1 className="text-lg font-bold">News & Social</h1>

      <Tabs defaultValue="news" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="news" onClick={() => track('News Tab', { tab: 'News' })} data-testid="tab-news">News</TabsTrigger>
          <TabsTrigger value="social" onClick={() => track('News Tab', { tab: 'Social' })} data-testid="tab-social">Social</TabsTrigger>
        </TabsList>
        <TabsContent value="news" className="mt-3">
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
        </TabsContent>
        <TabsContent value="social" className="mt-3">
          <div className="space-y-3">
            {posts && posts.length > 0 ? (
              posts.map((post) => (
                <SocialCard key={post.id} post={post} />
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">No social posts yet.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
