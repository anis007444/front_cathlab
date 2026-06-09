import axios from "axios";
import { Stethoscope, Calendar, CheckCircle, Droplets } from "lucide-react";
import { InterventionData } from "@/types/intervention";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface Props {
  data: InterventionData;
  onChange: (data: Partial<InterventionData>) => void;
  onNextStep?: (step?: number) => void;
  onPrevStep?: () => void;
}

const PROCEDURES = [
  "PCI - Single Vessel",
  "PCI - Multi Vessel",
  "Diagnostic Angiography",
  "PTCA",
  "Rotablation",
  "IVUS Guided PCI",
  "FFR Guided PCI",
];

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

const InterventionDetails = ({ data, onChange, onNextStep, onPrevStep }: Props) => {
  const [openDatePicker, setOpenDatePicker] = useState(false);
  const [interventionTypes, setInterventionTypes] = useState<InterventionType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [typesError, setTypesError] = useState<string | null>(null);
  const [indications, setIndications] = useState<Indication[]>([]);
  const [loadingIndications, setLoadingIndications] = useState(true);
  const [indicationsError, setIndicationsError] = useState<string | null>(null);
  const [creatingIntervention, setCreatingIntervention] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(!data.interventionId);
  const contrastOptions = [
  "Iodé non ionique",
  "Iodé ionique",
  "Gadolinium",
  "Baryté",
  "CO2"
 
];
  const interventionDate = data.interventionDate
    ? new Date(data.interventionDate)
    : new Date();

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      onChange({ interventionDate: date.toISOString() });
      setOpenDatePicker(false);
    }
  };

  const formatTimeSpan = (value?: string) => {
    if (!value) return undefined;
    const parts = value.trim().split(":").filter(Boolean);
    if (parts.length === 2) {
      return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}:00`;
    }
    if (parts.length === 3) {
      return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}:${parts[2].padStart(2, "0")}`;
    }
    return value;
  };

  useEffect(() => {
    const controller = new AbortController();

    const fetchTypes = async () => {
      try {
        setLoadingTypes(true);
        setTypesError(null);

        const response = await axios.get<InterventionType[]>(
          "http://localhost:5106/api/TypeInterventions",
          { signal: controller.signal }
        );

        setInterventionTypes(response.data ?? []);
      } catch (error) {
        if (!axios.isCancel(error)) {
          setTypesError("Impossible de charger les types d'intervention.");
          console.error(error);
        }
      } finally {
        setLoadingTypes(false);
      }
    };

    fetchTypes();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const fetchIndications = async () => {
      try {
        setLoadingIndications(true);
        setIndicationsError(null);

        const response = await axios.get<Indication[]>(
          "http://localhost:5106/api/Indications",
          { signal: controller.signal }
        );

        setIndications(response.data ?? []);
      } catch (error) {
        if (!axios.isCancel(error)) {
          setIndicationsError("Impossible de charger les indications.");
          console.error(error);
        }
      } finally {
        setLoadingIndications(false);
      }
    };

    fetchIndications();

    return () => controller.abort();
  }, []);

  const saveIntervention = async () => {
  try {
    setCreatingIntervention(true);
    setCreateError(null);


    const payload = {
      StudyInstanceUid: data.studyInstanceUID,
      TypeInterventionId: data.typeInterventionId,
      IndicationId: data.indicationId,
      VoieAcces: data.voieAcces,
      ProduitContraste: data.contrastProduct?.name || data.ProduitContraste || "",
      DoseContraste: Number(data.contrastProduct?.volume ?? data.DoseContraste ?? 0) || 0,
      HeureDebut: formatTimeSpan(data.HeureDebut || data.interventionStartTime),
      HeureFin: formatTimeSpan(data.HeureFin || data.interventionEndTime),
    };

    const updatePayload = {
      ...payload,
      patientId: data.patientId,
      patientName: data.patientName,
      patientDOB: data.patientDOB,
      patientSex: data.patientSex,
      studyInstanceUID: data.studyInstanceUID,
      studyInsta: data.studyInsta,
      viewerNotes: data.viewerNotes,
      interventionDate: data.interventionDate,
      procedureType: data.procedureType,
      stentNotes: data.stentNotes,
      medications: data.medications,
      materialsUsed: data.materialsUsed,
      timiFlow: data.timiFlow,
      finalOutcome: data.finalOutcome,
      complications: data.complications,
      schemaCoronaireNotes: data.schemaCoronaireNotes,
      schemaCoronaireData: data.schemaCoronaireData,
    };

    if (data.interventionId) {
      await axios.put(
        `http://localhost:5106/api/Interventions/${data.interventionId}`,
        updatePayload
      );

      toast.success("Intervention modifiée avec succès.");
      setIsEditMode(false);
    } else {
      const response = await axios.post(
        "http://localhost:5106/api/Interventions",
        payload
      );

      const interventionId =
        response.data?.id ??
        response.data?.interventionId ??
        response.data?.interventionID ??
        null;

      if (!interventionId) {
        throw new Error("ID introuvable");
      }

      onChange({ interventionId });

      toast.success("Intervention créée avec succès.");
      setIsEditMode(false);
    }
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data ||
      error?.message ||
      "Impossible d'enregistrer l'intervention.";
    setCreateError(typeof message === "string" ? message : JSON.stringify(message));
    console.error("Intervention save error:", error);
    toast.error(typeof message === "string" ? message : "Erreur serveur inconnue");
  } finally {
    setCreatingIntervention(false);
  }
};


  if (!isEditMode && data.interventionId) {
    const indication = indications.find(i => i.id === data.indicationId)?.libelle || "Non spécifié";
    const typeInt = interventionTypes.find(t => t.id === data.typeInterventionId)?.libelle || "Non spécifié";
    const dateFormatted = data.interventionDate ? format(new Date(data.interventionDate), "dd MMMM yyyy", { locale: fr }) : "Non spécifié";

    return (
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Détails de l'Intervention</h2>
        </div>

        <div className="clinical-card space-y-4 relative">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-transparent flex items-center gap-1.5">
              <CheckCircle size={14} />
              Créée
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)} className="h-6 px-3 text-xs">
              Modifier
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-6 pt-2">
            <div>
              <span className="text-xs text-muted-foreground block mb-1">Date de l'intervention</span>
              <div className="font-medium text-sm flex items-center gap-2">
                <Calendar size={14} className="text-primary" />
                {dateFormatted}
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block mb-1">Voie d'accès</span>
              <div className="font-medium text-sm flex items-center gap-2">
                <Stethoscope size={14} className="text-primary" />
                {data.voieAcces || "Non spécifié"}
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-xs text-muted-foreground block mb-1">Indication</span>
              <span className="font-medium text-sm inline-block px-2 py-1 bg-muted rounded-md">{indication}</span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-xs text-muted-foreground block mb-1">Type d'intervention</span>
              <span className="font-medium text-sm inline-block px-2 py-1 bg-primary/10 text-primary rounded-md">{typeInt}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block mb-1">Heure de début</span>
              <span className="font-medium text-sm inline-block px-2 py-1 bg-muted rounded-md">{data.HeureDebut || "Non spécifié"}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block mb-1">Heure de fin</span>
              <span className="font-medium text-sm inline-block px-2 py-1 bg-muted rounded-md">{data.HeureFin || "Non spécifié"}</span>
            </div>
          </div>
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
  }

  return (
    <div className="animate-fade-in space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Détails de l'Intervention</h2>

      <div className="clinical-card space-y-4">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-primary" />
          <span className="font-medium text-foreground">Date de l'intervention</span>
        </div>
        <Popover open={openDatePicker} onOpenChange={setOpenDatePicker}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="clinical-input h-14 justify-start text-base font-normal"
            >
              {interventionDate
                ? format(interventionDate, "dd MMMM yyyy", { locale: fr })
                : "Sélectionner une date..."}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={interventionDate}
              onSelect={handleDateChange}
              disabled={(date) => date > new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="clinical-label">Heure de début</span>
            <Input
              type="time"
              value={data.HeureDebut || ""}
              onChange={(e) => onChange({ HeureDebut: e.target.value })}
              className="clinical-input"
            />
          </div>
          <div>
            <span className="clinical-label">Heure de fin</span>
            <Input
              type="time"
              value={data.HeureFin || ""}
              onChange={(e) => onChange({ HeureFin: e.target.value })}
              className="clinical-input"
            />
          </div>
        </div>
      </div>

      <div className="clinical-card space-y-4">
        <div className="flex items-center gap-2">
          <Stethoscope size={18} className="text-primary" />
          <span className="font-medium text-foreground">Voie d'accès</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(["Radial", "Femoral"] as const).map((route) => (
            <button
              key={route}
              onClick={() => onChange({ voieAcces: route })}
              className={`h-14 rounded-lg border-2 text-base font-medium transition-all ${data.voieAcces === route
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-muted/50 text-muted-foreground hover:border-primary/50"
                }`}
            >
              {route}
            </button>
          ))}
        </div>
      </div>

      <div className="clinical-card space-y-4">
        <div className="flex items-center gap-2">
          <Droplets size={18} className="text-primary" />
          <span className="font-medium text-foreground">Produit de contraste</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="clinical-label">Produit de contraste</span>
            <Select
              value={data?.ProduitContraste || ""}
              onValueChange={(value) =>
  onChange({ ProduitContraste: value })
}
            >
              <SelectTrigger className="clinical-input">
                <SelectValue placeholder="Produit de contraste" />
              </SelectTrigger>

              <SelectContent>
                {contrastOptions.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <span className="clinical-label">Volume (ml)</span>
            <Input
              type="number"
              placeholder="0"
              value={data?.DoseContraste || ""}

onChange={(e) =>
  onChange({
    DoseContraste: Number(e.target.value)
  })
}
              className="clinical-input"
            />
          </div>
        </div>
      </div>

      <div className="clinical-card space-y-4">
        <span className="clinical-label">Indication</span>
        <Select value={data.indicationId?.toString() || ""} onValueChange={(v) => onChange({ indicationId: Number(v) })}>
          <SelectTrigger className="clinical-input">
            <SelectValue placeholder={loadingIndications ? "Chargement..." : "Sélectionner une indication..."} />
          </SelectTrigger>
          <SelectContent>
            {indicationsError ? (
              <div className="px-2 py-1.5 text-sm text-destructive">
                {indicationsError}
              </div>
            ) : loadingIndications ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                Chargement...
              </div>
            ) : indications.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                Aucune indication disponible
              </div>
            ) : (
              indications.map((indication) => (
                <SelectItem key={indication.id} value={indication.id.toString()}>
                  {indication.libelle}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <span className="clinical-label">Type intervention</span>
        <Select value={data.typeInterventionId?.toString() || ""} onValueChange={(v) => onChange({ typeInterventionId: Number(v) })}>
          <SelectTrigger className="clinical-input">
            <SelectValue placeholder={loadingTypes ? "Chargement..." : "Sélectionner un type..."} />
          </SelectTrigger>
          <SelectContent>
            {typesError ? (
              <div className="px-2 py-1.5 text-sm text-destructive">
                {typesError}
              </div>
            ) : loadingTypes ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                Chargement...
              </div>
            ) : interventionTypes.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                Aucun type disponible
              </div>
            ) : (
              interventionTypes.map((type) => (
                <SelectItem key={type.id} value={type.id.toString()}>
                  {type.libelle}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="clinical-card space-y-4">
        {createError && (
          <p className="text-sm text-destructive">{createError}</p>
        )}
        <div className="flex gap-2">
          {data.interventionId && (
            <Button variant="outline" onClick={() => setIsEditMode(false)} className="flex-1" disabled={creatingIntervention}>
              Annuler
            </Button>
          )}
          <Button
            onClick={saveIntervention}
            
            disabled={creatingIntervention}
            className={data.interventionId ? "flex-[2]" : "w-full"}
          >
            {creatingIntervention ? "Enregistrement..." : data.interventionId ? "Enregistrer les modifications" : "Créer l'intervention"}
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
        <Button variant="outline" onClick={onPrevStep}>
          Retour
        </Button>
        <Button onClick={() => onNextStep?.()} disabled={!data.interventionId}>
          Suivant
        </Button>
      </div>
    </div>
  );
};

export default InterventionDetails;
