import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="flex flex-col gap-3 border-b bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-base font-semibold">
            National Land Acquisition &amp; Management System
          </h1>
          <p className="text-sm text-muted-foreground">
            Public Portal — track land acquisition projects and statutory notices
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/app">Government Login →</Link>
        </Button>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
