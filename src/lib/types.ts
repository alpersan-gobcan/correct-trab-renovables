export type SubmissionMode = "full_document" | "fragment" | "followup";

export type CriterionStatus = "verde" | "ambar" | "rojo" | "gris";

export interface RubricCriterionEvaluation {
  id: string;
  name: string;
  applicable: boolean;
  level: 1 | 2 | 3 | 4 | 5 | null;
  gradeRange: string;
  status: CriterionStatus;
  justification: string;
  evidences: string[];
  pendingAspects: string[];
}

export interface FormatCheckItem {
  aspect: string;
  status: "verificado_ok" | "mejorable" | "no_verificable";
  detail: string;
}

export interface RoadmapAction {
  problem: string;
  importance: string;
  technicalChallenge: string;
  researchGuidance: string;
}

export interface StructuredEvaluation {
  isDemo?: boolean;
  correctorVersion: string;
  responseType: "evaluation" | "followup" | "privacy_block" | "refusal";
  submissionMode: SubmissionMode;
  privacyAlert: {
    detected: boolean;
    message: string;
  };
  academicAuthenticity?: {
    status: CriterionStatus;
    summary: string;
    findings: string[];
    suggestions: string[];
  };
  rubricCriteria?: RubricCriterionEvaluation[];
  formatAudit?: {
    evaluated: boolean;
    note: string;
    items: FormatCheckItem[];
  };
  globalAssessment?: {
    canCalculate: boolean;
    estimatedRange: string;
    note: string;
  };
  roadmap?: RoadmapAction[];
  tutorFinalQuestion: string;
  conversationalReply?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: SubmissionMode;
  fileName?: string;
  fileSize?: number;
  evaluation?: StructuredEvaluation;
  error?: string;
  createdAt: number;
}

export interface HistoryTurn {
  role: "user" | "model";
  text: string;
}
