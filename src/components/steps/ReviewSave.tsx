import axios from "axios";
import { ClipboardCheck, Save, FileDown, FileCheck, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { InterventionData } from "@/types/intervention";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface InterventionType {
  id: number;
  code: string;
  libelle: string;
}

interface Indication {
  id: number;
  code: string;
  libelle: string;
  categorie: string;
}
interface Props {
  data: InterventionData;
  onNavigateToStep?: (step: number) => void;
  onPrevStep?: () => void;
}

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">{label}</h3>
    <div className="bg-muted/50 rounded-md p-3 text-sm space-y-1">{children}</div>
  </div>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-foreground font-medium">{value || "—"}</span>
  </div>
);

const ReviewSave = ({ data, onNavigateToStep, onPrevStep }: Props) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReportGenerated, setIsReportGenerated] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [interventionTypes, setInterventionTypes] = useState<InterventionType[]>([]);
  const [indications, setIndications] = useState<Indication[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchTypes = async () => {
      try {
        const response = await axios.get<InterventionType[]>(
          "http://localhost:5106/api/TypeInterventions",
          { signal: controller.signal }
        );
        setInterventionTypes(response.data ?? []);
      } catch (error) {
        if (!axios.isCancel(error)) {
          console.error("Erreur TypeInterventions:", error);
        }
      }
    };

    const fetchIndications = async () => {
      try {
        const response = await axios.get<Indication[]>(
          "http://localhost:5106/api/Indications",
          { signal: controller.signal }
        );
        setIndications(response.data ?? []);
      } catch (error) {
        if (!axios.isCancel(error)) {
          console.error("Erreur Indications:", error);
        }
      }
    };

    fetchTypes();
    fetchIndications();

    return () => controller.abort();
  }, []);

  const getInterventionTypeLabel = (id?: number) => {
    if (!id) return "";
    return interventionTypes.find((t) => t.id === id)?.libelle || "";
  };

  const getIndicationLabel = (id?: number) => {
    if (!id) return "";
    return indications.find((i) => i.id === id)?.libelle || "";
  };

  const startTimeValue = data.HeureDebut || data.interventionStartTime || "";
  const endTimeValue = data.HeureFin || data.interventionEndTime || "";
  const contrastNameValue = data.ProduitContraste || data.contrastProduct?.name || "";
  const contrastVolumeValue = data.DoseContraste ?? data.contrastProduct?.volume ?? "";
  const contrastVolumeLabel = contrastVolumeValue !== "" && contrastVolumeValue !== 0
    ? `${contrastVolumeValue} ml`
    : "";

  const handleGenerateReport = async () => {
  if (!data.interventionId) {
    toast.error("ID d'intervention manquant");
    return;
  }

  setIsGenerating(true);

  try {
    const schemaImage = sessionStorage.getItem("schemaImage");

    await axios.post(
      `http://localhost:5106/api/Rapport/generate`,
      {
        interventionId: data.interventionId,
        schemaImageBase64: schemaImage
      }
    );

    setIsReportGenerated(true);
    toast.success("Rapport généré avec succès !");
  } catch (error) {
    console.error(error);
    toast.error("Erreur génération rapport");
  } finally {
    setIsGenerating(false);
  }
};

  const handleDownloadAndClose = () => {
    const downloadUrl = `http://localhost:5106/api/Rapport/download/${data.interventionId}`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("target", "_blank");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onNavigateToStep) {
      onNavigateToStep(1); // Retour à la page PatientStudy.tsx
    }
  };

  const uploadFile = async (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post(
        "http://localhost:5106/api/settings/upload-logo",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            if (!progressEvent.total) return;
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        }
      );

      toast.success("Logo uploaded !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du chargement du logo.");
    }
  };

  const handleUploadLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (isReportGenerated) {
    return (
      <div className="animate-fade-in space-y-6 flex flex-col items-center justify-center py-16 bg-card rounded-lg border border-border">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2 shadow-sm ring-8 ring-emerald-50">
          <FileCheck size={40} />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Rapport généré avec succès !</h2>
        <p className="text-muted-foreground text-center max-w-md leading-relaxed">
          Le rapport d'intervention a été correctement généré et enregistré. Vous pouvez maintenant le télécharger au format PDF.
        </p>
        
        <div className="mt-8 flex w-full max-w-sm justify-center">
          <Button onClick={handleDownloadAndClose} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 px-6 py-6 text-base font-medium shadow-md">
            <FileDown size={22} />
            Télécharger & Fermer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-2">
        <ClipboardCheck size={22} className="text-primary" />
        <h2 className="text-xl font-semibold text-foreground">Résumé de l'intervention</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="clinical-card space-y-4">
          <Section label="Patient">
            <Row label="Nom" value={data.patientName} />
            <Row label="Date de naissance" value={data.patientDOB} />
            <Row label="Sexe" value={data.patientSex} />
          </Section>
        </div>
        <div className="clinical-card space-y-4">
          <Section label="Intervention">
            <Row label="Date" value={data.interventionDate ? data.interventionDate.split('T')[0] : ""} />
            <Row label="Heure de début" value={startTimeValue} />
            <Row label="Heure de fin" value={endTimeValue} />
            <Row label="Voie d'accès" value={data.voieAcces} />
            <Row label="Indication" value={getIndicationLabel(data.indicationId)} />
            <Row label="Type intervention" value={getInterventionTypeLabel(data.typeInterventionId)} />
            <Row label="Contraste" value={contrastNameValue} />
            <Row label="Volume" value={contrastVolumeLabel} />
          </Section>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="clinical-card space-y-4">
          <Section label="Traitement">
            {!data.medications || data.medications.length === 0 ? (
              <p className="text-muted-foreground text-xs italic">Aucun médicament ajouté</p>
            ) : (
              <div className="space-y-2">
                <span className="text-muted-foreground text-xs font-semibold">Médicaments:</span>
                {data.medications.map((m, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-muted-foreground">{m.name}</span>
                    <span className="text-foreground font-medium">{m.dose}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between pt-2 mt-2 border-t border-border">
              <span className="text-muted-foreground">Matériels utilisés</span>
              <span className="text-foreground font-medium">
                {!data.materialsUsed || data.materialsUsed.length === 0
                  ? "—"
                  : data.materialsUsed.map((mat, i) => `${mat.designation} (x${mat.quantite})`).join(", ")}
              </span>
            </div>
          </Section>
        </div>
        <div className="clinical-card space-y-4">
          <Section label="Conclusion">
            <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {data.conclusion || "—"}
            </div>
          </Section>
        </div>
      </div>

      <div className="clinical-card space-y-4">
        <p className="text-muted-foreground text-sm">
          Vérifiez le résumé avant de sauvegarder. L'intervention sera enregistrée et un rapport pourra être généré.
        </p>
        <div className="flex flex-col gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            onChange={handleUploadLogo}
            className="hidden"
          />

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full rounded-md p-4 border-2 border-dashed cursor-pointer flex items-center gap-4 ${isDragging ? "border-primary bg-primary/5" : "border-border bg-card"}`}
            role="button"
            tabIndex={0}
          >
            <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center bg-muted rounded-md">
              {previewUrl ? (
                <img src={previewUrl} alt="preview" className="w-16 h-16 object-cover rounded-md" />
              ) : (
                <FileCheck size={28} className="text-muted-foreground" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedFile ? selectedFile.name : "Glisser-déposer le logo"}</p>
                  <p className="text-sm text-muted-foreground">PNG ou JPEG — clic pour sélectionner</p>
                </div>
                {selectedFile && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{uploadProgress > 0 ? `${uploadProgress}%` : "Prêt"}</p>
                  </div>
                )}
              </div>

              {selectedFile && (
                <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-2 bg-emerald-500" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="flex-1"
            >
              Choisir un fichier
            </Button>

            <Button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="flex-1"
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
              <span className="ml-2">{isGenerating ? "Génération..." : "Générer le rapport"}</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-start items-center mt-6 pt-4 border-t border-border">
        <Button variant="outline" onClick={onPrevStep}>
          Retour
        </Button>
      </div>
    </div>
  );
};

export default ReviewSave;