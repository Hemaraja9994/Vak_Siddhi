export interface SessionRecord {
  date: string;
  fdaData: FDAData;
  respiratoryData: RespiratoryData;
  phonatoryData: PhonatoryData;
  resonatoryData: ResonatoryData;
  ddkData: DDKData[];
  treatmentGoals: TreatmentGoals;
  manualDiagnosis?: string;
  manualSeverity?: string;
  grbasData?: {
    grade: number;
    roughness: number;
    breathiness: number;
    asthenia: number;
    strain: number;
  };
}

export interface PatientInfo {
  id: string; // Unique ID for storage
  name: string;
  age: string;
  dob?: string;
  gender: string;
  caseNo: string;
  clinician: string;
  date: string;
  complaint: string;
  medicalHistory: string;
  onset: 'sudden' | 'gradual' | '';
  course: 'progressive' | 'stable' | 'improving' | '';
  siteOfLesion: string;
  neurologicalDiagnosis: string;
  associatedDeficits: string[];
  swallowingStatus: string[];
  respiratorySupport: string[];
  medications: string;
  bodySystems: string;
  ncdHistory: string[];
  radiologicalFindings: string;
  laboratoryFindings: string;
  otherInvestigations: string;
  surgicalHistory: string;
  familyHistory: string;
  socialHistory: string;
  lifestyleFactors: string[];
  developmentalHistory: string;
  birthHistory: string;
  sessions: SessionRecord[];
}

export interface TreatmentGoals {
  subsystems: {
    [key: string]: {
      shortTerm: string[];
      longTerm: string[];
    };
  };
}

export interface RespiratoryData {
  mpt: {
    trials: [number, number, number];
    average: number;
  };
  szRatio: {
    s: number;
    z: number;
    ratio: number;
  };
}

export interface PhonatoryData {
  acousticParameters: {
    jitter: string;
    shimmer: string;
    hnr: string;
    f0: string;
  };
  quality: string;
}

export interface ResonatoryData {
  hypernasality: number;
  hyponasality: number;
  nasalEmission: boolean;
  pressureConsonants: Record<string, number>;
}

export interface AssessmentSection {
  id: string;
  title: string;
  tasks: AssessmentTask[];
}

export interface AssessmentTask {
  id: string;
  name: string;
  description: string;
  score: number; // 0-4 or 0-9 depending on scale
  comments: string;
}

export interface DDKData {
  task: string;
  count: number;
  seconds: number;
  rate: number;
}

export type FDASectionId = 'reflex' | 'respiration' | 'lips' | 'jaw' | 'palate' | 'laryngeal' | 'tongue' | 'intelligibility';

export interface FDAData {
  [key: string]: {
    [subtest: string]: number;
  };
}
