import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Lock, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedEmail = sessionStorage.getItem("cathlab-pending-email") || "";
    if (!storedEmail) {
      navigate("/login", { replace: true });
      return;
    }
    setEmail(storedEmail);
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Adresse e-mail introuvable.");
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Tous les champs sont obligatoires.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Le nouveau mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("La confirmation du mot de passe ne correspond pas.");
      return;
    }

    setLoading(true);
    try {
      await axios.post("http://localhost:5106/api/Account/change-password", {
        email,
        currentPassword,
        newPassword,
      });

      sessionStorage.removeItem("cathlab-pending-email");
      sessionStorage.removeItem("cathlab-must-change-password");
      toast.success("Mot de passe modifié avec succès.");
      navigate("/login", { replace: true });
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.response?.data || "Erreur lors du changement de mot de passe.";
      setError(typeof message === "string" ? message : "Erreur lors du changement de mot de passe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Lock size={24} />
          </div>
          <h1 className="text-2xl font-semibold">Premier changement de mot de passe</h1>
          <p className="text-sm text-muted-foreground">
            Pour votre première connexion, veuillez définir un nouveau mot de passe.
          </p>
        </div>

        <div className="clinical-card space-y-5">
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="clinical-label">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} disabled className="clinical-input" />
            </div>
            <div>
              <label className="clinical-label">Mot de passe actuel</label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="clinical-input" />
            </div>
            <div>
              <label className="clinical-label">Nouveau mot de passe</label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="clinical-input" />
            </div>
            <div>
              <label className="clinical-label">Confirmer le nouveau mot de passe</label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="clinical-input" />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Enregistrement..." : "Valider"}
            </Button>
          </form>

          <Button variant="outline" className="w-full" onClick={() => navigate("/login", { replace: true })}>
            <ArrowLeft size={16} className="mr-2" />
            Retour à la connexion
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
