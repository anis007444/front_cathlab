import { Save, Sparkles } from "lucide-react";
import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
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
  const [conclusion, setConclusion] = useState<string>(data.conclusion || "");
  const [aiSuggestion, setAiSuggestion] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const generateAiSuggestion = () => {
    setAiSuggestion(
      "Based on the procedure and findings, the final diagnosis recommends continued monitoring and medical management with follow-up imaging in 4-6 weeks. No significant complications were observed, and the intervention was successful."
    );
  };

  const handleConclusionChange = (value: string) => {
    setConclusion(value);
    onChange({ conclusion: value });
  };

  const handleAcceptSuggestion = () => {
    setConclusion(aiSuggestion);
    onChange({ conclusion: aiSuggestion });
    setAiSuggestion("");
  };

  const handleSaveConclusion = async () => {
    if (!data.interventionId) {
      toast.error("ID d'intervention manquant");
      return;
    }

    setIsSaving(true);
    try {
      await axios.patch(
        `http://localhost:5106/api/Interventions/${data.interventionId}/conclusion`,
        {
          conclusion: conclusion
        }
      );
      toast.success("Conclusion enregistrée avec succès");
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || "Erreur lors de l'enregistrement";
      toast.error(message);
      console.error("Save conclusion error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <h2 className="text-xl font-semibold text-foreground"></h2>

      <div className="space-y-4">
        <div className="medical-panel">
          <div className="panel-header">
            <span className="panel-header-title">Conclusion</span>
          </div>
          <div className="p-4">
            <Textarea
              value={conclusion}
              onChange={(e) => handleConclusionChange(e.target.value)}
              placeholder="Rédiger votre conclusion et vos recommandations..."
              className="bg-muted border-border min-h-[200px] text-sm"
            />
            <div className="flex gap-2 mt-3">
              <Button 
                size="sm" 
                className="h-8 text-xs gap-1"
                onClick={handleSaveConclusion}
                disabled={isSaving}
              >
                <Save className="w-3 h-3" /> {isSaving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        </div>

        {aiSuggestion && (
          <div className="medical-panel border-primary/30">
            <div className="panel-header">
              <span className="panel-header-title flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary" /> AI Suggestion
              </span>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleAcceptSuggestion}>
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
