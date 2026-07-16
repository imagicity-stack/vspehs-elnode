"use client";

import { PortalShell, NavItem } from "@/components/PortalShell";
import {
  LayoutDashboard, FileText, Receipt, Wallet, BadgePercent, BarChart3, Users,
} from "lucide-react";

const nav: NavItem[] = [
  { href: "/accountant", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accountant/students", label: "Students", icon: Users },
  { href: "/accountant/invoices", label: "Invoices", icon: FileText },
  { href: "/accountant/payments", label: "Payments", icon: Receipt },
  { href: "/accountant/fees", label: "Fee Structure", icon: Wallet },
  { href: "/accountant/concessions", label: "Concessions", icon: BadgePercent },
  { href: "/accountant/reports", label: "Pending Report", icon: BarChart3 },
];

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell role="accountant" nav={nav} alsoAllow={["superadmin"]}>
      {children}
    </PortalShell>
  );
}
