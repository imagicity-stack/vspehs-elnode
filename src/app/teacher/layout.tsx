"use client";

import { PortalShell, NavItem } from "@/components/PortalShell";
import { TeacherProvider } from "./teacher-context";
import {
  LayoutDashboard, CalendarCheck, Users, Camera, BookOpen, ClipboardCheck, Star, CalendarOff,
} from "lucide-react";

const nav: NavItem[] = [
  { href: "/teacher", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teacher/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/teacher/students", label: "My Students", icon: Users },
  { href: "/teacher/updates", label: "Daily Updates", icon: Camera },
  { href: "/teacher/homework", label: "Homework", icon: BookOpen },
  { href: "/teacher/exams", label: "Assessments", icon: Star },
  { href: "/teacher/tasks", label: "Task Checklist", icon: ClipboardCheck },
  { href: "/teacher/leave", label: "Leave", icon: CalendarOff },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <TeacherProvider>
      <PortalShell role="teacher" nav={nav}>
        {children}
      </PortalShell>
    </TeacherProvider>
  );
}
