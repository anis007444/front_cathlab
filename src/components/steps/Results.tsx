import { Sparkles, Save } from "lucide-react";
import { useState } from "react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { InterventionData } from "@/types/intervention";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Props {
  data: InterventionData;
  onChange: (data: Partial<InterventionData>) => void;
  onNextStep?: (step?: number) => void;
  onPrevStep?: () => void;
}


const Results = ({ data, onChange, onNextStep, onPrevStep }: Props) => {
  const { toast } = useToast();
  const [conclusion, setConclusion] = useState<string>("");
  const [aiSuggestion, setAiSuggestion] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const generateAiSuggestion = () => {
    setAiSuggestion(
      "Based on the procedure and findings, the final diagnosis recommends continued monitoring and medical management with follow-up imaging in 4-6 weeks. No significant complications were observed, and the intervention was successful."
    );
  };

  const saveConclusion = async () => {
    const interventionId = data.interventionId?.toString()?.trim();

    if (!interventionId || !conclusion.trim()) {
      toast({
        variant: "destructive",
        title: "Enregistrement impossible",
        description: "L'identifiant d'intervention est invalide ou la conclusion est vide.",
      });
      return;
    }

    try {
      setIsSaving(true);
      await axios.patch(`http://localhost:5106/api/interventions/${interventionId}/conclusion`, {
        conclusion,
      });
      toast({ title: "Succès", description: "Conclusion enregistrée." });
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.response?.data || error?.message || "Erreur lors de l'enregistrement.";
      toast({ variant: "destructive", title: "Erreur", description: message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Résultats</h2>

      <div className="space-y-4">
        <div className="medical-panel">
          <div className="panel-header">
            <span className="panel-header-title">Conclusion</span>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={generateAiSuggestion}>
                <Sparkles className="w-3 h-3" /> AI Suggest
              </Button>
              <Button size="sm" className="h-7 text-xs gap-1" onClick={saveConclusion} disabled={isSaving}>
                <Save className="w-3 h-3" /> {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
          <div className="p-4">
            <Textarea
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
              placeholder="Write your final diagnosis and recommendations..."
              className="bg-muted border-border min-h-[200px] text-sm"
            />
          </div>
        </div>

        {aiSuggestion && (
          <div className="medical-panel border-primary/30">
            <div className="panel-header">
              <span className="panel-header-title flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary" /> AI Suggestion
              </span>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setConclusion(aiSuggestion); setAiSuggestion(""); }}>
                Accept
              </Button>
            </div>
            <div className="p-4 text-xs text-foreground leading-relaxed">{aiSuggestion}</div>
          </div>
        )}
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

export default Results;
