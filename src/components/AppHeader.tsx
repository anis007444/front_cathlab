import { useNavigate } from "react-router-dom";
import { Heart, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";

export default function AppHeader() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role?.toLowerCase();
  const isMedecin = role === "medecin" || role === "médecin";
  const isPharmacien = role === "pharmacien";
  const isAdmin = role === "admin";
  const isSecretaire = role === "secretaire";
  const homeRoute = isPharmacien
    ? "/pharmacie-dashboard"
    : isMedecin
    ? "/dashboard"
    : isAdmin
    ? "/admin"
    : isSecretaire
    ? "/secretary"
    : "/dashboard";

  return (
    <header className="border-b border-border bg-card px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate(homeRoute)}>
        <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
          <Heart size={16} className="text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-foreground leading-tight">CathLab Intervention</h1>
          <p className="text-xs text-muted-foreground">Workflow System</p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center gap-2 flex-wrap">
        {isMedecin && (
          <>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-foreground ring-1 ring-border transition hover:bg-accent hover:text-accent-foreground"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => navigate("/examens")}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-foreground ring-1 ring-border transition hover:bg-accent hover:text-accent-foreground"
            >
              Study
            </button>
          </>
        )}

        {isPharmacien && (
          <>
            <button
              type="button"
              onClick={() => navigate("/pharmacie-dashboard")}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-foreground ring-1 ring-border transition hover:bg-accent hover:text-accent-foreground"
            >
              Pharmacy Dashboard
            </button>
            <button
              type="button"
              onClick={() => navigate("/pharmacie")}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-foreground ring-1 ring-border transition hover:bg-accent hover:text-accent-foreground"
            >
              Gérer ressources
            </button>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-secondary transition-colors text-sm"
          >
            <User size={16} className="text-muted-foreground" />
            <span className="text-foreground font-medium hidden sm:inline">{user.name}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-primary/10 text-primary">
              {user.role}
            </span>
          </button>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
