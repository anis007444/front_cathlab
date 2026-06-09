import { ArrowLeft, User, Loader2, Trash2, FileDown } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { InterventionData, defaultInterventionData } from "@/types/intervention";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

interface Patient {
  id: string;
  name: string;
  dob: string;
  sex: string;
}

interface RiskFactor {
  id: string;
  code: string;
  label: string;
}

interface Study {
  id: string;
  description: string;
  studyInsta: string;
  modality: string;
  date: string;
  seriesCount: number;
  status?: string;
  hasIntervention?: boolean;
  interventionId?: number;
  interventionStatus?: string;
}

interface Props {
  patient: Patient;
  onBack: () => void;
  onInterventionLoaded?: (data: Partial<InterventionData>, targetStep?: number) => void;
}

const PatientProfileView = ({ patient, onBack, onInterventionLoaded }: Props) => {
  const [riskFactors, setRiskFactors] = useState<RiskFactor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [studies, setStudies] = useState<Study[]>([]);
  const [loadingStudies, setLoadingStudies] = useState(false);
  const [errorStudies, setErrorStudies] = useState<string | null>(null);
  const [loadingFullIntervention, setLoadingFullIntervention] = useState<number | null>(null);
  const [deletingIntervention, setDeletingIntervention] = useState<number | null>(null);
  const [interventionToDelete, setInterventionToDelete] = useState<number | null>(null);

  const handleDownloadPdf = (interventionId: number) => {
    const downloadUrl = `http://localhost:5106/api/Rapport/download/${interventionId}`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("target", "_blank");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateIntervention = (study: Study) => {
    if (!onInterventionLoaded) return;

    onInterventionLoaded(
      {
        ...defaultInterventionData,
        patientId: patient.id,
        patientName: patient.name,
        patientDOB: patient.dob,
        patientSex: patient.sex,
        studyInstanceUID: study.studyInsta,
        studyInsta: study.studyInsta,
        interventionId: "",
        viewerNotes: "",
        interventionDate: new Date().toISOString(),
        voieAcces: "",
        procedureType: "",
        indicationId: undefined,
        typeInterventionId: undefined,
        stentNotes: "",
        contrastProduct: { name: "", volume: "" },
        medications: [],
        materialsUsed: [],
        timiFlow: "",
        finalOutcome: "",
        complications: "",
        schemaCoronaireNotes: "",
        schemaCoronaireData: {},
      },
      2
    );
  };

  const handleCompleteIntervention = async (study: Study) => {
    if (!study.interventionId) return;

    try {
      setLoadingFullIntervention(study.interventionId);
      const res = await axios.get(
        `http://localhost:5106/api/Interventions/${study.interventionId}/full`
      );

      const interventionData = res.data;

      const mappedData: Partial<InterventionData> = {
        interventionId: study.interventionId.toString(),
        interventionDate: interventionData.dateIntervention || new Date().toISOString(),
        voieAcces: interventionData.voieAcces || "",
        procedureType: interventionData.typeProcedure || "",
        indicationId: interventionData.indicationId,
        typeInterventionId: interventionData.typeInterventionId,
        stentNotes: interventionData.notes || interventionData.remarques || "",

        medications: Array.isArray(interventionData.medicaments)
          ? interventionData.medicaments.map((m: any) => ({
            id: m.medicamentId?.toString() || m.id?.toString(),
            name: m.nomMedicament || m.medicament?.nom || "",
            dose: m.dose || ""
          }))
          : [],

        materialsUsed: Array.isArray(interventionData.materielsUtilises)
          ? interventionData.materielsUtilises.map((m: any) => ({
            id: m.materielId || m.id,
            utiliseId: m.id,
            designation: m.materiel?.designation || m.designation || "",
            typeMateriel: m.materiel?.typeMateriel || m.typeMateriel || null,
            stockDisponible: m.materiel?.stockDisponible || 0,
            seuilAlerte: m.materiel?.seuilAlerte || 0,
            codeBarre: m.materiel?.codeBarre || "",
            quantite: m.quantite || 1
          }))
          : []
      };

      const hasInterventionDetails = !!(mappedData.voieAcces || mappedData.procedureType);
      const hasTreatment = !!(mappedData.medications?.length || mappedData.materialsUsed?.length);
      const hasResults = !!(interventionData.timiFlow || interventionData.resultatFinal || interventionData.complications);
      const hasSchema = !!(interventionData.schemaCoronaireData || interventionData.schemaCoronaireNotes);

      let targetStep = 2;
      if (hasSchema) {
        targetStep = 7; // Review & Save
      } else if (hasResults) {
        targetStep = 6; // Coronary Schema
      } else if (hasTreatment) {
        targetStep = 5; // Results
      } else if (hasInterventionDetails) {
        targetStep = 4; // Treatment (skip DICOM viewer)
      }

      if (onInterventionLoaded) {
        onInterventionLoaded(mappedData, targetStep);
      }

    } catch (err) {
      console.error(err);
      toast.error("Échec du chargement des détails de l'intervention");
    } finally {
      setLoadingFullIntervention(null);
    }
  };

  const handleDeleteIntervention = async () => {
    if (!interventionToDelete) return;

    try {
      setDeletingIntervention(interventionToDelete);
      await axios.delete(`http://localhost:5106/api/Interventions/${interventionToDelete}`);
      toast.success("Intervention supprimée avec succès");
      
      // Update local state to remove the intervention
      setStudies(prevStudies => prevStudies.map(s => {
        if (s.interventionId === interventionToDelete) {
          return { ...s, hasIntervention: false, interventionId: undefined, interventionStatus: undefined };
        }
        return s;
      }));
    } catch (err) {
      console.error(err);
      toast.error("Échec de la suppression de l'intervention");
    } finally {
      setDeletingIntervention(null);
      setInterventionToDelete(null);
    }
  };

  // 🔥 FETCH RISK FACTORS
  useEffect(() => {
    const fetchRiskFactors = async () => {
      try {
        setLoading(true);
        setError(null);

        const [res, dictRes] = await Promise.all([
          axios.get(`http://localhost:5106/api/Patients/${patient.id}/risk-factors`),
          axios.get(`http://localhost:5106/api/TypeFacteurRisques`)
        ]);

        const allTypes = dictRes.data?.value || dictRes.data || [];
        const data = res.data?.riskFactors || res.data || [];

        const mappedFactors = Array.isArray(data) ? data.map((f: any, index: number) => {
          const code = f.typeCode || f.typeFacteurRisque?.code || f.code || (typeof f === 'string' ? f : '');
          const dictItem = allTypes.find((t: any) => t.code === code || t.id === f.typeFacteurRisqueId || t.id === f.id);
          const libelle = dictItem?.libelle || f.typeFacteurRisque?.libelle || f.libelle || code || 'N/A';
          return {
            id: f.id?.toString() || `rf-${index}`,
            code: code,
            label: libelle
          };
        }) : [];

        setRiskFactors(mappedFactors);
      } catch (err) {
        console.error(err);
        setError("Failed to load risk factors");
      } finally {
        setLoading(false);
      }
    };

    if (patient?.id) {
      fetchRiskFactors();
    }
  }, [patient.id]);

  // 🔥 FETCH STUDIES & INTERVENTIONS
  useEffect(() => {
    const fetchStudies = async () => {
      try {
        setLoadingStudies(true);
        setErrorStudies(null);

        const res = await axios.get(
          `http://localhost:5106/api/DicomStudy/patient/${patient.id}`
        );

        const mappedStudies = (res.data || []).map((s: any, index: number) => ({
          id: s.studyInsta || s.studyId || `study-${index}`,
          description: s.studyDescr || s.description || "",
          studyInsta: s.studyInsta || "",
          modality: s.studyModal || s.modality || "",
          date: s.studyDate || s.date || "",
          seriesCount: s.seriesCount !== undefined ? s.seriesCount : (s.series?.length || 0),
          status: s.status,
        }));

        // Check if an intervention exists for each study
        const studiesWithInterventions = await Promise.all(
          mappedStudies.map(async (study: Study) => {
            if (!study.studyInsta) return study;
            try {
              const intRes = await axios.get(
                `http://localhost:5106/api/studies/${study.studyInsta}/intervention`
              );
              if (intRes.data && intRes.data.id) {
                return { ...study, hasIntervention: true, interventionId: intRes.data.id, interventionStatus: intRes.data.statut };
              }
            } catch (err) {
              // Usually a 404 if intervention does not exist
            }
            return { ...study, hasIntervention: false };
          })
        );

        setStudies(studiesWithInterventions);
      } catch (err) {
        console.error(err);
        setErrorStudies("Failed to load studies");
      } finally {
        setLoadingStudies(false);
      }
    };

    if (patient?.id) {
      fetchStudies();
    }
  }, [patient.id]);

  return (
    <div className="space-y-4 animate-fade-in">

      {/* 🔙 BACK BUTTON */}
      <button
        onClick={onBack}
        className="text-sm text-primary hover:underline flex items-center gap-1"
      >
        <ArrowLeft size={14} />
        Back to patients
      </button>

      {/* 👤 PATIENT CARD */}
      <div className="clinical-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User size={20} />
          </div>

          <div>
            <p className="font-semibold text-lg">{patient.name}</p>
            <p className="text-sm text-muted-foreground">
              Patient Profile
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Info label="ID Patient" value={patient.id} />
          <Info label="Date de naissance" value={patient.dob} />
          <Info label="Sexe" value={patient.sex} />
        </div>
      </div>

      {/* 🧠 RISK FACTORS SECTION */}
      <div className="medical-panel">
        <div className="panel-header">
          <span className="panel-header-title">Facteur risque</span>
        </div>

        <div className="p-4">

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Loading risk factors...
            </div>
          )}

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          {!loading && !error && riskFactors.length === 0 && (
            <p className="text-sm font-medium text-muted-foreground">
              N/A
            </p>
          )}

          {!loading && !error && riskFactors.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {riskFactors.map((rf) => (
                <span
                  key={rf.id}
                  className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-700 dark:text-red-400"
                >
                  {rf.label}
                </span>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* 🧠 STUDIES SECTION */}
      <div className="medical-panel">
        <div className="panel-header">
          <span className="panel-header-title">Études & Interventions</span>
        </div>

        <div className="p-4">

          {loadingStudies && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Loading studies...
            </div>
          )}

          {errorStudies && (
            <p className="text-xs text-destructive">{errorStudies}</p>
          )}

          {!loadingStudies && !errorStudies && studies.length === 0 && (
            <p className="text-sm font-medium text-muted-foreground">
              Aucune étude trouvée.
            </p>
          )}

          {!loadingStudies && !errorStudies && studies.length > 0 && (
            <div className="space-y-3">
              {studies.map((study) => (
                <div
                  key={study.id}
                  className="border border-border rounded-md p-3"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-foreground">
                        {study.description || "No description"}
                      </h4>
                      {study.interventionStatus && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${study.interventionStatus.toLowerCase() === 'brouillon' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {study.interventionStatus}
                        </span>
                      )}
                    </div>

                    {study.hasIntervention ? (
                      <div className="flex gap-2">
                        {study.interventionStatus && study.interventionStatus.toLowerCase() === 'brouillon' && study.interventionId ? (
                          <>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setInterventionToDelete(study.interventionId!)}
                              disabled={deletingIntervention === study.interventionId || loadingFullIntervention === study.interventionId}
                            >
                              {deletingIntervention === study.interventionId ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4 mr-2" />
                              )}
                              Supprimer
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => handleCompleteIntervention(study)}
                              disabled={loadingFullIntervention === study.interventionId || deletingIntervention === study.interventionId}
                            >
                              {loadingFullIntervention === study.interventionId ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : null}
                              Compléter intervention
                            </Button>
                          </>
                        ) : study.interventionStatus && study.interventionStatus.toLowerCase() !== 'brouillon' && study.interventionId ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                            onClick={() => handleDownloadPdf(study.interventionId!)}
                            disabled={loadingFullIntervention === study.interventionId}
                          >
                            <FileDown className="w-4 h-4 mr-2" />
                            Télécharger PDF
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-primary text-primary hover:bg-primary/10"
                        onClick={() => handleCreateIntervention(study)}
                        disabled={loadingFullIntervention === study.interventionId}
                      >
                        Créer intervention
                      </Button>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Study Instance: {study.studyInsta}</div>
                    <div>Modality: {study.modality}</div>
                    <div>Date: {study.date}</div>
                    <div>Series: {study.seriesCount}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      <ConfirmationModal
        isOpen={interventionToDelete !== null}
        onClose={() => setInterventionToDelete(null)}
        onConfirm={handleDeleteIntervention}
        title="Supprimer l'intervention"
        description="Êtes-vous sûr de vouloir supprimer cette intervention en brouillon ? Cette action est irréversible."
        confirmText="Supprimer"
        cancelText="Annuler"
        isLoading={deletingIntervention !== null}
      />
    </div>
  );
};

// 🔹 reusable UI
const Info = ({ label, value }: { label: string; value: string }) => (
  <div>
    <span className="text-xs text-muted-foreground">{label}</span>
    <p className="bg-muted rounded px-3 py-2 text-sm">{value}</p>
  </div>
);

export default PatientProfileView;