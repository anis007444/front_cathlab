import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import WorkflowStepper from "@/components/WorkflowStepper";
import PatientStudy from "@/components/steps/PatientStudy";
import DicomViewer from "@/components/steps/DicomViewer";
import InterventionDetails from "@/components/steps/InterventionDetails";
import Treatment from "@/components/steps/Treatment";
import Results from "@/components/steps/Results";
import CoronarySchema from "@/components/steps/CoronarySchema";
import ReviewSave from "@/components/steps/ReviewSave";
import AppHeader from "@/components/AppHeader";
import { InterventionData, defaultInterventionData } from "@/types/intervention";

const TOTAL_STEPS = 7;

const Index = () => {
  const navigate = useNavigate();
  const { user, activeStudy, setActiveStudy, activeIntervention, setActiveIntervention } = useAuth();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<InterventionData>(defaultInterventionData);

  const updateData = (partial: Partial<InterventionData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  // Sync activeStudy when patient is selected
  useEffect(() => {
    if (data.patientId && data.patientId !== "PAT-2024-00847") {
      setActiveStudy(data.patientId);
    } else {
      setActiveStudy(null);
    }
  }, [data.patientId, setActiveStudy]);

  // Sync activeIntervention when intervention is complete or created
  useEffect(() => {
    const isInterventionComplete =
      !!data.interventionId ||
      (data.voieAcces && data.procedureType && data.interventionDate);
    setActiveIntervention(!!isInterventionComplete);
  }, [data.voieAcces, data.procedureType, data.interventionDate, data.interventionId, setActiveIntervention]);

  // Controlled navigation with guards
  const handleStepClick = (targetStep: number) => {
    // Step 1 is always accessible
    if (targetStep === 1) {
      setStep(targetStep);
      return;
    }

    // Steps 2-6 require activeStudy
    if (targetStep >= 2 && targetStep <= 6) {
      if (!activeStudy) {
        toast.error("Veuillez sélectionner une étude d'abord");
        setStep(1);
        return;
      }
      setStep(targetStep);
      return;
    }

    // Step 7 (ReviewSave) requires activeStudy AND activeIntervention
    if (targetStep === 7) {
      if (!activeStudy) {
        toast.error("Veuillez sélectionner une étude d'abord");
        setStep(1);
        return;
      }
      if (!activeIntervention) {
        toast.error("Veuillez créer une intervention d'abord");
        setStep(3);
        return;
      }
      setStep(targetStep);
      return;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <PatientStudy data={data} onChange={updateData} onNextStep={(step = 2) => handleStepClick(step)} />;
      case 2:
        return <DicomViewer data={data} onChange={updateData} onNextStep={(step = 3) => handleStepClick(step)} onPrevStep={() => handleStepClick(1)} />;
      case 3:
        return <InterventionDetails data={data} onChange={updateData} onNextStep={(step = 4) => handleStepClick(step)} onPrevStep={() => handleStepClick(2)} />;
      case 4:
        return <Treatment data={data} onChange={updateData} onNextStep={(step = 5) => handleStepClick(step)} onPrevStep={() => handleStepClick(3)} />;
      case 5:
        return <Results data={data} onChange={updateData} onNextStep={(step = 6) => handleStepClick(step)} onPrevStep={() => handleStepClick(4)} />;
      case 6:
        return <CoronarySchema data={data} onChange={updateData} onNextStep={(step = 7) => handleStepClick(step)} onPrevStep={() => handleStepClick(5)} />;
      case 7:
        return <ReviewSave data={data} onNavigateToStep={handleStepClick} onPrevStep={() => handleStepClick(6)} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <AppHeader />

      {/* Stepper */}
      <div className="border-b border-border bg-card py-4 px-4">
        <div className="max-w-4xl mx-auto">
          <WorkflowStepper currentStep={step} onStepClick={handleStepClick} />
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-4 py-6">
        <div className="max-w-5xl mx-auto">{renderStep()}</div>
      </main>
    </div>
  );
};

export default Index;
