"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";

export interface AppNavItem {
  href: string;
  label: string;
  icon: string;
}

/**
 * The console's main navigation bar.
 *
 * Uses the public portal's own `.main-nav` / `.nav-item` / `.dropdown-panel`
 * classes rather than a parallel set of Tailwind utilities, so the signed-in
 * nav is the same bar as the landing page's — same height, same blue, same
 * saffron hover, same dropdown treatment — and stays in sync automatically if
 * the portal styling is ever retuned.
 */
export function AppNav({
  primary,
  moreItems,
}: {
  primary: AppNavItem[];
  moreItems: AppNavItem[];
}) {
  const pathname = usePathname();

  // "/app" would otherwise prefix-match every console route, so the dashboard
  // is compared exactly while section routes match their subtree.
  function isActive(href: string): boolean {
    if (href === "/app") return pathname === "/app";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const moreActive = moreItems.some((i) => isActive(i.href));

  return (
    <nav className="main-nav" role="navigation" aria-label="Console navigation">
      <div className="nav-inner">
        {primary.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${isActive(item.href) ? "active" : ""}`}
            aria-current={isActive(item.href) ? "page" : undefined}
          >
            <Icon icon={item.icon} width={15} />
            {item.label}
          </Link>
        ))}

        {moreItems.length > 0 && (
          <div
            className={`nav-item ${moreActive ? "active" : ""}`}
            style={{ position: "relative" }}
          >
            <Icon icon="mdi:dots-horizontal" width={15} />
            More
            <Icon icon="mdi:chevron-down" width={14} />
            <div className="dropdown-panel">
              {moreItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Icon icon={item.icon} width={13} color="#e56b00" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        <Link href="/" className="nav-item" style={{ marginLeft: "auto" }}>
          <Icon icon="mdi:open-in-new" width={15} />
          Public Portal
        </Link>
      </div>
    </nav>
  );
}
