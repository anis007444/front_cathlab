
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
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { format, startOfMonth, endOfMonth, startOfYear, subDays } from "date-fns";

interface DashboardData {
  nombreTotalInterventions: number;
  interventionsCompletees: number;
  interventionsEnAttente: number;
  nombreTotalExamens: number;
  examensAujourdhui: number;
  tempsMoyenInterventionMinutes: number;
}

interface InterventionByIndication {
  indication: string;
  count: number;
}

interface InterventionByRiskFactor {
  riskFactor: string;
  count: number;
}

const DashboardPage = () => {
  const { user } = useAuth();
  const [now, setNow] = useState(new Date());
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());

  const { data, isLoading, error } = useQuery<DashboardData, Error>({
    queryKey: ["dashboard", "medecin"],
    queryFn: async () => {
      const response = await axios.get<DashboardData>("http://localhost:5106/api/Dashboard/medecin");
      return response.data;
    },
    staleTime: 1000 * 60 * 2,
  });

  // Données de test
  const mockIndicationData: InterventionByIndication[] = [
    { indication: "Infarctus du Myocarde", count: 45 },
    { indication: "Angine Stable", count: 32 },
    { indication: "Angine Instable", count: 28 },
    { indication: "Diagnostic", count: 38 },
    { indication: "Réévaluation", count: 22 },
  ];

  const mockRiskFactorData: InterventionByRiskFactor[] = [
    { riskFactor: "Hypertension", count: 67 },
    { riskFactor: "Diabète", count: 52 },
    { riskFactor: "Dyslipidémie", count: 48 },
    { riskFactor: "Tabagisme", count: 35 },
    { riskFactor: "Antécédents Familiaux", count: 29 },
    { riskFactor: "Obésité", count: 25 },
    { riskFactor: "Sédentarité", count: 18 },
    { riskFactor: "Maladie Rénale", count: 12 },
  ];

  const { data: interventionsByIndication, isLoading: loadingIndication } = useQuery<
    InterventionByIndication[],
    Error
  >({
    queryKey: ["dashboard", "interventions-by-indication", format(startDate, "yyyy-MM-dd"), format(endDate, "yyyy-MM-dd")],
    queryFn: async () => {
      // Simulation d'appel API avec délai
      await new Promise((resolve) => setTimeout(resolve, 500));
      // Retourner les données de test
      return mockIndicationData;
      
      // Décommenter pour utiliser l'API réelle quand elle sera prête:
      // const response = await axios.get<InterventionByIndication[]>(
      //   `http://localhost:5106/api/Dashboard/interventions-by-indication?startDate=${format(startDate, "yyyy-MM-dd")}&endDate=${format(endDate, "yyyy-MM-dd")}`
      // );
      // return response.data;
    },
    staleTime: 1000 * 60 * 2,
  });

  const { data: interventionsByRiskFactor, isLoading: loadingRiskFactor } = useQuery<
    InterventionByRiskFactor[],
    Error
  >({
    queryKey: ["dashboard", "interventions-by-risk-factor", format(startDate, "yyyy-MM-dd"), format(endDate, "yyyy-MM-dd")],
    queryFn: async () => {
      // Simulation d'appel API avec délai
      await new Promise((resolve) => setTimeout(resolve, 500));
      // Retourner les données de test
      return mockRiskFactorData;
      
      // Décommenter pour utiliser l'API réelle quand elle sera prête:
      // const response = await axios.get<InterventionByRiskFactor[]>(
      //   `http://localhost:5106/api/Dashboard/interventions-by-risk-factor?startDate=${format(startDate, "yyyy-MM-dd")}&endDate=${format(endDate, "yyyy-MM-dd")}`
      // );
      // return response.data;
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

      {/* Date Filter BI */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">Filtre de Date</h2>
            <p className="text-sm text-muted-foreground">Choisissez une plage de dates comme dans un dashboard BI</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-full border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
              onClick={() => {
                setStartDate(startOfMonth(new Date()));
                setEndDate(endOfMonth(new Date()));
              }}
            >
              Ce mois
            </button>
            <button
              className="rounded-full border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
              onClick={() => {
                setStartDate(startOfYear(new Date()));
                setEndDate(new Date());
              }}
            >
              Cette année
            </button>
            <button
              className="rounded-full border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
              onClick={() => {
                setStartDate(subDays(new Date(), 7));
                setEndDate(new Date());
              }}
            >
              7 derniers jours
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Date de début</label>
            <Input
              type="date"
              value={format(startDate, "yyyy-MM-dd")}
              onChange={(e) => setStartDate(new Date(e.target.value))}
              className="w-full cursor-pointer"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Date de fin</label>
            <Input
              type="date"
              value={format(endDate, "yyyy-MM-dd")}
              onChange={(e) => setEndDate(new Date(e.target.value))}
              className="w-full cursor-pointer"
            />
          </div>
        </div>
      </section>

      {/* Charts Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interventions by Indication */}
        <Card className="rounded-2xl border border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Interventions par Type d'Indication</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingIndication ? (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                Chargement...
              </div>
            ) : interventionsByIndication && interventionsByIndication.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={interventionsByIndication}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="indication" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" name="Nombre d'interventions" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>

        {/* Interventions by Risk Factor */}
        <Card className="rounded-2xl border border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Interventions par Facteur de Risque</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRiskFactor ? (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                Chargement...
              </div>
            ) : interventionsByRiskFactor && interventionsByRiskFactor.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={interventionsByRiskFactor}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ riskFactor, count }) => `${riskFactor}: ${count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {interventionsByRiskFactor.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          [
                            "#3b82f6",
                            "#ef4444",
                            "#10b981",
                            "#f59e0b",
                            "#8b5cf6",
                            "#ec4899",
                            "#14b8a6",
                            "#f97316",
                          ][index % 8]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>
      </section>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;