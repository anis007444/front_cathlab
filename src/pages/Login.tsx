import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, LogIn, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import ThemeToggle from "@/components/ThemeToggle";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const success = await login(email, password);
    setLoading(false);
    if (success) {
      const savedUser = localStorage.getItem("cathlab-user");
      const role = savedUser ? String(JSON.parse(savedUser)?.role ?? "").trim().toLowerCase() : undefined;

      switch (role) {
        case "admin":
          navigate("/admin", { replace: true });
          break;
        case "medecin":
        case "médecin":
          navigate("/dashboard", { replace: true });
          break;
        case "pharmacien":
          navigate("/pharmacie-dashboard", { replace: true });
          break;
        case "secretaire":
          navigate("/secretary", { replace: true });
          break;
        default:
          navigate("/dashboard", { replace: true });
      }
    } else {
      setError("Email ou mot de passe incorrect");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto shadow-lg">
              <Heart size={28} className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">CathLab Intervention</h1>
              <p className="text-muted-foreground text-sm mt-1">Système de workflow cardiologique</p>
            </div>
          </div>

          {/* Login form */}
          <div className="clinical-card space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-foreground">Connexion</h2>
              <p className="text-sm text-muted-foreground mt-1">Identifiez-vous pour accéder au système</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <span className="clinical-label">Email</span>
                <Input
                  type="email"
                  placeholder="votre@email.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="clinical-input"
                  required
                />
              </div>
              <div>
                <span className="clinical-label">Mot de passe</span>
                <div className="relative">
                  <Input
                    type={passwordVisible ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="clinical-input pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible(!passwordVisible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                    aria-label={passwordVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {passwordVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="clinical-btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <LogIn size={18} />
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
