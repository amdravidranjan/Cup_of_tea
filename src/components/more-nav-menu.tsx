import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  href: string;
  label: string;
}

/** Secondary/administrative nav destinations, grouped under one "More"
 * trigger rather than as individual header buttons — with up to 4
 * permission-gated buttons already in the header before this, adding
 * these directly would push well past the ~5-7 items people can hold
 * in the header at a glance (Miller's law), and they're used far less
 * often than Dashboard/Field/Grievances, so they don't need to compete
 * for the same visual weight (law of proximity: group by how related
 * and how frequently-used they are, not just list everything flat). */
export function MoreNavMenu({ items }: { items: NavItem[] }) {
  if (items.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">More ▾</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>More</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link href={item.href}>{item.label}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
