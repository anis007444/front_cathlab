export interface DicomCine {
  instanceId: string;
  label: string;
  numberOfFrames: number;
  thumbnailUrl?: string;
}

export interface DicomSeries {
  seriesId: string;
  seriesNumber: number;
  description: string;
  modality: string;
  date: string;
  cines: DicomCine[];
}

export interface DicomStudy {
  studyId: string;
  description: string;
  date: string;
  modality: string;
  series: DicomSeries[];
}

// Mock data for UI development
export const MOCK_STUDY: DicomStudy = {
  studyId: "1.2.840.113619.2.55.3.604688119",
  description: "Coronary Angiography",
  date: "2024-12-15",
  modality: "XA",
  series: [
    {
      seriesId: "1.2.840.113619.2.55.3.604688119.1",
      seriesNumber: 1,
      description: "Left Coronary – LAO Cranial",
      modality: "XA",
      date: "2024-12-15",
      cines: [
        { instanceId: "cine-1-1", label: "Cine 1", numberOfFrames: 200 },
        { instanceId: "cine-1-2", label: "Cine 2", numberOfFrames: 150 },
        { instanceId: "cine-1-3", label: "Cine 3", numberOfFrames: 80 },
      ],
    },
    {
      seriesId: "1.2.840.113619.2.55.3.604688119.2",
      seriesNumber: 2,
      description: "Left Coronary – RAO Caudal",
      modality: "XA",
      date: "2024-12-15",
      cines: [
        { instanceId: "cine-2-1", label: "Cine 1", numberOfFrames: 180 },
        { instanceId: "cine-2-2", label: "Cine 2", numberOfFrames: 120 },
      ],
    },
    {
      seriesId: "1.2.840.113619.2.55.3.604688119.3",
      seriesNumber: 3,
      description: "Right Coronary – LAO",
      modality: "XA",
      date: "2024-12-15",
      cines: [
        { instanceId: "cine-3-1", label: "Cine 1", numberOfFrames: 250 },
      ],
    },
    {
      seriesId: "1.2.840.113619.2.55.3.604688119.4",
      seriesNumber: 4,
      description: "Ventriculography – RAO 30°",
      modality: "XA",
      date: "2024-12-15",
      cines: [
        { instanceId: "cine-4-1", label: "Cine 1", numberOfFrames: 300 },
        { instanceId: "cine-4-2", label: "Cine 2", numberOfFrames: 220 },
        { instanceId: "cine-4-3", label: "Cine 3", numberOfFrames: 160 },
        { instanceId: "cine-4-4", label: "Cine 4", numberOfFrames: 90 },
      ],
    },
  ],
};
