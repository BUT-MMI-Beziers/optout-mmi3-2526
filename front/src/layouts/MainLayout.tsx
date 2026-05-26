import { Outlet, Link, useLocation, useNavigate } from "react-router-dom"
import { useEffect, useState, type ReactNode } from "react"
import {
  LayoutDashboard,
  FileText,
  Clock,
  Database,
  Bell,
  Mail,
  User,
  Download,
  ShieldCheck,
  Settings,
  ChevronDown,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { getMe, getNotifications } from "@/lib/api"
import type { User as UserType } from "@/lib/mock-data"
import GlobalSearch from "@/components/GlobalSearch"

const navItems = [
  { label: "Tableau de bord", icon: LayoutDashboard, to: "/dashboard" },
  { label: "Mes demandes", icon: FileText, to: "/requests" },
  { label: "Relances programmées", icon: Clock, to: "/reminders" },
  { label: "Registre des brokers", icon: Database, to: "/brokers" },
  { label: "Notifications", icon: Bell, to: "/notifications" },
  { label: "Templates d'emails", icon: Mail, to: "/templates" },
]

const bottomNavItems = [
  { label: "Mon profil", icon: User, to: "/profile" },
  { label: "Export de données", icon: Download, to: "/export" },
  { label: "Administration", icon: ShieldCheck, to: "/admin/brokers" },
  { label: "Paramètres", icon: Settings, to: "/settings" },
]

export default function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState<UserType | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    getMe().then(setUser)
    getNotifications().then((n) => setUnreadCount(n.filter((x) => !x.read).length))
  }, [])

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : '?'
  const displayName = user ? `${user.firstName} ${user.lastName}` : '…'

  const isActive = (to: string) =>
    location.pathname === to || (to !== "/" && location.pathname.startsWith(to + "/"))

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-[210px] shrink-0 flex flex-col border-r border-border bg-card">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-border">
          <Link to="/dashboard">
            <img src="/logo.png" alt="FLOAT" className="h-7 object-contain" />
          </Link>
        </div>

        {/* Nav principale */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} active={isActive(item.to)} />
          ))}
        </nav>

        {/* Nav bas */}
        <div className="px-2 py-3 border-t border-border space-y-0.5">
          {bottomNavItems.map((item) => (
            <NavItem key={item.to} {...item} active={isActive(item.to)} />
          ))}
        </div>
      </aside>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 shrink-0 flex items-center gap-4 px-6 border-b border-border bg-card">
          <GlobalSearch />

          <div className="flex items-center gap-3 ml-auto">
            <button
              className="relative p-2 rounded-md hover:bg-accent transition-colors"
              onClick={() => navigate("/notifications")}
            >
              <Bell className="w-5 h-5 text-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:bg-accent rounded-md px-2 py-1 transition-colors">
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className="text-xs bg-[#253550] text-white">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{displayName}</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => navigate("/profile")}>Mon profil</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")}>Paramètres</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">Déconnexion</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <PageWrapper pathname={location.pathname}>
            <Outlet />
          </PageWrapper>
        </main>
      </div>
    </div>
  )
}

function PageWrapper({ pathname, children }: { pathname: string; children: ReactNode }) {
  return (
    <div key={pathname} className="max-w-7xl mx-auto w-full page-transition">
      {children}
    </div>
  )
}

function NavItem({
  label,
  icon: Icon,
  to,
  active,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  to: string
  active: boolean
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
        active
          ? "bg-[#FC7E34] text-white font-medium"
          : "text-foreground/70 hover:bg-accent hover:text-foreground"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span>{label}</span>
    </Link>
  )
}
