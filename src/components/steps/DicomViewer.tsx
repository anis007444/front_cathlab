import { useState, useEffect } from "react";
import axios from "axios";
import { FileText, PanelLeftClose, PanelLeft, Loader2, AlertCircle } from "lucide-react";
import { InterventionData } from "@/types/intervention";
import { DicomCine, DicomSeries, DicomStudy, MOCK_STUDY } from "@/types/dicom";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import DicomTree from "@/components/dicom/DicomTree";
import ViewerPanel from "@/components/dicom/ViewerPanel";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  data: InterventionData;
  onChange: (data: Partial<InterventionData>) => void;
  onNextStep?: (step?: number) => void;
  onPrevStep?: () => void;
}

const DicomViewer = ({ data, onChange, onNextStep, onPrevStep }: Props) => {
  const isMobile = useIsMobile();
  const [selectedCine, setSelectedCine] = useState<DicomCine | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<DicomSeries | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [study, setStudy] = useState<DicomStudy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!data.patientId) return;

    const fetchStudies = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get(`http://localhost:5106/api/DicomStudy/patient/${data.patientId}`);
        const apiStudies = response.data;

        if (apiStudies && apiStudies.length > 0) {
          const s = apiStudies[0]; // Prends la première étude

          const mappedStudy: DicomStudy = {
            studyId: s.studyInsta || data.patientId,
            description: (s.studyDescr && s.studyDescr.trim()) ? s.studyDescr : 'Etude DICOM',
            date: s.studyDate || "",
            modality: s.series && s.series.length > 0 ? s.series[0].modality : "",
            series: (s.series || []).map((ser: any, sIdx: number) => ({
              seriesId: ser.seriesInst || `series-${sIdx}`,
              seriesNumber: sIdx + 1,
              description: `Série ${sIdx + 1}`,
              modality: ser.modality || "",
              date: s.studyDate || "",
              cines: (ser.images || []).map((img: any, iIdx: number) => ({
                instanceId: img.sopinstanc || `img-${sIdx}-${iIdx}`,
                label: `Cine ${img.imageNumbe ? img.imageNumbe.trim() : (iIdx + 1)}`,
                numberOfFrames: 1
              }))
            }))
          };

          setStudy(mappedStudy);
        } else {
          setStudy(null); // Pas d'étude trouvée
        }
      } catch (err) {
        console.error("Erreur lors de la récupération des études:", err);
        setError("Impossible de charger les données DICOM du patient.");
        // Mode développement: Fallback sur le mock si API indisponible
        setStudy(MOCK_STUDY);
      } finally {
        setLoading(false);
      }
    };

    fetchStudies();
  }, [data.patientId]);

  const handleSelectCine = (cine: DicomCine, series: DicomSeries) => {
    setSelectedCine(cine);
    setSelectedSeries(series);
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Viewer DICOM</h2>
        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="gap-1.5 text-xs"
          >
            {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeft size={15} />}
            {sidebarOpen ? "Masquer arbre" : "Afficher arbre"}
          </Button>
        )}
      </div>

      {/* Split layout */}
      <div className={isMobile ? "flex flex-col gap-3" : "flex gap-0 rounded-lg border border-border overflow-hidden"}>
        {/* Tree sidebar */}
        {(isMobile || sidebarOpen) && (
          <div
            className={
              isMobile
                ? "clinical-card p-0 max-h-[300px] overflow-hidden"
                : "w-[30%] min-w-[220px] border-r border-border bg-muted/20 max-h-[500px]"
            }
          >
            <div className="px-3 py-2 border-b border-border bg-muted/40 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Arborescence DICOM
              </span>
              {loading && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
            </div>

            {loading && !study ? (
              <div className="p-4 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <Loader2 size={24} className="animate-spin text-primary" />
                <p>Chargement des données...</p>
              </div>
            ) : error && !study ? (
              <div className="p-4 text-center text-sm text-destructive flex flex-col items-center gap-2">
                <AlertCircle size={24} />
                <p>{error}</p>
              </div>
            ) : study ? (
              <DicomTree
                study={study}
                selectedCineId={selectedCine?.instanceId ?? null}
                onSelectCine={handleSelectCine}
              />
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <p>Aucune étude trouvée pour ce patient.</p>
              </div>
            )}
          </div>
        )}

        {/* Viewer panel */}
        <div
          className={
            isMobile
              ? "clinical-card p-0 overflow-hidden"
              : `${sidebarOpen ? "w-[70%]" : "w-full"} max-h-[500px]`
          }
        >
          <ViewerPanel
            selectedCine={selectedCine}
          />
        </div>
      </div>

      {/* Clinical notes */}
      <div className="clinical-card flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={18} className="text-primary" />
          <span className="font-medium text-foreground">Observations cliniques</span>
        </div>
        <Textarea
          placeholder="Ajouter des observations cliniques de l'angiographie..."
          value={data.viewerNotes}
          onChange={(e) => onChange({ viewerNotes: e.target.value })}
          className="min-h-[120px] clinical-input resize-none"
        />
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

export default DicomViewer;
