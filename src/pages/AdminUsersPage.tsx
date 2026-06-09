import { useMemo, useState, useEffect } from "react";
import axios from "axios";
import {
    User as UserIcon,
    Edit,
    Trash2,
    Plus,
    Search,
    Mail,
    Shield,
    Stethoscope,
    ClipboardList,
    X,
    CheckCircle2,
    XCircle,
    Pill,
} from "lucide-react";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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

type Role = "Admin" | "Medecin" | "Secretaire" | "Pharmacien";
type Status = "Active" | "Inactive";

interface AppUser {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
    status: Status;
}


const roleIcon: Record<Role, React.ReactNode> = {
    Admin: <Shield className="h-3.5 w-3.5" />,
    Medecin: <Stethoscope className="h-3.5 w-3.5" />,
    Secretaire: <ClipboardList className="h-3.5 w-3.5" />,
    Pharmacien: <Pill className="h-3.5 w-3.5" />,
};

const roleBadgeClass: Record<Role, string> = {
    Admin: "bg-primary/10 text-primary border border-primary/20",
    Medecin: "bg-accent text-accent-foreground border border-accent-foreground/10",
    Secretaire: "bg-secondary text-secondary-foreground border border-border",
    Pharmacien: "bg-orange-500/10 text-orange-500 border border-orange-500/20",
};

function initials(u: AppUser) {
    return (u.firstName[0] ?? "") + (u.lastName[0] ?? "");
}

function formatDate(iso: string) {
    if (!iso) return "—";
    const d = new Date(iso);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${months[d.getUTCMonth()]} ${pad(d.getUTCDate())}, ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

interface FormState {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: Role;
    status: Status;
}

const emptyForm: FormState = {
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "Medecin",
    status: "Active",
};

export function AdminUsersPage() {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState<Role | "All">("All");
    const [statusFilter, setStatusFilter] = useState<Status | "All">("All");
    const [pageNumber, setPageNumber] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

    const [confirmDisableId, setConfirmDisableId] = useState<string | null>(null);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get("http://localhost:5106/api/Account/users", {
                params: {
                    PageNumber: pageNumber,
                    PageSize: pageSize,
                },
            });

            const usersData = Array.isArray(response.data)
                ? response.data
                : response.data?.items ?? response.data?.users ?? [];
            const total = response.data?.totalCount ?? response.data?.totalItems ?? usersData.length;

                const mappedUsers: AppUser[] = usersData.map((item: any) => {
                    const full = (item.FullName ?? item.fullName ?? item.name ?? `${item.firstName ?? ""} ${item.lastName ?? ""}`).trim();
                    const parts = full.split(/\s+/).filter(Boolean);
                    const first = parts.shift() ?? "";
                    const last = parts.length ? parts.join(" ") : "";

                    return {
                        id: item.id ?? item.userId ?? item.user_id ?? "",
                        firstName: first,
                        lastName: last,
                        email: item.email ?? item.emailAddress ?? item.emailAddress ?? "",
                        role: item.role ?? item.roleName ?? "Medecin",
                        status: item.isActive === false ? "Inactive" : item.isActive === true ? "Active" : item.status ?? "Active",
                        lastLogin: item.lastLogin ?? item.last_login ?? "",
                    };
                });

            setUsers(mappedUsers);
            setTotalItems(Number(total) || mappedUsers.length);
            if (!selectedId && mappedUsers.length > 0) {
                setSelectedId(mappedUsers[0].id);
            }
        } catch (error) {
            console.error("Failed to load users:", error);
            toast.error("Impossible de charger la liste des utilisateurs.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [pageNumber, pageSize]);

    const filtered = useMemo(() => {
        return users.filter((u) => {
            const q = search.trim().toLowerCase();
            const matchesQ =
                !q ||
                `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q);
            const matchesRole = roleFilter === "All" || u.role === roleFilter;
            const matchesStatus = statusFilter === "All" || u.status === statusFilter;
            return matchesQ && matchesRole && matchesStatus;
        });
    }, [users, search, roleFilter, statusFilter]);

    const selected = users.find((u) => u.id === selectedId) ?? null;

    function openCreate() {
        setEditingId(null);
        setForm(emptyForm);
        setErrors({});
        setModalOpen(true);
    }

    function openEdit(u: AppUser) {
        setEditingId(u.id);
        setForm({
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            password: "",
            role: u.role,
            status: u.status,
        });
        setErrors({});
        setModalOpen(true);
    }

    function validate(): boolean {
        const e: Partial<Record<keyof FormState, string>> = {};
        if (!form.firstName.trim()) e.firstName = "Required";
        if (!form.lastName.trim()) e.lastName = "Required";
        if (!form.email.trim()) e.email = "Required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
        if (!editingId && form.password.length < 6)
            e.password = "Min 6 characters";
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    async function handleSave() {
        if (!validate()) {
            toast.error("Please fix the errors in the form.");
            return;
        }

        const payload = {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            role: form.role,
            isActive: form.status === "Active",
        };

        if (!editingId) {
            (payload as any).password = form.password;
        } else if (form.password) {
            (payload as any).password = form.password;
        }

        try {
            if (editingId) {
                await axios.put(`http://localhost:5106/api/Account/update/${editingId}`, payload);
                toast.success("User updated successfully.");
            } else {
                await axios.post("http://localhost:5106/api/Account/register", payload);
                toast.success("User created successfully.");
            }

            setModalOpen(false);
            await fetchUsers();
        } catch (error) {
            console.error("Error saving user:", error);
            toast.error("Erreur lors de l'enregistrement de l'utilisateur. Veuillez réessayer.");
        }
    }

    async function toggleStatus(u: AppUser, next: boolean) {
        if (!next && u.role === "Admin") {
            toast.error("Admin users cannot be disabled.");
            return;
        }
        if (!next) {
            setConfirmDisableId(u.id);
            return;
        }

        try {
            const response = await axios.patch(`http://localhost:5106/api/Account/toggle-status/${u.id}`);
            const isActive = response.data?.isActive;
            
            setUsers((prev) =>
                prev.map((x) =>
                    x.id === u.id ? { ...x, status: isActive ? "Active" : "Inactive" } : x
                ),
            );
            toast.success(`${u.firstName} ${u.lastName} ${isActive ? "activated" : "disabled"}.`);
        } catch (error) {
            console.error("Error toggling user status:", error);
            toast.error("Erreur lors du changement de statut.");
        }
    }

    async function confirmDisable() {
        if (!confirmDisableId) return;
        const u = users.find((x) => x.id === confirmDisableId);
        if (!u) return;

        try {
            const response = await axios.patch(`http://localhost:5106/api/Account/toggle-status/${confirmDisableId}`);
            const isActive = response.data?.isActive;
            
            setUsers((prev) =>
                prev.map((x) =>
                    x.id === confirmDisableId ? { ...x, status: isActive ? "Active" : "Inactive" } : x,
                ),
            );
            toast.success(`${u.firstName} ${u.lastName} ${isActive ? "activated" : "disabled"}.`);
        } catch (error) {
            console.error("Error toggling user status:", error);
            toast.error("Erreur lors du changement de statut.");
        } finally {
            setConfirmDisableId(null);
        }
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <AppHeader />
            <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur">
                <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-4">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">User Management</h1>
                        <p className="text-xs text-muted-foreground">
                            Manage clinical staff accounts and access
                        </p>
                    </div>
                    <Button onClick={openCreate} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add User
                    </Button>
                </div>
            </header>

            <main className="mx-auto max-w-[1400px] px-6 py-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
                    {/* LEFT: Users table */}
                    <Card className="overflow-hidden border-border">
                        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by name or email"
                                    className="pl-9"
                                />
                            </div>
                            <Select
                                value={roleFilter}
                                onValueChange={(v) => setRoleFilter(v as Role | "All")}
                            >
                                <SelectTrigger className="w-full sm:w-[150px]">
                                    <SelectValue placeholder="Role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All roles</SelectItem>
                                    <SelectItem value="Admin">Admin</SelectItem>
                                    <SelectItem value="Medecin">Medecin</SelectItem>
                                    <SelectItem value="Secretaire">Secretaire</SelectItem>
                                    <SelectItem value="Pharmacien">Pharmacien</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={statusFilter}
                                onValueChange={(v) => setStatusFilter(v as Status | "All")}
                            >
                                <SelectTrigger className="w-full sm:w-[150px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All statuses</SelectItem>
                                    <SelectItem value="Active">Active</SelectItem>
                                    <SelectItem value="Inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                        <th className="px-4 py-3 font-medium">Name</th>
                                        <th className="px-4 py-3 font-medium">Email</th>
                                        <th className="px-4 py-3 font-medium">Role</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        
                                        <th className="px-4 py-3 text-right font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                                                {isLoading ? "Chargement des utilisateurs..." : "No users match your filters."}
                                            </td>
                                        </tr>
                                    )}
                                    {filtered.map((u) => (
                                        <tr
                                            key={u.id}
                                            onClick={() => setSelectedId(u.id)}
                                            className={cn(
                                                "cursor-pointer border-t border-border transition-colors hover:bg-muted/40",
                                                selectedId === u.id && "bg-accent/40",
                                            )}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                                        {initials(u)}
                                                    </div>
                                                    <span className="font-medium">
                                                        {u.firstName} {u.lastName}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                                            <td className="px-4 py-3">
                                                <Badge
                                                    variant="outline"
                                                    className={cn("gap-1 font-medium", roleBadgeClass[u.role])}
                                                >
                                                    {roleIcon[u.role]}
                                                    {u.role}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                                                        u.status === "Active"
                                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                            : "bg-muted text-muted-foreground",
                                                    )}
                                                >
                                                    <span
                                                        className={cn(
                                                            "h-1.5 w-1.5 rounded-full",
                                                            u.status === "Active" ? "bg-emerald-500" : "bg-muted-foreground/50",
                                                        )}
                                                    />
                                                    {u.status}
                                                </span>
                                            </td>
                                            
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openEdit(u);
                                                        }}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        disabled={u.role === "Admin"}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleStatus(u, u.status !== "Active");
                                                        }}
                                                        title={u.role === "Admin" ? "Admin cannot be disabled" : ""}
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

                        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-sm text-muted-foreground">
                                Affichage de {Math.min((pageNumber - 1) * pageSize + 1, totalItems)} - {Math.min(pageNumber * pageSize, totalItems)} sur {totalItems}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={pageNumber === 1 || isLoading}
                                    onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
                                >
                                    Préc
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={pageNumber >= Math.ceil(totalItems / pageSize) || isLoading}
                                    onClick={() => setPageNumber((prev) => Math.min(Math.ceil(totalItems / pageSize), prev + 1))}
                                >
                                    Suiv
                                </Button>
                                <Select
                                    value={String(pageSize)}
                                    onValueChange={(v) => {
                                        setPageSize(Number(v));
                                        setPageNumber(1);
                                    }}
                                >
                                    <SelectTrigger className="w-[100px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10 / page</SelectItem>
                                        <SelectItem value="20">20 / page</SelectItem>
                                        <SelectItem value="50">50 / page</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </Card>

                    {/* RIGHT: Details panel */}
                    <Card className="h-fit border-border p-6">
                        {!selected ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <UserIcon className="mb-3 h-10 w-10 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">
                                    Select a user to view details
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                <div className="flex flex-col items-center text-center">
                                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
                                        {initials(selected)}
                                    </div>
                                    <h2 className="mt-3 text-lg font-semibold">
                                        {selected.firstName} {selected.lastName}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">{selected.email}</p>
                                    <Badge
                                        variant="outline"
                                        className={cn("mt-2 gap-1", roleBadgeClass[selected.role])}
                                    >
                                        {roleIcon[selected.role]}
                                        {selected.role}
                                    </Badge>
                                </div>

                                <div className="rounded-lg border border-border bg-muted/30 p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium">Account status</p>
                                            <p className="text-xs text-muted-foreground">
                                                {selected.status === "Active"
                                                    ? "User can sign in"
                                                    : "Sign-in disabled"}
                                            </p>
                                        </div>
                                        <Switch
                                            checked={selected.status === "Active"}
                                            onCheckedChange={(v) => toggleStatus(selected, v)}
                                            disabled={selected.role === "Admin" && selected.status === "Active"}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3 text-sm">
                                    <DetailRow icon={<Mail className="h-4 w-4" />} label="Email" value={selected.email} />
                                    
                                    
                                    <DetailRow
                                        icon={
                                            selected.status === "Active" ? (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-muted-foreground" />
                                            )
                                        }
                                        label="Status"
                                        value={selected.status}
                                    />
                                </div>


                            </div>
                        )}
                    </Card>
                </div>
            </main>

            {/* Create / Edit modal */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>{editingId ? "Edit user" : "Add new user"}</DialogTitle>
                        <DialogDescription>
                            {editingId
                                ? "Update the user's details below."
                                : "Create a new staff account for the clinic."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <Field
                                label="First name"
                                error={errors.firstName}
                                input={
                                    <Input
                                        value={form.firstName}
                                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                                    />
                                }
                            />
                            <Field
                                label="Last name"
                                error={errors.lastName}
                                input={
                                    <Input
                                        value={form.lastName}
                                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                                    />
                                }
                            />
                        </div>

                        <Field
                            label="Email"
                            error={errors.email}
                            input={
                                <Input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                />
                            }
                        />

                        {!editingId && (
                            <Field
                                label="Password"
                                error={errors.password}
                                input={
                                    <Input
                                        type="password"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    />
                                }
                            />
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Role</Label>
                                <Select
                                    value={form.role}
                                    onValueChange={(v) => setForm({ ...form, role: v as Role })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Admin">Admin</SelectItem>
                                        <SelectItem value="Medecin">Medecin</SelectItem>
                                        <SelectItem value="Secretaire">Secretaire</SelectItem>
                                        <SelectItem value="Pharmacien">Pharmacien</SelectItem>

                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Status</Label>
                                <div className="flex h-9 items-center justify-between rounded-md border border-input bg-background px-3">
                                    <span className="text-sm text-muted-foreground">
                                        {form.status === "Active" ? "Active" : "Inactive"}
                                    </span>
                                    <Switch
                                        checked={form.status === "Active"}
                                        onCheckedChange={(v) =>
                                            setForm({ ...form, status: v ? "Active" : "Inactive" })
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModalOpen(false)}>
                            <X className="mr-1 h-4 w-4" />
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Disable confirmation */}
            <AlertDialog
                open={!!confirmDisableId}
                onOpenChange={(o) => !o && setConfirmDisableId(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Disable this user?</AlertDialogTitle>
                        <AlertDialogDescription>
                            The user will no longer be able to sign in. You can re-enable
                            them at any time.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDisable}>Disable</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function DetailRow({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-2 last:border-0 last:pb-0">
            <div className="flex items-center gap-2 text-muted-foreground">
                {icon}
                <span>{label}</span>
            </div>
            <span className="text-right font-medium">{value}</span>
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