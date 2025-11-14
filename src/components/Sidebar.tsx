import { Home, Package, ClipboardList, Settings, Shield, Users, FileCheck } from "lucide-react";
import { NavLink } from "./NavLink";
import { cn } from "@/lib/utils";
import logo from "@/assets/leorit-logo.png";

interface SidebarProps {
  userRole: "buyer" | "manufacturer" | "admin";
}

const Sidebar = ({ userRole }: SidebarProps) => {
  const buyerLinks = [
    { to: "/buyer/dashboard", icon: Home, label: "Dashboard" },
    { to: "/buyer/start-order", icon: Package, label: "Start Order" },
    { to: "/buyer/orders", icon: ClipboardList, label: "Order Tracking" },
    { to: "/buyer/profile", icon: Settings, label: "Profile" },
  ];

  const manufacturerLinks = [
    { to: "/manufacturer/dashboard", icon: Home, label: "Dashboard" },
    { to: "/manufacturer/orders", icon: Package, label: "Orders" },
    { to: "/manufacturer/qc", icon: FileCheck, label: "Upload QC" },
    { to: "/manufacturer/profile", icon: Settings, label: "Profile" },
  ];

  const adminLinks = [
    { to: "/admin/dashboard", icon: Home, label: "Dashboard" },
    { to: "/admin/verification", icon: Shield, label: "Verification" },
    { to: "/admin/disputes", icon: Users, label: "Disputes" },
  ];

  const links = userRole === "buyer" ? buyerLinks : userRole === "manufacturer" ? manufacturerLinks : adminLinks;

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Leorit.ai" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="text-sidebar-foreground font-bold text-xl">Leorit.ai</h1>
            <p className="text-sidebar-foreground/60 text-xs capitalize">{userRole}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent transition-all"
            activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
          >
            <link.icon className="w-5 h-5" />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <button className="w-full px-4 py-3 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg transition-all text-left">
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
