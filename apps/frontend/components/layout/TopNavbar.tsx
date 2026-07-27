import Link from "next/link";
import { Bell, User, Building } from "lucide-react";
import { useAuthStore } from "@/store/auth";

export function TopNavbar() {
  const roles = useAuthStore(state => state.roles);

  return (
    <div className="h-16 border-b bg-card flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Building className="h-4 w-4 text-muted-foreground" />
        <span>ABC School Pvt Ltd</span>
        <span className="px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground ml-2">Production</span>
      </div>

      <div className="flex items-center gap-4">
        <Link href="/notifications" className="relative p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full"></span>
        </Link>
        
        <div className="flex items-center gap-2 ml-2 pl-4 border-l">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <User className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium leading-none">Admin User</span>
            <span className="text-xs text-muted-foreground mt-1 uppercase">{roles[0] || "VIEW_ONLY"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
