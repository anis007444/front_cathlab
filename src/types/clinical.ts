export type RiskFactor =
    | "Hypertension"
    | "Diabetes"
    | "Dyslipidemia"
    | "Smoking"
    | "Family History"
    | "Obesity"
    | "Sedentary"
    | "Chronic Kidney Disease";

export interface Patient {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    sex: "M" | "F";
    bloodType?: string;
    phone?: string;
    studyInstanceUID: string;
    riskFactors: RiskFactor[];
    notes?: string;
}

export type Access = "Radial" | "Femoral";
export type MedRoute = "IV" | "Oral" | "IM" | "SC";

export interface Medication {
    id: string;
    name: string;
    dose: string;
    route: MedRoute;
}

export interface InterventionDraft {
    patientId: string;
    studyInstanceUID: string;
    viewerNotes: string;
    interventionDetails: {
        access: Access | "";
        procedureType: string;
        stentsNotes: string;
    };
    treatment: {
        contrastProduct: { name: string; volumeMl: string };
        medications: Medication[];
    };
    results: {
        timi: "0" | "1" | "2" | "3" | "";
        outcome: string;
        complications: string;
    };
    updatedAt: string;
}