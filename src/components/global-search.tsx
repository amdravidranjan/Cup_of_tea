"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";

interface SearchResults {
  projects: { id: string; name: string; state: string; district: string; stage: string }[];
  parcels: { id: string; projectId: string; projectName: string; village: string }[];
  families: { id: string; projectId: string; projectName: string; headOfHouseholdName: string }[];
}

const EMPTY: SearchResults = { projects: [], parcels: [], families: [] };

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length === 0) {
      setResults(EMPTY);
      return;
    }
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) setResults(await res.json());
    }, 200);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const totalResults = results.projects.length + results.parcels.length + results.families.length;
  const showDropdown = open && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative w-56">
      <Input
        placeholder="Search projects, parcels, families…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        className="h-8 bg-background text-foreground"
      />
      {showDropdown && (
        <div className="absolute right-0 top-full z-20 mt-1 max-h-96 w-80 overflow-y-auto rounded-lg border bg-popover p-2 text-popover-foreground shadow-md">
          {totalResults === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">No matches for &ldquo;{query}&rdquo;.</p>
          ) : (
            <>
              {results.projects.length > 0 && (
                <div className="mb-2">
                  <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Projects
                  </p>
                  {results.projects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/app/projects/${p.id}`}
                      className="block rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                      onClick={() => setOpen(false)}
                    >
                      <span className="font-medium">{p.name}</span>{" "}
                      <span className="text-muted-foreground">
                        — {p.district}, {p.state}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              {results.parcels.length > 0 && (
                <div className="mb-2">
                  <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Parcels
                  </p>
                  {results.parcels.map((p) => (
                    <Link
                      key={p.id}
                      href={`/app/projects/${p.projectId}`}
                      className="block rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                      onClick={() => setOpen(false)}
                    >
                      <span className="font-medium">{p.village}</span>{" "}
                      <span className="text-muted-foreground">— {p.projectName}</span>
                    </Link>
                  ))}
                </div>
              )}
              {results.families.length > 0 && (
                <div>
                  <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Families
                  </p>
                  {results.families.map((f) => (
                    <Link
                      key={f.id}
                      href={`/app/projects/${f.projectId}`}
                      className="block rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                      onClick={() => setOpen(false)}
                    >
                      <span className="font-medium">{f.headOfHouseholdName}</span>{" "}
                      <span className="text-muted-foreground">— {f.projectName}</span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
