"use client";

import { PortalShell, NavItem } from "@/components/PortalShell";
import {
  LayoutDashboard, BarChart3, Users, GraduationCap, School, Megaphone, Settings, Wallet, BookOpen, Receipt,
} from "lucide-react";

const nav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/staff", label: "Staff", icon: GraduationCap },
  { href: "/admin/classes", label: "Classes", icon: School },
  { href: "/admin/subjects", label: "Subjects", icon: BookOpen },
  { href: "/admin/fee-heads", label: "Fee Heads", icon: Receipt },
  { href: "/admin/fees", label: "Finance", icon: Wallet },
  { href: "/admin/circulars", label: "Circulars", icon: Megaphone },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell role="superadmin" nav={nav}>
      {children}
    </PortalShell>
  );
}
