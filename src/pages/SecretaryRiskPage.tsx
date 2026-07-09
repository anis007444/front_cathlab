import * as React from "react";
import { useMemo, useState, useEffect } from "react";
import axios from "axios";
import {
    AlertTriangle,
    Plus,
    Save,
    Search,
    User as UserIcon,
    Phone,
    IdCard,
    Loader2,
    ShieldCheck,
    X,
    Pencil,
    Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Gender = "M" | "F";

type Patient = {
    id: string;
    firstName: string;
    lastName: string;
    mrn: string;
    age: number;
    gender: Gender;
    phone?: string;
    patientBir?: string;
    riskFactors: string[];
};

type RiskFactor = {
    id: number;
    key: string;
    label: string;
    description: string;
};





function riskLevel(count: number): {
    label: string;
    tone: "ok" | "moderate" | "high";
} {
    if (count === 0) return { label: "No risk", tone: "ok" };
    if (count <= 2) return { label: "Moderate", tone: "moderate" };
    return { label: "High", tone: "high" };
}

const toneClasses: Record<"ok" | "moderate" | "high", string> = {
    ok: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    moderate: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    high: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

export default function SecretaryRiskPage() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [availableRiskFactors, setAvailableRiskFactors] = useState<RiskFactor[]>([]);
    const [search, setSearch] = useState("");
    const [selectedId, setSelectedId] = useState<string>("");
    const [draftFactors, setDraftFactors] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [preselectPatientId, setPreselectPatientId] = useState<string>("");
    const [lockPatient, setLockPatient] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [patientsRes, factorsRes] = await Promise.all([
                    axios.get("http://localhost:5106/api/Patients"),
                    axios.get("http://localhost:5106/api/TypeFacteurRisques")
                ]);

                const fData = factorsRes.data.value || factorsRes.data;
                const apiFactors: RiskFactor[] = fData.map((f: any) => ({
                    id: f.id,
                    key: f.code,
                    label: f.libelle,
                    description: f.libelle
                }));
                setAvailableRiskFactors(apiFactors);

                const data = patientsRes.data.value || patientsRes.data;
                const apiPatients: Patient[] = data.map((p: any) => {
                    let lastName = "Unknown";
                    let firstName = "";
                    if (p.patientNam) {
                        const parts = p.patientNam.split("^");
                        lastName = parts[0] || "Unknown";
                        firstName = parts[1] || "";
                    }

                    let age = 0;
                    if (p.patientBir && p.patientBir.length === 8) {
                        const year = parseInt(p.patientBir.substring(0, 4));
                        const currentYear = new Date().getFullYear();
                        age = currentYear - year;
                    }

                    return {
                        id: p.patientId,
                        firstName: firstName || p.patientNam,
                        lastName: lastName,
                        mrn: p.patientId,
                        age: age,
                        gender: p.patientSex === "M" ? "M" : "F",
                        phone: "",
                        patientBir: p.patientBir || "",
                        riskFactors: [],
                    };
                });
                setPatients(apiPatients);
                if (apiPatients.length > 0) {
                    setSelectedId(apiPatients[0].id);
                    setDraftFactors(new Set(apiPatients[0].riskFactors));
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                toast.error("Failed to load data");
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    useEffect(() => {
        if (!selectedId) return;

        async function fetchPatientRiskFactors() {
            try {
                const response = await axios.get(`http://localhost:5106/api/Patients/${selectedId}/risk-factors`);
                const data = response.data.riskFactors || response.data;
                const factors = Array.isArray(data) 
                    ? data.map((f: any) => f.typeCode || f.typeFacteurRisque?.code || f.code || (typeof f === 'string' ? f : ''))
                    : [];

                setPatients((prev) =>
                    prev.map((p) =>
                        p.id === selectedId ? { ...p, riskFactors: factors } : p
                    )
                );
                setDraftFactors(new Set(factors));
            } catch (error) {
                console.error("Error fetching patient risk factors:", error);
            }
        }

        fetchPatientRiskFactors();
    }, [selectedId]);

    function openAddModal(patientId?: string, lock = false) {
        setPreselectPatientId(patientId ?? "");
        setLockPatient(lock && !!patientId);
        setModalOpen(true);
    }

    function requestDeleteFactors(patientId: string) {
        setDeletingId(patientId);
        setConfirmDeleteOpen(true);
    }

    async function confirmDeleteFactors() {
        if (!deletingId) return;
        
        try {
            await axios.delete(`http://localhost:5106/api/FacteurRisquePatients/${deletingId}`);
            setPatients((prev) =>
                prev.map((p) => (p.id === deletingId ? { ...p, riskFactors: [] } : p)),
            );
            if (deletingId === selectedId) {
                setDraftFactors(new Set());
            }
            setConfirmDeleteOpen(false);
            setDeletingId(null);
            toast.success("Risk factors deleted");
        } catch (error) {
            console.error("Error deleting risk factors:", error);
            toast.error("Erreur lors de la suppression sur le serveur");
        }
    }

    const filteredPatients = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return patients;
        return patients.filter(
            (p) =>
                `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
                p.mrn.toLowerCase().includes(q),
        );
    }, [patients, search]);

    const selected = useMemo(
        () => patients.find((p) => p.id === selectedId) ?? null,
        [patients, selectedId],
    );

    function selectPatient(p: Patient) {
        setSelectedId(p.id);
        setDraftFactors(new Set(p.riskFactors));
    }

    function toggleFactor(key: string) {
        setDraftFactors((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }

    const isDirty = useMemo(() => {
        if (!selected) return false;
        const a = [...selected.riskFactors].sort().join(",");
        const b = [...draftFactors].sort().join(",");
        return a !== b;
    }, [selected, draftFactors]);

    async function saveRiskFactors() {
        if (!selected) return;
        setSaving(true);
        try {
            // Simulate API call
            await new Promise((r) => setTimeout(r, 700));
            const updated = [...draftFactors];
            setPatients((prev) =>
                prev.map((p) => (p.id === selected.id ? { ...p, riskFactors: updated } : p)),
            );
            toast.success("Risk factors updated successfully");
        } catch {
            toast.error("Failed to update");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="min-h-screen bg-background">
            <AppHeader />
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                {/* Header */}
                <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                            Gestion des risques                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Assigner les facteurs de risque aux patients
                        </p>
                    </div>
                    <div className="flex flex-1 justify-center">
                        <div className="relative w-full max-w-md">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Rechercher un patient…"
                                className="h-10 w-full pl-9"
                            />
                        </div>
                    </div>
                </header>

                {/* Main */}
                <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
                    {/* Patient list */}
                    <aside className="rounded-xl border border-border bg-card shadow-sm">
                        <div className="flex items-center justify-between border-b border-border px-4 py-3">
                            <h2 className="text-sm font-semibold text-foreground">Patients</h2>
                        </div>
                        <ScrollArea className="h-[calc(100vh-260px)]">
                            <ul className="divide-y divide-border">
                                {filteredPatients.map((p) => {
                                    const isSelected = p.id === selectedId;
                                    const lvl = riskLevel(p.riskFactors.length);
                                    return (
                                        <li key={p.id}>
                                            <button
                                                type="button"
                                                onClick={() => selectPatient(p)}
                                                className={cn(
                                                    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50",
                                                    isSelected && "bg-accent",
                                                )}
                                            >
                                                <div
                                                    className={cn(
                                                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                                                        isSelected
                                                            ? "bg-primary text-primary-foreground"
                                                            : "bg-muted text-muted-foreground",
                                                    )}
                                                >
                                                    {p.firstName[0]}
                                                    {p.lastName[0]}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-semibold text-foreground">
                                                        {p.firstName} {p.lastName}
                                                    </p>
                                                </div>
                                            </button>
                                        </li>
                                    );
                                })}
                                {filteredPatients.length === 0 && (
                                    <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                                        No patients found
                                    </li>
                                )}
                            </ul>
                        </ScrollArea>
                    </aside>

                    {/* Right detail panel */}
                    <section className="space-y-6">
                        {!selected ? (
                            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-card text-sm text-muted-foreground">
                                Select a patient to manage risk factors
                            </div>
                        ) : (
                            <>
                                {/* Patient summary */}
                                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                                            <UserIcon className="h-7 w-7" />
                                        </div>
                                        <h2 className="text-xl font-semibold text-foreground">
                                            {selected.firstName} {selected.lastName}
                                        </h2>
                                    </div>

                                    <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
                                        <div className="flex items-center gap-2">
                                            <IdCard className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                                    Date de naissance
                                                </dt>
                                                <dd className="font-mono text-sm text-foreground">{selected.patientBir ?? "—"}</dd>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <UserIcon className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                                    Sex
                                                </dt>
                                                <dd className="text-sm text-foreground">
                                                    {selected.gender === "M" ? "Male" : "Female"}
                                                </dd>
                                            </div>
                                        </div>
                                    </dl>
                                </div>

                                {/* Risk factors */}
                                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                                Facteurs de risque
                                            </h3>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
    {selected.riskFactors.length === 0
        ? "Ce patient n'a aucun facteur de risque enregistré"
        : ""}
</p>
                                        </div>
                                    </div>

                                    {selected.riskFactors.length === 0 && draftFactors.size === 0 ? (
                                        /* Empty state — Aucun facteur de risque enregistré */
                                        <div className="mt-5 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                <ShieldCheck className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">
                                                    Aucun facteur de risque enregistré
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    Ajouter des facteurs de risque pour{" "}
                                                    {selected.firstName} {selected.lastName}
                                                </p>
                                            </div>
                                            <Button
                                                size="lg"
                                                onClick={() => openAddModal(selected.id, true)}
                                                className="mt-2 gap-2"
                                            >
                                                <Plus className="h-4 w-4" />
                                                Ajouter des facteurs de risque
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Existing recorded factors (read-only summary) */}
                                            {selected.riskFactors.length > 0 && (
                                                <div className="mt-5 rounded-lg border border-border bg-muted/30 p-4">
                                                    <div className="mb-4 flex items-center justify-between">
                                                        <h3 className="text-sm font-semibold text-foreground">Facteurs de risque enregistrés</h3>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => openAddModal(selected.id, true)}
                                                                className="h-7 gap-1.5 px-2.5 text-xs"
                                                            >
                                                                <Pencil className="h-3 w-3" />
                                                                Modifier
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => requestDeleteFactors(selected.id)}
                                                                className="h-7 gap-1.5 px-2.5 text-xs text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                                Supprimer
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {selected.riskFactors.map((key) => {
                                                            const rf = availableRiskFactors.find((r) => r.key === key);
                                                            return (
                                                                <span
                                                                    key={key}
                                                                    className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:text-red-400"
                                                                >
                                                                    <AlertTriangle className="h-3 w-3" />
                                                                    {rf?.label ?? key}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </section>
                </div>
            </div>

            <AddRiskFactorsModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                patients={patients}
                availableRiskFactors={availableRiskFactors}
                initialPatientId={preselectPatientId}
                lockPatient={lockPatient}
                onSave={(patientId, factors) => {
                    setPatients((prev) =>
                        prev.map((p) => (p.id === patientId ? { ...p, riskFactors: factors } : p)),
                    );
                    if (patientId === selectedId) {
                        setDraftFactors(new Set(factors));
                    }
                    const isEditing = patients.some((p) => p.id === patientId && p.riskFactors.length > 0);
                    toast.success(
                        isEditing
                            ? "Facteurs de risque mis à jour avec succès"
                            : "Facteurs de risque ajoutés avec succès"
                    );
                    setModalOpen(false);
                }}
            />

            <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer les facteurs de risque ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action retirera tous les facteurs de risque cardiovasculaires
                            enregistrés pour ce patient. Vous pourrez en ajouter de nouveaux à
                            tout moment.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDeleteFactors}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function AddRiskFactorsModal({
    open,
    onOpenChange,
    patients,
    availableRiskFactors,
    initialPatientId,
    lockPatient = false,
    onSave,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    patients: Patient[];
    availableRiskFactors: RiskFactor[];
    initialPatientId?: string;
    lockPatient?: boolean;
    onSave: (patientId: string, factors: string[]) => void;
}) {
    const [patientId, setPatientId] = useState<string>("");
    const [factors, setFactors] = useState<Set<string>>(new Set());
    const [submitting, setSubmitting] = useState(false);

    React.useEffect(() => {
        if (open) {
            const pid = initialPatientId ?? "";
            setPatientId(pid);
            const existing = patients.find((p) => p.id === pid)?.riskFactors ?? [];
            setFactors(new Set(existing));
        }
    }, [open, initialPatientId, patients]);

    function toggle(key: string) {
        setFactors((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }

    async function handleSave() {
        if (!patientId) {
            toast.error("Please select a patient");
            return;
        }
        setSubmitting(true);
        try {
            const typeFacteurRisqueIds = [...factors]
                .map((code) => availableRiskFactors.find((r) => r.key === code)?.id)
                .filter((id): id is number => id !== undefined);

            const payload = {
                patientId: patientId,
                typeFacteurRisqueIds: typeFacteurRisqueIds
            };

            const existingFactors = patients.find((p) => p.id === patientId)?.riskFactors ?? [];
            if (existingFactors.length > 0) {
                await axios.put("http://localhost:5106/api/FacteurRisquePatients", payload);
            } else {
                await axios.post("http://localhost:5106/api/FacteurRisquePatients", payload);
            }

            onSave(patientId, [...factors]);
        } catch (error) {
            console.error("Error saving risk factors:", error);
            toast.error("Erreur lors de la sauvegarde sur le serveur");
        } finally {
            setSubmitting(false);
        }
    }

    const lockedPatient = lockPatient
        ? patients.find((p) => p.id === initialPatientId) ?? null
        : null;
    // When locked, restrict select options to the selected patient only
    const selectablePatients = lockedPatient ? [lockedPatient] : patients;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {lockedPatient ? "Modifier les facteurs de risque" : "Add Risk Factors"}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="patient-select">Patient</Label>
                        {lockedPatient ? (
                            <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                    {lockedPatient.firstName[0]}
                                    {lockedPatient.lastName[0]}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-foreground">
                                        {lockedPatient.firstName} {lockedPatient.lastName}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <Select value={patientId} onValueChange={setPatientId}>
                                <SelectTrigger id="patient-select">
                                    <SelectValue placeholder="Select a patient…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {selectablePatients.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.firstName} {p.lastName} · {p.mrn}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Facteurs de risque</Label>
                            
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {availableRiskFactors.map((rf) => {
                                const active = factors.has(rf.key);
                                return (
                                    <button
                                        key={rf.key}
                                        type="button"
                                        onClick={() => toggle(rf.key)}
                                        className={cn(
                                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                                            active
                                                ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
                                                : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
                                        )}
                                    >
                                        {active ? (
                                            <AlertTriangle className="h-3 w-3" />
                                        ) : (
                                            <Plus className="h-3 w-3" />
                                        )}
                                        {rf.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="gap-2">
                        <X className="h-4 w-4" />
                        Annuler
                    </Button>
                    <Button onClick={handleSave} disabled={submitting} className="gap-2">
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Enregistrer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
