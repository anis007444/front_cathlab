import { useNavigate } from "react-router-dom";
import { User, Shield, LogOut, X, Stethoscope, Syringe, Pill, ClipboardList } from "lucide-react";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import { Heart } from "lucide-react";

const ROLE_CONFIG: Record<UserRole, { label: string; icon: React.ReactNode; color: string }> = {
  admin: {
    label: "Administrateur",
    icon: <Shield size={18} />,
    color: "bg-destructive/10 text-destructive",
  },
  medecin: {
    label: "Médecin",
    icon: <Stethoscope size={18} />,
    color: "bg-primary/10 text-primary",
  },
  infirmier: {
    label: "Infirmier(e)",
    icon: <Syringe size={18} />,
    color: "bg-accent text-accent-foreground",
  },
  pharmacien: {
    label: "Pharmacien",
    icon: <Pill size={18} />,
    color: "bg-orange-500/10 text-orange-500",
  },
  secretaire: {
    label: "Secrétaire",
    icon: <ClipboardList size={18} />,
    color: "bg-secondary/10 text-secondary",
  },
};

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate("/login");
    return null;
  }

  const roleConfig = ROLE_CONFIG[user.role] ?? {
    label: "Utilisateur",
    icon: <User size={18} />,
    color: "bg-muted/10 text-foreground",
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <Heart size={16} className="text-primary-foreground" />
          </div>
          <h1 className="text-sm font-bold text-foreground">Mon Profil</h1>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="max-w-lg mx-auto space-y-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
          >
            <X size={16} /> Fermer
          </button>

          {/* Avatar & Name */}
          <div className="clinical-card flex flex-col items-center text-center space-y-4 py-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <User size={36} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{user.name}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold ${roleConfig.color}`}>
              {roleConfig.icon}
              {roleConfig.label}
            </span>
          </div>

          {/* Info */}
          <div className="clinical-card space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Informations du compte</h3>
            <div className="space-y-3">
              
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm text-foreground">{user.email}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Rôle</span>
                <span className="text-sm text-foreground">{roleConfig.label}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">Statut</span>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--success))]">
                  <span className="w-2 h-2 rounded-full bg-[hsl(var(--success))]" />
                  Actif
                </span>
              </div>
            </div>
          </div>

          

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="clinical-btn w-full flex items-center justify-center gap-2 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
          >
            <LogOut size={18} /> Se déconnecter
          </button>
        </div>
      </main>
    </div>
  );
};

export default Profile;
