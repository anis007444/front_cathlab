import axios from "axios";
import { useEffect, useState } from "react";
import {
  Pill,
  Package,
  AlertTriangle,
  CalendarClock,
  Clock,
  Stethoscope,
  Boxes,
} from "lucide-react";

import AppHeader from "@/components/AppHeader";
import { cn } from "@/lib/utils";

interface PharmacyDashboardResponse {
  totalMateriels: number;
  totalMedicaments: number;
  materielsCritiques: number;
  medicamentsCritiques: number;
  materielsUtilisesAujourdhui: number;
  medicamentsUtilisesAujourdhui: number;
  topMaterielUtilise: string | null;
  topMedicamentUtilise: string | null;
}

const PharmacyDashboard = () => {
  const [dashboard, setDashboard] = useState<PharmacyDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await axios.get<PharmacyDashboardResponse>(
          "http://localhost:5106/api/PharmacyDashboard"
        );
        setDashboard(response.data);
      } catch (err: any) {
        console.error("Erreur chargement PharmacyDashboard", err);
        setError("Impossible de charger les données de la pharmacie.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const stats = [
    {
      label: "Total Médicaments",
      value: dashboard?.totalMedicaments ?? 0,
      icon: Pill,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Total Matériel",
      value: dashboard?.totalMateriels ?? 0,
      icon: Pill,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Médicaments en rupture de stock",
      value: dashboard?.medicamentsCritiques ?? 0,
      icon: AlertTriangle,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      label: "Matériel en rupture de stock",
      value: dashboard?.materielsCritiques ?? 0,
      icon: Clock,
      color: "text-warning",
      bg: "bg-warning/10",
    },
  ];

  const todayStats = [
    {
      label: "Médicaments utilisés aujourd'hui",
      value: dashboard?.medicamentsUtilisesAujourdhui ?? 0,
      icon: Pill,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Matériel utilisé aujourd'hui",
      value: dashboard?.materielsUtilisesAujourdhui ?? 0,
      icon: Boxes,
      color: "text-success",
      bg: "bg-success/10",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="space-y-6 animate-fade-in px-4 py-6 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-success/5" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {now.toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1">
                Dashboard <span className="text-primary">pharmacie</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-1.5">
                <Clock size={14} /> {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · Gestion médicaments & matériel
              </p>
            </div>
            <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-card border border-border shadow-sm">
              <Boxes className="text-primary animate-heartbeat" size={28} />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Vue d’ensemble</p>
                <p className="text-xl font-bold text-foreground">
                  {dashboard ? dashboard.totalMateriels + dashboard.totalMedicaments : "--"}
                  <span className="text-xs font-normal text-muted-foreground"> éléments</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="group relative rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", s.bg)}>
                  <Icon size={20} className={s.color} />
                </div>
                <p className="text-3xl font-bold text-foreground mt-4">
                  {isLoading ? "--" : s.value.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            );
          })}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Package size={18} className="text-foreground" />
              <h2 className="text-base font-semibold text-foreground">Utilisation aujourd'hui</h2>
            </div>
            <div className="grid gap-3">
              {todayStats.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/50 p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", item.bg)}>
                        <Icon size={18} className={item.color} />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{item.label}</p>
                        <p className="text-lg font-semibold text-foreground">{isLoading ? "--" : item.value}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Stethoscope size={18} className="text-foreground" />
              <h2 className="text-base font-semibold text-foreground">Meilleurs usages</h2>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground">Médicament le plus utilisé</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {isLoading ? "--" : dashboard?.topMedicamentUtilise ?? "Aucun"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground">Matériel le plus utilisé</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {isLoading ? "--" : dashboard?.topMaterielUtilise ?? "Aucun"}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PharmacyDashboard;
