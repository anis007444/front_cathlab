import { useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Pill, Plus, Trash2, Package, Search, Loader2, Edit2, Eye } from "lucide-react";
import { InterventionData, Medication, UsedMaterial } from "@/types/intervention";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Props {
  data: InterventionData;
  onChange: (data: Partial<InterventionData>) => void;
  readOnly?: boolean;
  onNextStep?: (step?: number) => void;
  onPrevStep?: () => void;
}

const Treatment = ({ data, onChange, readOnly = false, onNextStep, onPrevStep }: Props) => {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);

  interface ApiMedication {
    id: number;
    nom: string;
    stockDisponible: number;
    seuilAlerte: number;
  }

  const [availableMedications, setAvailableMedications] = useState<ApiMedication[]>([]);

  useEffect(() => {
    const fetchTables = async () => {
      const interventionId = normalizeId(data?.interventionId);
      if (!interventionId) {
        onChange({ medications: [], materialsUsed: [] });
        return;
      }
      try {
        const [matRes, medRes, dictMatRes, dictMedRes] = await Promise.all([
          axios.get(`http://localhost:5106/api/interventions/${interventionId}/materiels`),
          axios.get(`http://localhost:5106/api/interventions/${interventionId}/medicaments`),
          axios.get(`http://localhost:5106/api/Materiels`),
          axios.get(`http://localhost:5106/api/Medicaments`)
        ]);

        const matsList = Array.isArray(matRes.data) ? matRes.data : [];
        const medsList = Array.isArray(medRes.data) ? medRes.data : [];
        const allMaterials = Array.isArray(dictMatRes.data) ? dictMatRes.data : [];
        const allMedications = Array.isArray(dictMedRes.data) ? dictMedRes.data : [];

        setAvailableMedications(allMedications);

        const mats = matsList.map((m: any) => {
          const dictMat = allMaterials.find((a: any) => a.id === m.materielId);
          return {
            id: m.id || 0,
            materielId: m.materielId,
            codeBarre: m.materiel?.codeBarre || dictMat?.codeBarre || m.codeBarre || "",
            designation: m.materiel?.designation || dictMat?.designation || m.designation || "Matériel",
            quantite: m.quantiteUtilisee || m.quantite || 1,
            typeMateriel: m.materiel?.typeMateriel || dictMat?.typeMateriel || "",
            stockDisponible: m.materiel?.stockDisponible || dictMat?.stockDisponible || 0,
            seuilAlerte: m.materiel?.seuilAlerte || dictMat?.seuilAlerte || 0
          };
        });

        const meds = medsList.map((m: any) => {
          const dictMed = allMedications.find((a: any) => a.id === m.medicamentId);
          return {
            id: (m.id || 0).toString(),
            name: m.medicament?.nom || dictMed?.nom || m.nom || "Médicament",
            dose: m.dose || ""
          };
        });

        onChange({ medications: meds, materialsUsed: mats });
      } catch (err: any) {
        console.error("Erreur récupération tables", err);
        handleError(err, "Erreur récupération tables");
      }
    };

    fetchTables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.interventionId]);

  const medications = data?.medications ?? [];
  const materialsUsed = data?.materialsUsed ?? [];

  const normalizeId = (id: any) => {
    const n = Number(id);
    return isNaN(n) ? 0 : n;
  };

  const handleError = (err: any, defaultMsg: string) => {
    let msg = defaultMsg;
    if (err?.response?.data) {
      if (typeof err.response.data === 'string') msg = err.response.data;
      else if (err.response.data.message) msg = err.response.data.message;
      else if (err.response.data.title) msg = err.response.data.title;
    } else if (err?.message) {
      msg = err.message;
    }
    toast({ variant: "destructive", title: "Erreur", description: msg });
  };

  // ========================= MEDICATION LOGIC
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [isMedViewOnly, setIsMedViewOnly] = useState(false);
  const [currentMed, setCurrentMed] = useState<Medication | null>(null);

  const handleOpenMedModal = (med?: Medication, viewOnly = false) => {
    setIsMedViewOnly(viewOnly);
    setCurrentMed(med ? { ...med } : { id: "0", name: "", dose: "" });
    setIsMedModalOpen(true);
  };

  const handleSaveMedication = async () => {
    if (!currentMed?.name?.trim()) return;

    try {
      const interventionId = normalizeId(data?.interventionId);
      const selected = availableMedications.find(m => m.nom === currentMed.name);
      const medicamentId = selected?.id ?? 0;

      let finalMed = { ...currentMed };
      const id = normalizeId(currentMed.id);
      const isNew = id === 0;

      if (!isNew) {
        await axios.put(`http://localhost:5106/api/interventions/${interventionId}/medicaments/${id}`, {
          id,
          interventionId,
          medicamentId,
          dose: currentMed.dose
        });
      } else {
        const res = await axios.post(`http://localhost:5106/api/interventions/${interventionId}/medicaments`, {
          medicamentId,
          interventionId,
          dose: currentMed.dose
        });

        if (res.data?.id) finalMed.id = res.data.id.toString();
        else if (Array.isArray(res.data) && res.data[0]?.id) finalMed.id = res.data[0].id.toString();
        else if (res.data?.medicaments?.[0]?.id) finalMed.id = res.data.medicaments[0].id.toString();
      }

      const updated = medications.find(m => m.id === currentMed.id);
      onChange({
        medications: updated
          ? medications.map(m => m.id === currentMed.id ? finalMed : m)
          : [...medications, finalMed]
      });

      setIsMedModalOpen(false);
      setCurrentMed(null);
      toast({ title: "Succès", description: "Médicament enregistré" });
    } catch (e: any) {
      handleError(e, "Enregistrement du médicament échoué");
    }
  };

  const removeMedication = async (id: string) => {
    try {
      const nid = normalizeId(id);
      if (nid > 0) {
        const interventionId = normalizeId(data?.interventionId);
        await axios.delete(`http://localhost:5106/api/interventions/${interventionId}/medicaments/${nid}`);
      }
      onChange({ medications: medications.filter(m => normalizeId(m.id) !== nid) });
      toast({ title: "Succès", description: "Médicament supprimé" });
    } catch (e: any) {
      handleError(e, "Suppression du médicament échouée");
    }
  };

  // ========================= MATERIAL LOGIC
  const [isMatModalOpen, setIsMatModalOpen] = useState(false);
  const [isMatViewOnly, setIsMatViewOnly] = useState(false);
  const [currentMat, setCurrentMat] = useState<UsedMaterial | null>(null);

  const handleOpenMatModal = (mat?: UsedMaterial, viewOnly = false) => {
    setIsMatViewOnly(viewOnly);
    setCurrentMat(mat ?? {
      id: 0,
      designation: "",
      typeMateriel: "",
      stockDisponible: 0,
      seuilAlerte: 0,
      codeBarre: "",
      quantite: 1
    });
    setIsMatModalOpen(true);
  };

  const handleSaveMaterial = async () => {
    if (!currentMat?.designation?.trim()) return;

    try {
      const interventionId = normalizeId(data?.interventionId);
      let finalMat = { ...currentMat };

      const id = normalizeId(currentMat.id);
      const isNew = id === 0;

      if (!isNew) {
        await axios.put(`http://localhost:5106/api/interventions/${interventionId}/materiels/${id}`, {
          id,
          materielId: normalizeId((currentMat as any).materielId || currentMat.id),
          interventionId: normalizeId(interventionId),
          quantiteUtilisee: normalizeId(currentMat.quantite || 1)
        });
      } else {
        const res = await axios.post(`http://localhost:5106/api/interventions/${interventionId}/materiels`, {
          materielId: normalizeId((currentMat as any).materielId),
          interventionId: normalizeId(interventionId),
          quantiteUtilisee: normalizeId(currentMat.quantite || 1)
        });
        if (res.data?.id) finalMat.id = res.data.id;
      }

      const updated = materialsUsed.find(m => m.id === finalMat.id);
      onChange({
        materialsUsed: updated
          ? materialsUsed.map(m => m.id === finalMat.id ? finalMat : m)
          : [...materialsUsed, finalMat]
      });

      setIsMatModalOpen(false);
      setCurrentMat(null);
      toast({ title: "Succès", description: "Matériel enregistré" });
    } catch (e: any) {
      handleError(e, "Enregistrement du matériel échoué");
    }
  };

  const removeMaterial = async (mat: UsedMaterial) => {
    try {
      const id = normalizeId(mat.id);
      if (id > 0) {
        const interventionId = normalizeId(data?.interventionId);
        await axios.delete(`http://localhost:5106/api/interventions/${interventionId}/materiels/${id}`);
      }
      onChange({ materialsUsed: materialsUsed.filter(m => normalizeId(m.id) !== id) });
      toast({ title: "Succès", description: "Matériel supprimé" });
    } catch (e: any) {
      handleError(e, "Suppression du matériel échouée");
    }
  };

  const handleScanBarcode = async () => {
    if (!currentMat?.codeBarre?.trim()) return;
    setIsScanning(true);
    try {
      const res = await axios.get(`http://localhost:5106/api/Materiels/code-barre/${currentMat.codeBarre}`);
      setCurrentMat(prev => {
        if (!prev) return prev;
        const { id, ...restData } = res.data;
        return {
          ...prev,
          ...restData,
          materielId: res.data.id,
          quantite: prev.quantite || 1
        };
      });
    } catch (e: any) {
      handleError(e, "Erreur lors de la recherche du code-barre");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Traitement</h2>

      {/* Medications */}
      <div className="clinical-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill size={18} className="text-primary" />
            <span className="font-medium text-foreground">Médicaments</span>
          </div>
          <button
            onClick={() => handleOpenMedModal()}
            disabled={readOnly}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={14} /> Ajouter
          </button>
        </div>

        {medications.length === 0 ? (
          <p className="text-muted-foreground text-sm py-6 text-center">Aucun médicament ajouté</p>
        ) : (
          <div className="border rounded-md mt-4 max-h-[350px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead>Nom du médicament</TableHead>
                  <TableHead>Dose</TableHead>
                  <TableHead className="w-[80px] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {medications.map((med) => (
                  <TableRow key={med.id}>
                    <TableCell className="font-medium">{med.name}</TableCell>
                    <TableCell>{med.dose}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenMedModal(med, true)}
                          className="p-1.5 rounded text-emerald-500 hover:bg-emerald-500/10 transition-colors inline-flex"
                          title="Voir"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenMedModal(med)}
                          disabled={readOnly}
                          className="p-1.5 rounded text-blue-500 hover:bg-blue-500/10 transition-colors inline-flex disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Modifier"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => removeMedication(med.id)}
                          disabled={readOnly}
                          className="p-1.5 rounded text-destructive hover:bg-destructive/10 transition-colors inline-flex disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={isMedModalOpen} onOpenChange={setIsMedModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isMedViewOnly
                  ? "Détails du médicament"
                  : currentMed && medications.find(m => m.id === currentMed.id)
                    ? "Modifier le médicament"
                    : "Ajouter un médicament"}
              </DialogTitle>
            </DialogHeader>
            {currentMed && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Nom du médicament</span>
                  <Select disabled={isMedViewOnly} value={currentMed.name} onValueChange={(v) => setCurrentMed({ ...currentMed, name: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un médicament" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMedications.map((m) => (
                        <SelectItem key={m.id} value={m.nom}>{m.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Dose</span>
                    <Input
                      disabled={isMedViewOnly}
                      placeholder="ex. 100mg"
                      value={currentMed.dose}
                      onChange={(e) => setCurrentMed({ ...currentMed, dose: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsMedModalOpen(false)}>
                {isMedViewOnly ? "Fermer" : "Annuler"}
              </Button>
              {!isMedViewOnly && (
                <Button onClick={handleSaveMedication}>Enregistrer</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Matériel Utilisé */}
      <div className="clinical-card space-y-4 shadow-sm border border-border/50 bg-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-primary" />
            <span className="font-medium text-foreground">Matériel Utilisé</span>
          </div>
          <button
            onClick={() => handleOpenMatModal()}
            disabled={readOnly}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={14} /> Ajouter
          </button>
        </div>

        {(!materialsUsed || materialsUsed.length === 0) ? (
          <p className="text-muted-foreground text-sm py-4 text-center">Aucun matériel scanné</p>
        ) : (
          <div className="border rounded-md mt-4 max-h-[300px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead>Désignation</TableHead>
                  <TableHead>Code-barre</TableHead>
                  <TableHead className="text-center">Quantité</TableHead>
                  <TableHead className="w-[80px] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materialsUsed.map((mat) => (
                  <TableRow key={mat.id}>
                    <TableCell className="font-medium text-sm">{mat.designation}</TableCell>
                    <TableCell className="text-sm">{mat.codeBarre}</TableCell>
                    <TableCell className="text-center text-sm">{mat.quantite}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenMatModal(mat, true)}
                          className="p-1.5 rounded-md text-emerald-500 hover:bg-emerald-500/10 transition-colors inline-flex"
                          title="Voir"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenMatModal(mat)}
                          disabled={readOnly}
                          className="p-1.5 rounded-md text-blue-500 hover:bg-blue-500/10 transition-colors inline-flex disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Modifier"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => removeMaterial(mat)}
                          disabled={readOnly}
                          className="p-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors inline-flex disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Material Dialog */}
        <Dialog open={isMatModalOpen} onOpenChange={setIsMatModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isMatViewOnly
                  ? "Détails du matériel"
                  : currentMat && materialsUsed.find(m => m.id === currentMat.id)
                    ? "Modifier le matériel"
                    : "Ajouter un matériel manuellement"}
              </DialogTitle>
            </DialogHeader>
            {currentMat && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-[1fr,auto] gap-2 items-end">
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Code-barre</span>
                    <Input
                      disabled={isMatViewOnly}
                      placeholder="Scanner ou saisir le code-barre"
                      value={currentMat.codeBarre}
                      onChange={(e) => setCurrentMat({ ...currentMat, codeBarre: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && !isMatViewOnly && handleScanBarcode()}
                    />
                  </div>
                  <Button
                    onClick={handleScanBarcode}
                    disabled={isScanning || !currentMat.codeBarre.trim() || isMatViewOnly}
                    className="flex gap-2"
                  >
                    {isScanning ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    Chercher
                  </Button>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Désignation du matériel</span>
                  <Input
                    placeholder="Désignation"
                    value={currentMat.designation || ""}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Stock Disponible</span>
                    <Input
                      value={currentMat.stockDisponible !== undefined ? currentMat.stockDisponible : ""}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Quantité</span>
                    <Input
                      disabled={isMatViewOnly}
                      type="number"
                      min="1"
                      max={currentMat.stockDisponible || undefined}
                      value={currentMat.quantite || 1}
                      onChange={(e) => setCurrentMat({ ...currentMat, quantite: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsMatModalOpen(false)}>
                {isMatViewOnly ? "Fermer" : "Annuler"}
              </Button>
              {!isMatViewOnly && (
                <Button onClick={handleSaveMaterial}>Enregistrer</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
        <Button variant="outline" onClick={onPrevStep}>
          Retour
        </Button>
        <Button onClick={() => onNextStep?.()}>
          Suivant
        </Button>
      </div>
    </div>
  );
};

export default Treatment;