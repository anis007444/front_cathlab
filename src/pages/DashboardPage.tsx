
import axios from "axios";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  CalendarCheck,
  AlertTriangle,
  FileText,
  TrendingUp,
  TrendingDown,
  Clock,
  Heart,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import EcgLine from "@/components/cardio/EcgLine";
import { cn } from "@/lib/utils";
import AppHeader from "@/components/AppHeader";

interface DashboardData {
  nombreTotalInterventions: number;
  interventionsCompletees: number;
  interventionsEnAttente: number;
  nombreTotalExamens: number;
  examensAujourdhui: number;
  tempsMoyenInterventionMinutes: number;
}

const DashboardPage = () => {
  const { user } = useAuth();
  const [now, setNow] = useState(new Date());

  const { data, isLoading, error } = useQuery<DashboardData, Error>({
    queryKey: ["dashboard", "medecin"],
    queryFn: async () => {
      const response = await axios.get<DashboardData>("http://localhost:5106/api/Dashboard/medecin");
      return response.data;
    },
    staleTime: 1000 * 60 * 2,
  });

  const stats = [
    {
      label: "Interventions totales",
      value: data?.nombreTotalInterventions ?? 0,
      trend: data ? 12 : 0,
      up: true,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Interventions complétées",
      value: data?.interventionsCompletees ?? 0,
      trend: data ? 8 : 0,
      up: true,
      icon: Heart,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Interventions en attente",
      value: data?.interventionsEnAttente ?? 0,
      trend: data ? 4 : 0,
      up: false,
      icon: AlertTriangle,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      label: "Examens totaux",
      value: data?.nombreTotalExamens ?? 0,
      trend: data ? 5 : 0,
      up: true,
      icon: FileText,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      label: "Examens aujourd'hui",
      value: data?.examensAujourdhui ?? 0,
      trend: data ? 0 : 0,
      up: true,
      icon: CalendarCheck,
      color: "text-secondary",
      bg: "bg-secondary/10",
    },
    {
      label: "Temps moyen (min)",
      value: data?.tempsMoyenInterventionMinutes ?? 0,
      trend: data ? 2 : 0,
      up: false,
      icon: Clock,
      color: "text-foreground",
      bg: "bg-muted/10",
    },
  ];

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="flex-1 px-4 py-8">
        <div className="space-y-6 animate-fade-in">
          {/* Welcome */}
          <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-destructive/5" />
        <EcgLine className="absolute inset-x-0 bottom-0 h-16 w-full opacity-40" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1">
              Welcome, <span className="text-primary">{user?.name ?? "Dr. Ahmed"}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-1.5">
              <Clock size={14} /> {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · Hope you have a great day
            </p>
          </div>
          <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-card border border-border shadow-sm">
            <Heart className="text-destructive fill-destructive animate-heartbeat" size={28} />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider"></p>
            </div>
          </div>
        </div>
      </section>

      {isLoading && (
        <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Chargement des données du tableau de bord...
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-border bg-destructive/10 p-4 text-sm text-destructive">
          Erreur lors du chargement des données du dashboard.
        </div>
      )}

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          const TrendIcon = s.up ? TrendingUp : TrendingDown;
          return (
            <div
              key={s.label}
              className="group relative rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", s.bg)}>
                  <Icon size={20} className={s.color} />
                </div>
                <span className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full",
                  s.up ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
                )}>
                  <TrendIcon size={12} /> {s.trend}%
                </span>
              </div>
              <p className="text-3xl font-bold text-foreground mt-4">{s.value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          );
        })}
      </section>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;