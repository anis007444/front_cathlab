export interface Medication {
  id: string;
  name: string;
  dose: string;
}

export interface ContrastProduct {
  name: string;
  volume: string;
}

export interface UsedMaterial {
  id: number;
  utiliseId?: number; // ID de l'enregistrement dans MaterielUtilise
  designation: string;
  typeMateriel: string | null;
  stockDisponible: number;
  seuilAlerte: number;
  codeBarre: string;
  quantite: number;
}

export interface InterventionData {
  // Step 1
  patientId: string;
  patientName: string;
  patientDOB: string;
  patientSex: string;
  studyInstanceUID: string;
  studyInsta: string;
  interventionId: string;
  // Step 2
  viewerNotes: string;
  // Step 3
  interventionDate: string;
  interventionStartTime: string;
  interventionEndTime: string;
  // backend expected fields (French names)
  HeureDebut: string;
  HeureFin: string;
  voieAcces: "Radial" | "Femoral" | "";
  procedureType: string;
  indicationId?: number;
  typeInterventionId?: number;
  stentNotes: string;
  // Step 4
  contrastProduct: ContrastProduct;
  // backend fields for contrast (French names)
  ProduitContraste: string;
  DoseContraste: number;
  medications: Medication[];
  materialsUsed: UsedMaterial[];
  // Step 5
  timiFlow: string;
  finalOutcome: string;
  complications: string;
  // Step 6
  schemaCoronaireNotes: string;
  schemaCoronaireData: any;
}

export const defaultInterventionData: InterventionData = {
  patientId: "PAT-2024-00847",
  patientName: "John Doe",
  patientDOB: "1958-03-15",
  patientSex: "Male",
  studyInstanceUID: "1.2.840.113619.2.55.3.604688119",
  studyInsta: "",
  interventionId: "",
  viewerNotes: "",
  interventionDate: new Date().toISOString(),
  interventionStartTime: "",
  interventionEndTime: "",
  HeureDebut: "",
  HeureFin: "",
  voieAcces: "",
  procedureType: "",
  indicationId: undefined,
  typeInterventionId: undefined,
  stentNotes: "",
  contrastProduct: { name: "", volume: "" },
  ProduitContraste: "",
  DoseContraste: 0,
  medications: [],
  materialsUsed: [],
  timiFlow: "",
  finalOutcome: "",
  complications: "",
  schemaCoronaireNotes: "",
  schemaCoronaireData: {},
};
