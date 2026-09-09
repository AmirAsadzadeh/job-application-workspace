export type {
  Company,
  ApplicationChannelStatus,
  CompanyLogoInput,
  CreatePositionInput,
  Department,
  EmploymentType,
  HiringManager,
  JobPlatformLink,
  Location,
  Position,
  PositionDetailsUpdate,
  PositionQuestion,
  PositionQuestionInput,
  PositionStatus,
  PositionSummary,
  ReferenceData,
  RichTextDocument,
  RichTextMark,
  QuestionAnswerDocument,
  QuestionAnswerMark,
  QuestionCategory,
  QuestionCodeLanguage,
  ReadingItem,
  ReadingItemInput,
  SubmittedResume,
  Team,
  WorkMode,
  Seniority,
} from "../../../shared/positionSchema";

import type { ApplicationChannelStatus, EmploymentType, PositionStatus, QuestionCategory, QuestionCodeLanguage, Seniority, WorkMode } from "../../../shared/positionSchema";

export const questionCategories: QuestionCategory[] = ["javascript", "typescript", "react", "html_css", "browser", "testing", "architecture", "behavioral", "other"];

export const questionCategoryLabels: Record<QuestionCategory, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  react: "React",
  html_css: "HTML/CSS",
  browser: "Browser",
  testing: "Testing",
  architecture: "Architecture",
  behavioral: "Behavioral",
  other: "Other",
};

export const questionCodeLanguages: QuestionCodeLanguage[] = ["javascript", "typescript", "react_jsx", "react_tsx", "html", "css", "browser_javascript", "json", "plain_text"];

export const questionCodeLanguageLabels: Record<QuestionCodeLanguage, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  react_jsx: "React JSX",
  react_tsx: "React TSX",
  html: "HTML",
  css: "CSS",
  browser_javascript: "Browser JavaScript",
  json: "JSON",
  plain_text: "Plain text",
};

export const submittedResumeTypeLabels = { pdf: "PDF", docx: "DOCX" } as const;

export const positionStatuses: PositionStatus[] = [
  "saved",
  "applied",
  "screening",
  "interviewing",
  "assignment",
  "paused",
  "offer",
  "rejected",
  "withdrawn",
];

export const statusLabels: Record<PositionStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  screening: "Screening",
  interviewing: "Interviewing",
  assignment: "Assignment",
  paused: "Paused",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const statusDefinitions: Record<PositionStatus, string> = {
  saved: "Found or under consideration, but not yet applied to.",
  applied: "Application submitted and awaiting progress.",
  screening: "In an initial recruiter or HR conversation.",
  interviewing: "In technical, behavioral, or team interviews.",
  assignment: "Completing a take-home task or coding evaluation.",
  paused: "Delayed or inactive, but may continue later.",
  offer: "A verbal or written offer has been received.",
  rejected: "The employer ended the application process.",
  withdrawn: "You ended the application process.",
};

export const applicationChannelStatuses: ApplicationChannelStatus[] = [
  "not_applied", "applied", "viewed", "contacted", "closed",
];

export const applicationChannelStatusLabels: Record<ApplicationChannelStatus, string> = {
  not_applied: "Not applied",
  applied: "Applied",
  viewed: "Viewed",
  contacted: "Contacted",
  closed: "Closed",
};

export const applicationChannelStatusDefinitions: Record<ApplicationChannelStatus, string> = {
  not_applied: "The channel is recorded, but no application was submitted there.",
  applied: "The application was submitted through this channel.",
  viewed: "The application was viewed through this channel.",
  contacted: "Someone contacted you through this channel.",
  closed: "Tracking for this channel has ended.",
};

export const workModeLabels: Record<WorkMode, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

export const workModes: WorkMode[] = ["remote", "hybrid", "onsite"];

export const seniorities: Seniority[] = ["Intern", "Entry", "Associate", "Mid-level", "Senior", "Staff", "Lead", "Manager", "Director"];

export const employmentTypes: EmploymentType[] = ["full_time", "part_time", "contract", "internship"];

export const employmentTypeLabels: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
};
