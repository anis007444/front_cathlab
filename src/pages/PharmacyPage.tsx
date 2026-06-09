import { useMemo, useState, useEffect } from "react";
import axios from "axios";
import {
    Plus,
    Edit,
    Trash2,
    Search,
    Pill,
    Package,
    X,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";

type MedStatus = "Available" | "Low" | "Out of Stock";

interface Medication {
    id: string;
    name: string;
    quantity: number;
    seuilAlerte: number;
    status: MedStatus;
    updatedAt: string;
}

type MaterialType = string;
type MaterialStatus = "Available" | "Low" | "Out";

interface Material {
    id: string;
    name: string;
    type: MaterialType;
    quantity: number;
    seuilAlerte: number;
    status: MaterialStatus;
    updatedAt: string;
}





function formatDate(iso: string) {
    if (!iso) return "—";
    const d = new Date(iso);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${months[d.getUTCMonth()]} ${pad(d.getUTCDate())}, ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

const medStatusClass: Record<MedStatus, string> = {
    Available: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    Low: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    "Out of Stock": "bg-red-500/10 text-red-600 dark:text-red-400",
};

const matStatusClass: Record<MaterialStatus, string> = {
    Available: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    Low: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    Out: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export function PharmacyPage() {
    const [tab, setTab] = useState<"medications" | "materials">("medications");
    const [materialTypes, setMaterialTypes] = useState<{id: number, code: string, libelle: string}[]>([]);

    useEffect(() => {
        Promise.all([
            axios.get("http://localhost:5106/api/TypeMateriels"),
            axios.get("http://localhost:5106/api/Materiels"),
            axios.get("http://localhost:5106/api/Medicaments")
        ]).then(([typesRes, matsRes, medsRes]) => {
            const typesData = Array.isArray(typesRes.data) ? typesRes.data : (typesRes.data?.value || []);
            const parsedTypes = typesData.map((t: any) => ({ id: t.id, code: t.code, libelle: t.libelle }));
            setMaterialTypes(parsedTypes);

            const matsData = Array.isArray(matsRes.data) ? matsRes.data : (matsRes.data?.value || []);
            const parsedMats: Material[] = matsData.map((m: any) => {
                const typeObj = parsedTypes.find((t: any) => t.libelle === m.typeMateriel);
                const typeCode = typeObj ? typeObj.code : m.typeMateriel;
                let status: MaterialStatus = "Available";
                if (m.stockDisponible === 0) status = "Out";
                else if (m.stockDisponible <= m.seuilAlerte) status = "Low";

                return {
                    id: String(m.id),
                    name: m.designation,
                    type: typeCode,
                    quantity: m.stockDisponible,
                    seuilAlerte: m.seuilAlerte,
                    status: status,
                    updatedAt: new Date().toISOString()
                };
            });
            setMaterials(parsedMats);
            if (parsedMats.length > 0) setSelectedMatId(parsedMats[0].id);

            const medsData = Array.isArray(medsRes.data) ? medsRes.data : (medsRes.data?.value || []);
            const parsedMeds: Medication[] = medsData.map((m: any) => {
                let status: MedStatus = "Available";
                if (m.stockDisponible === 0) status = "Out of Stock";
                else if (m.stockDisponible <= m.seuilAlerte) status = "Low";

                return {
                    id: String(m.id),
                    name: m.nom,
                    quantity: m.stockDisponible,
                    seuilAlerte: m.seuilAlerte,
                    status: status,
                    updatedAt: new Date().toISOString()
                };
            });
            setMeds(parsedMeds);
            if (parsedMeds.length > 0) setSelectedMedId(parsedMeds[0].id);

        }).catch(err => console.error("Failed to fetch data", err));
    }, []);

    // ---------- Medications state ----------
    const [meds, setMeds] = useState<Medication[]>([]);
    const [medSearch, setMedSearch] = useState("");
    const [medStatusFilter, setMedStatusFilter] = useState<MedStatus | "All">("All");
    const [medSort, setMedSort] = useState<"name" | "quantity">("name");
    const [selectedMedId, setSelectedMedId] = useState<string | null>(null);

    const [medModalOpen, setMedModalOpen] = useState(false);
    const [editingMedId, setEditingMedId] = useState<string | null>(null);
    const [medForm, setMedForm] = useState<{
        name: string;
        quantity: number;
        seuilAlerte: number;
    }>({
        name: "",
        quantity: 0,
        seuilAlerte: 10,
    });
    const [medErrors, setMedErrors] = useState<Record<string, string>>({});
    const [confirmDeleteMedId, setConfirmDeleteMedId] = useState<string | null>(null);

    // ---------- Materials state ----------
    const [materials, setMaterials] = useState<Material[]>([]);
    const [matSearch, setMatSearch] = useState("");
    const [matTypeFilter, setMatTypeFilter] = useState<MaterialType | "All">("All");
    const [matStatusFilter, setMatStatusFilter] = useState<MaterialStatus | "All">("All");
    const [selectedMatId, setSelectedMatId] = useState<string | null>(null);

    const [matModalOpen, setMatModalOpen] = useState(false);
    const [editingMatId, setEditingMatId] = useState<string | null>(null);
    const [matForm, setMatForm] = useState<{
        name: string;
        type: string;
        quantity: number;
        seuilAlerte: number;
    }>({
        name: "",
        type: "",
        quantity: 0,
        seuilAlerte: 5,
    });
    const [matErrors, setMatErrors] = useState<Record<string, string>>({});
    const [confirmDeleteMatId, setConfirmDeleteMatId] = useState<string | null>(null);

    // ---------- Medication helpers ----------
    const filteredMeds = useMemo(() => {
        const q = medSearch.trim().toLowerCase();
        return meds
            .filter((m) => {
                const matchQ = !q || m.name.toLowerCase().includes(q);
                const matchStat = medStatusFilter === "All" || m.status === medStatusFilter;
                return matchQ && matchStat;
            })
            .sort((a, b) =>
                medSort === "name" ? a.name.localeCompare(b.name) : b.quantity - a.quantity,
            );
    }, [meds, medSearch, medStatusFilter, medSort]);

    const selectedMed = meds.find((m) => m.id === selectedMedId) ?? null;

    function openCreateMed() {
        setEditingMedId(null);
        setMedForm({
            name: "",
            quantity: 0,
            seuilAlerte: 10,
        });
        setMedErrors({});
        setMedModalOpen(true);
    }

    function openEditMed(m: Medication) {
        setEditingMedId(m.id);
        setMedForm({
            name: m.name,
            quantity: m.quantity,
            seuilAlerte: m.seuilAlerte,
        });
        setMedErrors({});
        setMedModalOpen(true);
    }

    function validateMed(): boolean {
        const e: Record<string, string> = {};
        if (!medForm.name.trim()) e.name = "Required";
        if (medForm.quantity < 0 || Number.isNaN(medForm.quantity)) e.quantity = "Must be ≥ 0";
        if (medForm.seuilAlerte < 0 || Number.isNaN(medForm.seuilAlerte)) e.seuilAlerte = "Must be ≥ 0";
        setMedErrors(e);
        return Object.keys(e).length === 0;
    }

    function saveMed() {
        if (!validateMed()) {
            toast.error("Please fix the errors in the form.");
            return;
        }
        const now = new Date().toISOString();
        let status: MedStatus = "Available";
        if (medForm.quantity === 0) status = "Out of Stock";
        else if (medForm.quantity <= medForm.seuilAlerte) status = "Low";
        if (editingMedId) {
            const payload = {
                id: Number(editingMedId),
                nom: medForm.name,
                stockDisponible: medForm.quantity,
                seuilAlerte: medForm.seuilAlerte
            };

            axios.put(`http://localhost:5106/api/Medicaments/${editingMedId}`, payload)
                .then(() => {
                    setMeds((prev) =>
                        prev.map((m) =>
                            m.id === editingMedId ? { ...m, ...medForm, status, updatedAt: now } : m,
                        ),
                    );
                    toast.success("Medication updated.");
                    setMedModalOpen(false);
                })
                .catch(err => {
                    console.error("Error updating medication:", err);
                    toast.error("Failed to update medication on the server.");
                });
        } else {
            const payload = {
                nom: medForm.name,
                stockDisponible: medForm.quantity,
                seuilAlerte: medForm.seuilAlerte
            };

            axios.post("http://localhost:5106/api/Medicaments", payload)
                .then(res => {
                    const newMedId = res.data?.id ? String(res.data.id) : "m" + Date.now();
                    setMeds((prev) => [...prev, { id: newMedId, ...medForm, status, updatedAt: now }]);
                    setSelectedMedId(newMedId);
                    toast.success("Medication added.");
                    setMedModalOpen(false);
                })
                .catch(err => {
                    console.error("Error adding medication:", err);
                    toast.error("Failed to add medication to the server.");
                });
        }
    }

    function confirmMedDelete() {
        if (!confirmDeleteMedId) return;
        
        axios.delete(`http://localhost:5106/api/Medicaments/${confirmDeleteMedId}`)
            .then(() => {
                const m = meds.find((x) => x.id === confirmDeleteMedId);
                setMeds((prev) => prev.filter((x) => x.id !== confirmDeleteMedId));
                if (selectedMedId === confirmDeleteMedId) setSelectedMedId(null);
                setConfirmDeleteMedId(null);
                if (m) toast.success(`${m.name} deleted.`);
            })
            .catch(err => {
                console.error("Error deleting medication:", err);
                toast.error("Failed to delete medication from the server.");
            });
    }

    // ---------- Material helpers ----------
    const filteredMaterials = useMemo(() => {
        const q = matSearch.trim().toLowerCase();
        return materials.filter((m) => {
            const matchQ = !q || m.name.toLowerCase().includes(q);
            const matchType = matTypeFilter === "All" || m.type === matTypeFilter;
            const matchStat = matStatusFilter === "All" || m.status === matStatusFilter;
            return matchQ && matchType && matchStat;
        });
    }, [materials, matSearch, matTypeFilter, matStatusFilter]);

    const selectedMat = materials.find((m) => m.id === selectedMatId) ?? null;

    function openCreateMat() {
        setEditingMatId(null);
        setMatForm({
            name: "",
            type: materialTypes[0]?.code || "",
            quantity: 0,
            seuilAlerte: 5,
        });
        setMatErrors({});
        setMatModalOpen(true);
    }

    function openEditMat(m: Material) {
        setEditingMatId(m.id);
        setMatForm({
            name: m.name,
            type: m.type,
            quantity: m.quantity,
            seuilAlerte: m.seuilAlerte,
        });
        setMatErrors({});
        setMatModalOpen(true);
    }

    function validateMat(): boolean {
        const e: Record<string, string> = {};
        if (!matForm.name.trim()) e.name = "Required";
        if (matForm.quantity < 0 || Number.isNaN(matForm.quantity)) e.quantity = "Must be ≥ 0";
        if (matForm.seuilAlerte < 0 || Number.isNaN(matForm.seuilAlerte)) e.seuilAlerte = "Must be ≥ 0";
        setMatErrors(e);
        return Object.keys(e).length === 0;
    }

    function saveMat() {
        if (!validateMat()) {
            toast.error("Please fix the errors in the form.");
            return;
        }
        const now = new Date().toISOString();
        let status: MaterialStatus = "Available";
        if (matForm.quantity === 0) status = "Out";
        else if (matForm.quantity <= matForm.seuilAlerte) status = "Low";
        if (editingMatId) {
            const typeMaterielId = materialTypes.find(t => t.code === matForm.type)?.id || 0;
            const payload = {
                id: Number(editingMatId),
                designation: matForm.name,
                typeMaterielId: typeMaterielId,
                stockDisponible: matForm.quantity,
                seuilAlerte: matForm.seuilAlerte
            };

            axios.put(`http://localhost:5106/api/Materiels/${editingMatId}`, payload)
                .then(() => {
                    setMaterials((prev) =>
                        prev.map((m) =>
                            m.id === editingMatId ? { ...m, ...matForm, status, updatedAt: now } : m,
                        ),
                    );
                    toast.success("Material updated.");
                    setMatModalOpen(false);
                })
                .catch(err => {
                    console.error("Error updating material:", err);
                    toast.error("Failed to update material on the server.");
                });
        } else {
            const typeMaterielId = materialTypes.find(t => t.code === matForm.type)?.id || 0;
            const payload = {
                designation: matForm.name,
                typeMaterielId: typeMaterielId,
                stockDisponible: matForm.quantity,
                seuilAlerte: matForm.seuilAlerte
            };

            axios.post("http://localhost:5106/api/Materiels", payload)
                .then(res => {
                    const newMatId = res.data?.id ? String(res.data.id) : "x" + Date.now();
                    setMaterials((prev) => [...prev, { id: newMatId, ...matForm, status, updatedAt: now }]);
                    setSelectedMatId(newMatId);
                    toast.success("Material added.");
                    setMatModalOpen(false);
                })
                .catch(err => {
                    console.error("Error adding material:", err);
                    toast.error("Failed to add material to the server.");
                });
        }
    }

    function confirmMatDelete() {
        if (!confirmDeleteMatId) return;
        const m = materials.find((x) => x.id === confirmDeleteMatId);
        
        axios.delete(`http://localhost:5106/api/Materiels/${confirmDeleteMatId}`)
            .then(() => {
                setMaterials((prev) => prev.filter((x) => x.id !== confirmDeleteMatId));
                if (selectedMatId === confirmDeleteMatId) setSelectedMatId(null);
                setConfirmDeleteMatId(null);
                if (m) toast.success(`${m.name} deleted.`);
            })
            .catch(err => {
                console.error("Error deleting material:", err);
                toast.error("Failed to delete material from the server.");
            });
    }

    const lowMedCount = meds.filter((m) => m.status === "Out of Stock" || m.quantity <= 10).length;
    const lowMatCount = materials.filter((m) => m.status !== "Available").length;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <AppHeader />
            <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur">
                <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Pharmacy Management</h1>
                        <p className="text-xs text-muted-foreground">
                            Manage medications and clinical materials inventory
                        </p>
                    </div>
                    <Button
                        onClick={tab === "medications" ? openCreateMed : openCreateMat}
                        className="gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add {tab === "medications" ? "Medication" : "Material"}
                    </Button>
                </div>
            </header>

            <main className="mx-auto max-w-[1400px] px-6 py-6">
                <Tabs
                    value={tab}
                    onValueChange={(v) => setTab(v as "medications" | "materials")}
                    className="w-full"
                >
                    <TabsList className="mb-6">
                        <TabsTrigger value="medications" className="gap-2">
                            <Pill className="h-4 w-4" />
                            Medications
                            {lowMedCount > 0 && (
                                <Badge variant="outline" className="ml-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                                    {lowMedCount}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="materials" className="gap-2">
                            <Package className="h-4 w-4" />
                            Materials
                            {lowMatCount > 0 && (
                                <Badge variant="outline" className="ml-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                                    {lowMatCount}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    {/* MEDICATIONS TAB */}
                    <TabsContent value="medications" className="mt-0">
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
                            <Card className="overflow-hidden border-border">
                                <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            value={medSearch}
                                            onChange={(e) => setMedSearch(e.target.value)}
                                            placeholder="Search medications"
                                            className="pl-9"
                                        />
                                    </div>

                                    <Select
                                        value={medStatusFilter}
                                        onValueChange={(v) => setMedStatusFilter(v as MedStatus | "All")}
                                    >
                                        <SelectTrigger className="w-full sm:w-[150px]">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="All">All</SelectItem>
                                            <SelectItem value="Available">Available</SelectItem>
                                            <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setMedSort(medSort === "name" ? "quantity" : "name")}
                                        className="gap-1"
                                    >
                                        <ArrowUpDown className="h-3.5 w-3.5" />
                                        {medSort === "name" ? "Name" : "Qty"}
                                    </Button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                                <th className="px-4 py-3 font-medium">Name</th>
                                                <th className="px-4 py-3 font-medium">Quantity</th>
                                                <th className="px-4 py-3 font-medium">Status</th>
                                                <th className="px-4 py-3 text-right font-medium">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredMeds.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                                                        No medications match your filters.
                                                    </td>
                                                </tr>
                                            )}
                                            {filteredMeds.map((m) => {
                                                const low = m.quantity > 0 && m.quantity <= m.seuilAlerte;
                                                return (
                                                    <tr
                                                        key={m.id}
                                                        onClick={() => setSelectedMedId(m.id)}
                                                        className={cn(
                                                            "cursor-pointer border-t border-border transition-colors hover:bg-muted/40",
                                                            selectedMedId === m.id && "bg-accent/40",
                                                        )}
                                                    >
                                                        <td className="px-4 py-3 font-medium">{m.name}</td>
                                                        <td className="px-4 py-3">
                                                            <span
                                                                className={cn(
                                                                    "font-medium",
                                                                    m.quantity === 0 && "text-red-600 dark:text-red-400",
                                                                    low && "text-amber-600 dark:text-amber-400",
                                                                )}
                                                            >
                                                                {m.quantity}
                                                            </span>
                                                            {low && (
                                                                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                                                    <AlertTriangle className="h-3 w-3" />
                                                                    Low
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span
                                                                className={cn(
                                                                    "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                                                                    medStatusClass[m.status],
                                                                )}
                                                            >
                                                                <span
                                                                    className={cn(
                                                                        "h-1.5 w-1.5 rounded-full",
                                                                        m.status === "Available" ? "bg-emerald-500" : "bg-red-500",
                                                                    )}
                                                                />
                                                                {m.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex justify-end gap-1">
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        openEditMed(m);
                                                                    }}
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setConfirmDeleteMedId(m.id);
                                                                    }}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>

                            {/* Med Details */}
                            <Card className="h-fit border-border p-6">
                                {!selectedMed ? (
                                    <EmptyPanel icon={<Pill className="h-10 w-10 text-muted-foreground" />} text="Select a medication to view details" />
                                ) : (
                                    <div className="space-y-5">
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                <Pill className="h-6 w-6" />
                                            </div>
                                            <div className="flex-1">
                                                <h2 className="text-lg font-semibold leading-tight">{selectedMed.name}</h2>
                                            </div>
                                            <span
                                                className={cn(
                                                    "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                                                    medStatusClass[selectedMed.status],
                                                )}
                                            >
                                                {selectedMed.status === "Available" ? (
                                                    <CheckCircle2 className="h-3 w-3" />
                                                ) : selectedMed.status === "Out of Stock" ? (
                                                    <XCircle className="h-3 w-3" />
                                                ) : (
                                                    <AlertTriangle className="h-3 w-3" />
                                                )}
                                                {selectedMed.status}
                                            </span>
                                        </div>

                                        <div className="rounded-lg border border-border bg-muted/30 p-4">
                                            <p className="text-xs uppercase tracking-wide text-muted-foreground">In stock</p>
                                            <p className="mt-1 text-2xl font-semibold">
                                                {selectedMed.quantity}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Seuil d'alerte</p>
                                            <p className="mt-1 text-sm">
                                                {selectedMed.seuilAlerte}
                                            </p>
                                        </div>

                                        <div className="border-t border-border pt-3 text-xs text-muted-foreground">
                                            Last updated: {formatDate(selectedMed.updatedAt)}
                                        </div>

                                        <div className="flex gap-2">
                                            <Button variant="outline" className="flex-1 gap-2" onClick={() => openEditMed(selectedMed)}>
                                                <Edit className="h-4 w-4" />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="flex-1 gap-2"
                                                onClick={() => setConfirmDeleteMedId(selectedMed.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        </div>
                    </TabsContent>

                    {/* MATERIALS TAB */}
                    <TabsContent value="materials" className="mt-0">
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
                            <Card className="overflow-hidden border-border">
                                <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            value={matSearch}
                                            onChange={(e) => setMatSearch(e.target.value)}
                                            placeholder="Search materials"
                                            className="pl-9"
                                        />
                                    </div>
                                    <Select
                                        value={matTypeFilter}
                                        onValueChange={(v) => setMatTypeFilter(v as MaterialType | "All")}
                                    >
                                        <SelectTrigger className="w-full sm:w-[150px]">
                                            <SelectValue placeholder="Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="All">All types</SelectItem>
                                            {materialTypes.map((t) => (
                                                <SelectItem key={t.id} value={t.code}>
                                                    {t.libelle}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select
                                        value={matStatusFilter}
                                        onValueChange={(v) => setMatStatusFilter(v as MaterialStatus | "All")}
                                    >
                                        <SelectTrigger className="w-full sm:w-[150px]">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="All">All</SelectItem>
                                            <SelectItem value="Available">Available</SelectItem>
                                            <SelectItem value="Low">Low</SelectItem>
                                            <SelectItem value="Out">Out</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                                <th className="px-4 py-3 font-medium">Name</th>
                                                <th className="px-4 py-3 font-medium">Type</th>
                                                <th className="px-4 py-3 font-medium">Quantity</th>
                                                <th className="px-4 py-3 font-medium">Status</th>
                                                <th className="px-4 py-3 text-right font-medium">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredMaterials.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                                                        No materials match your filters.
                                                    </td>
                                                </tr>
                                            )}
                                            {filteredMaterials.map((m) => (
                                                <tr
                                                    key={m.id}
                                                    onClick={() => setSelectedMatId(m.id)}
                                                    className={cn(
                                                        "cursor-pointer border-t border-border transition-colors hover:bg-muted/40",
                                                        selectedMatId === m.id && "bg-accent/40",
                                                    )}
                                                >
                                                    <td className="px-4 py-3 font-medium">{m.name}</td>
                                                    <td className="px-4 py-3 text-muted-foreground">{m.type}</td>
                                                    <td className="px-4 py-3">
                                                        <span
                                                            className={cn(
                                                                "font-medium",
                                                                m.status === "Out" && "text-red-600 dark:text-red-400",
                                                                m.status === "Low" && "text-amber-600 dark:text-amber-400",
                                                            )}
                                                        >
                                                            {m.quantity}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span
                                                            className={cn(
                                                                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                                                                matStatusClass[m.status],
                                                            )}
                                                        >
                                                            <span
                                                                className={cn(
                                                                    "h-1.5 w-1.5 rounded-full",
                                                                    m.status === "Available" && "bg-emerald-500",
                                                                    m.status === "Low" && "bg-amber-500",
                                                                    m.status === "Out" && "bg-red-500",
                                                                )}
                                                            />
                                                            {m.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openEditMat(m);
                                                                }}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setConfirmDeleteMatId(m.id);
                                                                }}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>

                            {/* Material Details */}
                            <Card className="h-fit border-border p-6">
                                {!selectedMat ? (
                                    <EmptyPanel icon={<Package className="h-10 w-10 text-muted-foreground" />} text="Select a material to view details" />
                                ) : (
                                    <div className="space-y-5">
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                <Package className="h-6 w-6" />
                                            </div>
                                            <div className="flex-1">
                                                <h2 className="text-lg font-semibold leading-tight">{selectedMat.name}</h2>
                                                <p className="text-xs text-muted-foreground">{selectedMat.type}</p>
                                            </div>
                                            <span
                                                className={cn(
                                                    "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                                                    matStatusClass[selectedMat.status],
                                                )}
                                            >
                                                {selectedMat.status}
                                            </span>
                                        </div>

                                        <div className="rounded-lg border border-border bg-muted/30 p-4">
                                            <p className="text-xs uppercase tracking-wide text-muted-foreground">In stock</p>
                                            <p className="mt-1 text-2xl font-semibold">{selectedMat.quantity}</p>
                                        </div>

                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Seuil d'alerte</p>
                                            <p className="mt-1 text-sm">
                                                {selectedMat.seuilAlerte}
                                            </p>
                                        </div>

                                        <div className="border-t border-border pt-3 text-xs text-muted-foreground">
                                            Last updated: {formatDate(selectedMat.updatedAt)}
                                        </div>

                                        <div className="flex gap-2">
                                            <Button variant="outline" className="flex-1 gap-2" onClick={() => openEditMat(selectedMat)}>
                                                <Edit className="h-4 w-4" />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="flex-1 gap-2"
                                                onClick={() => setConfirmDeleteMatId(selectedMat.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>

            {/* MED MODAL */}
            <Dialog open={medModalOpen} onOpenChange={setMedModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingMedId ? "Edit medication" : "Add medication"}</DialogTitle>
                        <DialogDescription>
                            {editingMedId ? "Update medication details." : "Add a new medication to the pharmacy."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-2">
                        <Field
                            label="Name"
                            error={medErrors.name}
                            input={
                                <Input
                                    value={medForm.name}
                                    onChange={(e) => setMedForm({ ...medForm, name: e.target.value })}
                                />
                            }
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <Field
                                label="Quantity"
                                error={medErrors.quantity}
                                input={
                                    <Input
                                        type="number"
                                        min={0}
                                        value={medForm.quantity}
                                        onChange={(e) =>
                                            setMedForm({ ...medForm, quantity: Number(e.target.value) })
                                        }
                                    />
                                }
                            />
                            <div className="space-y-1.5">
                                <Field
                                    label="Seuil d'alerte"
                                    error={medErrors.seuilAlerte}
                                    input={
                                        <Input
                                            type="number"
                                            min={0}
                                            value={medForm.seuilAlerte}
                                            onChange={(e) =>
                                                setMedForm({ ...medForm, seuilAlerte: Number(e.target.value) })
                                            }
                                        />
                                    }
                                />
                            </div>
                        </div>


                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMedModalOpen(false)}>
                            <X className="mr-1 h-4 w-4" />
                            Cancel
                        </Button>
                        <Button onClick={saveMed}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MAT MODAL */}
            <Dialog open={matModalOpen} onOpenChange={setMatModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingMatId ? "Edit material" : "Add material"}</DialogTitle>
                        <DialogDescription>
                            {editingMatId ? "Update material details." : "Add a new clinical material."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-2">
                        <Field
                            label="Name"
                            error={matErrors.name}
                            input={
                                <Input
                                    value={matForm.name}
                                    onChange={(e) => setMatForm({ ...matForm, name: e.target.value })}
                                />
                            }
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Type</Label>
                                <Select
                                    value={matForm.type}
                                    onValueChange={(v) => setMatForm({ ...matForm, type: v as MaterialType })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {materialTypes.map((t) => (
                                            <SelectItem key={t.id} value={t.code}>
                                                {t.libelle}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Field
                                label="Quantity"
                                error={matErrors.quantity}
                                input={
                                    <Input
                                        type="number"
                                        min={0}
                                        value={matForm.quantity}
                                        onChange={(e) =>
                                            setMatForm({ ...matForm, quantity: Number(e.target.value) })
                                        }
                                    />
                                }
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Field
                                label="Seuil d'alerte"
                                error={matErrors.seuilAlerte}
                                input={
                                    <Input
                                        type="number"
                                        min={0}
                                        value={matForm.seuilAlerte}
                                        onChange={(e) =>
                                            setMatForm({ ...matForm, seuilAlerte: Number(e.target.value) })
                                        }
                                    />
                                }
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMatModalOpen(false)}>
                            <X className="mr-1 h-4 w-4" />
                            Cancel
                        </Button>
                        <Button onClick={saveMat}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* DELETE CONFIRMS */}
            <AlertDialog
                open={!!confirmDeleteMedId}
                onOpenChange={(o) => !o && setConfirmDeleteMedId(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this medication?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove the medication from inventory.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmMedDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={!!confirmDeleteMatId}
                onOpenChange={(o) => !o && setConfirmDeleteMatId(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this material?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove the material from inventory.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmMatDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function EmptyPanel({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3">{icon}</div>
            <p className="text-sm text-muted-foreground">{text}</p>
        </div>
    );
}

function Field({
    label,
    error,
    input,
}: {
    label: string;
    error?: string;
    input: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            {input}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}