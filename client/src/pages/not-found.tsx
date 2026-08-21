import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <Card className="p-6 border border-card-border">
      <div className="flex mb-4 gap-2 items-center">
        <AlertCircle className="h-6 w-6 text-primary" />
        <h1 className="text-lg font-bold">Page not found</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        That path is not in the hub.
      </p>
      <Link href="/" className="text-sm text-primary font-semibold hover:underline">
        Back home
      </Link>
    </Card>
  );
}
