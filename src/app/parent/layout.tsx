"use client";

import { PortalShell, NavItem } from "@/components/PortalShell";
import { ChildProvider } from "./child-context";
import {
  LayoutDashboard, User, CalendarCheck, Camera, BookOpen, Megaphone, Wallet, FileText,
} from "lucide-react";

const nav: NavItem[] = [
  { href: "/parent", label: "Dashboard", icon: LayoutDashboard },
  { href: "/parent/profile", label: "Child Profile", icon: User },
  { href: "/parent/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/parent/updates", label: "Daily Updates", icon: Camera },
  { href: "/parent/homework", label: "Homework", icon: BookOpen },
  { href: "/parent/circulars", label: "Circulars", icon: Megaphone },
  { href: "/parent/fees", label: "Fees", icon: Wallet },
  { href: "/parent/reportcard", label: "Report Card", icon: FileText },
];

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChildProvider>
      <PortalShell role="parent" nav={nav}>
        {children}
      </PortalShell>
    </ChildProvider>
  );
}
