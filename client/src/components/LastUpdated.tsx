import { format, isToday, isYesterday } from "date-fns";
import { RefreshCw } from "lucide-react";

interface LastUpdatedProps {
  timestamp: string | null | undefined;
  isLoading?: boolean;
  className?: string;
}

/**
 * Subtle "Updated: Mar 22 at 2:30 PM" badge for data-connected sections.
 * Shows "Today at 2:30 PM", "Yesterday at 2:30 PM", or "Mar 22 at 2:30 PM".
 */
export default function LastUpdated({
  timestamp,
  isLoading,
  className = "",
}: LastUpdatedProps) {
  if (isLoading || !timestamp) return null;

  const date = new Date(timestamp);

  let dateStr: string;
  if (isToday(date)) {
    dateStr = `Today at ${format(date, "h:mm a")}`;
  } else if (isYesterday(date)) {
    dateStr = `Yesterday at ${format(date, "h:mm a")}`;
  } else {
    dateStr = format(date, "MMM d 'at' h:mm a");
  }

  return (
    <div
      className={`flex items-center gap-1.5 text-[11px] text-muted-foreground/70 ${className}`}
      data-testid="last-updated"
    >
      <RefreshCw className="w-3 h-3" />
      <span>Updated {dateStr}</span>
    </div>
  );
}
