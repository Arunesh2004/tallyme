import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Receipt, 
  Search, 
  Users, 
  GraduationCap, 
  CheckSquare, 
  ListTodo, 
  Activity, 
  ArrowRightLeft, 
  History, 
  Clock, 
  FileText 
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Command Center", isHeader: true },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  
  { name: "Accounting", isHeader: true },
  { name: "Transactions", href: "/transactions", icon: Receipt },
  { name: "Decisions", href: "/decisions", icon: Search },
  { name: "Vendors", href: "/vendors", icon: Users },
  { name: "Students", href: "/students", icon: GraduationCap },
  
  { name: "Governance", isHeader: true },
  { name: "Approvals", href: "/approvals", icon: CheckSquare },
  { name: "Review Queue", href: "/review", icon: ListTodo },
  
  { name: "Tally Operations", isHeader: true },
  { name: "Tally Health", href: "/tally-health", icon: Activity },
  { name: "Migrations", href: "/migrations", icon: ArrowRightLeft },
  { name: "Rollbacks", href: "/rollbacks", icon: History },
  
  { name: "Audit", isHeader: true },
  { name: "Timeline", href: "/audit", icon: Clock },
  { name: "Logs", href: "/logs", icon: FileText },
];

export function EnterpriseSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 border-r bg-card h-screen overflow-y-auto">
      <div className="flex items-center h-16 px-6 font-bold text-xl tracking-tight border-b shrink-0">
        TallyMe<span className="text-primary/50 font-normal ml-1">Enterprise</span>
      </div>
      <div className="flex flex-col py-4 px-3 space-y-1">
        {navigation.map((item, idx) => {
          if (item.isHeader) {
            return (
              <div key={idx} className="pt-4 pb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {item.name}
              </div>
            );
          }

          const isActive = pathname.startsWith(item.href || "");
          const Icon = item.icon!;

          return (
            <Link
              key={item.name}
              href={item.href!}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
              {item.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
