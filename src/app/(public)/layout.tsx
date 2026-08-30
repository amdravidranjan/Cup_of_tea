import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-brand bg-primary px-6 py-4 text-primary-foreground">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-primary-foreground/60 uppercase">
              Public Transparency Portal
            </p>
            <h1 className="font-heading text-lg font-semibold">
              National Land Acquisition &amp; Management System
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/track">Track a Grievance</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/app">Government Login →</Link>
            </Button>
          </div>
        </div>
      </header>
      <div className="border-b bg-secondary/60 px-6 py-8">
        <p className="font-heading max-w-2xl text-xl leading-snug text-foreground">
          Every notified land acquisition project, its statutory notices, and its
          compensation record — open to the public it affects.
        </p>
      </div>
      <main className="p-6">{children}</main>
    </div>
  );
}
