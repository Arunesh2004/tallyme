"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  FileCheck2, 
  GraduationCap, 
  Activity, 
  ArrowRightLeft, 
  ShieldCheck, 
  Settings,
  LineChart,
  Split,
  PlayCircle,
  UploadCloud
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload/vendor", label: "Upload Vendor Slip", icon: UploadCloud },
  { href: "/review/vendor", label: "Vendor Review", icon: FileCheck2 },
  { href: "/review/student", label: "Student Review", icon: GraduationCap },
  { href: "/erp/status", label: "ERP Monitoring", icon: Activity },
  { href: "/tally/migrations", label: "Migrations", icon: ArrowRightLeft },
  { href: "/system/health", label: "System Health", icon: Activity },
  { href: "/audit/events", label: "Audit Center", icon: ShieldCheck },
  { href: "/admin/config", label: "Configuration", icon: Settings },
  { href: "/vmms/analytics", label: "VMMS Analytics", icon: LineChart },
  { href: "/vmms/mismatches", label: "VMMS Mismatches", icon: Split },
  { href: "/vmms/replay", label: "VMMS Replay", icon: PlayCircle },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-card border-r border-border hidden md:flex flex-col h-full z-20">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <span className="font-bold text-xl text-primary">TallyMe</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link 
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  pathname === item.href 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
