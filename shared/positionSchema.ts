import { z } from "zod";

export const DATA_VERSION = 6 as const;
export const REFERENCE_DATA_VERSION = 1 as const;
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
export const MAX_LOGO_BASE64_LENGTH = Math.ceil(MAX_LOGO_BYTES / 3) * 4;

const LegacyPositionStatusSchema = z.enum(["draft", "open", "interviewing", "on_hold", "closed"]);
export const PositionStatusSchema = z.enum([
  "saved",
  "applied",
  "screening",
  "interviewing",
  "assignment",
  "paused",
  "offer",
  "rejected",
  "withdrawn",
]);
export const ApplicationChannelStatusSchema = z.enum([
  "not_applied",
  "applied",
  "viewed",
  "contacted",
  "closed",
]);
export const WorkModeSchema = z.enum(["remote", "hybrid", "onsite"]);
export const EmploymentTypeSchema = z.enum(["full_time", "part_time", "contract", "internship"]);
export const SenioritySchema = z.enum(["Intern", "Entry", "Associate", "Mid-level", "Senior", "Staff", "Lead", "Manager", "Director"]);
export const SortColumnSchema = z.enum(["company", "title", "status", "workMode", "seniority", "updatedAt"]);
export const SortDirectionSchema = z.enum(["asc", "desc"]);

export const ListViewPreferenceSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("manual"), column: z.null(), direction: z.null() }).strict(),
  z.object({ mode: z.literal("column"), column: SortColumnSchema, direction: SortDirectionSchema }).strict(),
]);

export const DEFAULT_LIST_VIEW = { mode: "manual", column: null, direction: null } as const;

export const ReorderPositionInputSchema = z.object({
  positionId: z.string().trim().min(1),
  beforePositionId: z.string().trim().min(1).nullable(),
}).strict().superRefine((input, context) => {
  if (input.positionId === input.beforePositionId) {
    context.addIssue({ code: "custom", path: ["beforePositionId"], message: "A position cannot be placed before itself." });
  }
});

const optionalId = z.string().trim().min(1).nullable();
const managerField = z.string().trim();
const webUrl = z.string().trim().url().refine((value) => {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}, "Enter an HTTP or HTTPS address.");

const localLogoPath = z.string().regex(/^\/company-logos\/[^/\\]+$/);

export const ApplicationDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date as YYYY-MM-DD.").refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}, "Enter a real calendar date.");

export function localDateString(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isFutureApplicationDate(value: string | null, now: Date): boolean {
  return value !== null && value > localDateString(now);
}

export const CompanySchema = z.object({
  name: z.string().trim().min(1, "Enter a company name."),
  logoPath: localLogoPath.nullable(),
  logoUrl: webUrl.nullable(),
}).strict().superRefine((company, context) => {
  if (company.logoPath && company.logoUrl) {
    context.addIssue({ code: "custom", path: ["logoUrl"], message: "Choose one company logo source." });
  }
});

const LegacyCompanySchema = z.object({
  name: z.string().trim().min(1),
  logoPath: localLogoPath.nullable(),
}).strict();

export const HiringManagerSchema = z.object({
  name: managerField,
  phone: managerField,
  position: managerField,
}).strict().superRefine((manager, context) => {
  const values = [manager.name, manager.phone, manager.position];
  if (values.some(Boolean) && !values.every(Boolean)) {
    context.addIssue({ code: "custom", message: "Complete all hiring manager fields." });
  }
});

const SalaryValueSchema = z.object({
  min: z.number().finite().nonnegative(),
  max: z.number().finite().nonnegative(),
  currency: z.string().trim().regex(/^[A-Za-z]{3}$/, "Enter a three-letter currency code.").transform((value) => value.toUpperCase()),
}).strict().refine((salary) => salary.max >= salary.min, {
  path: ["max"],
  message: "Salary maximum must not be below minimum.",
});

export const SalarySchema = SalaryValueSchema.nullable();

export type RichTextMark =
  | { type: "bold" }
  | { type: "italic" }
  | { type: "link"; attrs: { href: string } };
export type RichTextInline =
  | { type: "text"; text: string; marks?: RichTextMark[] }
  | { type: "hardBreak" };
export type RichTextBlock =
  | { type: "paragraph"; content?: RichTextInline[] }
  | { type: "heading"; attrs: { level: 1 | 2 | 3 }; content?: RichTextInline[] }
  | { type: "bulletList" | "orderedList"; content: RichTextListItem[] };
export type RichTextListItem = { type: "listItem"; content: RichTextBlock[] };
export type RichTextDocument = { type: "doc"; content: RichTextBlock[] };

const RichTextMarkSchema: z.ZodType<RichTextMark> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("bold") }).strict(),
  z.object({ type: z.literal("italic") }).strict(),
  z.object({ type: z.literal("link"), attrs: z.object({ href: webUrl }).strict() }).strict(),
]);

const RichTextInlineSchema: z.ZodType<RichTextInline> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string(), marks: z.array(RichTextMarkSchema).optional() }).strict(),
  z.object({ type: z.literal("hardBreak") }).strict(),
]);

const RichTextBlockSchema: z.ZodType<RichTextBlock> = z.lazy(() => z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), content: z.array(RichTextInlineSchema).optional() }).strict(),
  z.object({ type: z.literal("heading"), attrs: z.object({ level: z.union([z.literal(1), z.literal(2), z.literal(3)]) }).strict(), content: z.array(RichTextInlineSchema).optional() }).strict(),
  z.object({ type: z.literal("bulletList"), content: z.array(RichTextListItemSchema).min(1) }).strict(),
  z.object({ type: z.literal("orderedList"), content: z.array(RichTextListItemSchema).min(1) }).strict(),
]));

const RichTextListItemSchema: z.ZodType<RichTextListItem> = z.lazy(() => z.object({
  type: z.literal("listItem"),
  content: z.array(RichTextBlockSchema).min(1),
}).strict());

export const RichTextDocumentSchema: z.ZodType<RichTextDocument> = z.object({
  type: z.literal("doc"),
  content: z.array(RichTextBlockSchema).min(1),
}).strict();

export const EMPTY_RICH_TEXT_DOCUMENT: RichTextDocument = { type: "doc", content: [{ type: "paragraph" }] };

export const QuestionCategorySchema = z.enum([
  "javascript",
  "typescript",
  "react",
  "html_css",
  "browser",
  "testing",
  "architecture",
  "behavioral",
  "other",
]);

export const QuestionCodeLanguageSchema = z.enum([
  "javascript",
  "typescript",
  "react_jsx",
  "react_tsx",
  "html",
  "css",
  "browser_javascript",
  "json",
  "plain_text",
]);

export type QuestionAnswerMark = RichTextMark | { type: "code" };
export type QuestionAnswerInline =
  | { type: "text"; text: string; marks?: QuestionAnswerMark[] }
  | { type: "hardBreak" };
export type QuestionAnswerBlock =
  | { type: "paragraph"; content?: QuestionAnswerInline[] }
  | { type: "heading"; attrs: { level: 1 | 2 | 3 }; content?: QuestionAnswerInline[] }
  | { type: "bulletList" | "orderedList"; content: QuestionAnswerListItem[] }
  | { type: "codeBlock"; attrs: { language: z.infer<typeof QuestionCodeLanguageSchema> }; content?: Array<{ type: "text"; text: string }> };
export type QuestionAnswerListItem = { type: "listItem"; content: QuestionAnswerBlock[] };
export type QuestionAnswerDocument = { type: "doc"; content: QuestionAnswerBlock[] };

const QuestionAnswerMarkSchema: z.ZodType<QuestionAnswerMark> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("bold") }).strict(),
  z.object({ type: z.literal("italic") }).strict(),
  z.object({ type: z.literal("link"), attrs: z.object({ href: webUrl }).strict() }).strict(),
  z.object({ type: z.literal("code") }).strict(),
]);

const QuestionAnswerInlineSchema: z.ZodType<QuestionAnswerInline> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string(), marks: z.array(QuestionAnswerMarkSchema).optional() }).strict(),
  z.object({ type: z.literal("hardBreak") }).strict(),
]);

const QuestionAnswerBlockSchema: z.ZodType<QuestionAnswerBlock> = z.lazy(() => z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), content: z.array(QuestionAnswerInlineSchema).optional() }).strict(),
  z.object({ type: z.literal("heading"), attrs: z.object({ level: z.union([z.literal(1), z.literal(2), z.literal(3)]) }).strict(), content: z.array(QuestionAnswerInlineSchema).optional() }).strict(),
  z.object({ type: z.literal("bulletList"), content: z.array(QuestionAnswerListItemSchema).min(1) }).strict(),
  z.object({ type: z.literal("orderedList"), content: z.array(QuestionAnswerListItemSchema).min(1) }).strict(),
  z.object({
    type: z.literal("codeBlock"),
    attrs: z.object({ language: QuestionCodeLanguageSchema }).strict(),
    content: z.array(z.object({ type: z.literal("text"), text: z.string() }).strict()).max(1).optional(),
  }).strict(),
]));

const QuestionAnswerListItemSchema: z.ZodType<QuestionAnswerListItem> = z.lazy(() => z.object({
  type: z.literal("listItem"),
  content: z.array(QuestionAnswerBlockSchema).min(1),
}).strict());

export const QuestionAnswerDocumentSchema: z.ZodType<QuestionAnswerDocument> = z.object({
  type: z.literal("doc"),
  content: z.array(QuestionAnswerBlockSchema).min(1),
}).strict();

export const EMPTY_QUESTION_ANSWER_DOCUMENT: QuestionAnswerDocument = { type: "doc", content: [{ type: "paragraph" }] };

export const PositionQuestionInputSchema = z.object({
  title: z.string().trim().min(1, "Enter a question title."),
  category: QuestionCategorySchema.nullable(),
  customCategory: z.string().trim().min(1, "Enter a custom category.").nullable(),
  answer: QuestionAnswerDocumentSchema,
}).strict().superRefine((question, context) => {
  if (question.category === "other" && !question.customCategory) {
    context.addIssue({ code: "custom", path: ["customCategory"], message: "Enter a custom category." });
  }
  if (question.category !== "other" && question.customCategory) {
    context.addIssue({ code: "custom", path: ["customCategory"], message: "Custom category is only available for Other." });
  }
});

export const PositionQuestionSchema = PositionQuestionInputSchema.safeExtend({
  id: z.string().trim().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ReadingItemInputSchema = z.object({
  title: z.string().trim().min(1, "Enter a reading title."),
  url: webUrl.nullable(),
  notes: z.string(),
  isRead: z.boolean(),
}).strict();

export const ReadingItemSchema = ReadingItemInputSchema.extend({
  id: z.string().trim().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict();

export const SubmittedResumeSchema = z.discriminatedUnion("fileType", [
  z.object({
    originalFileName: z.string().trim().min(1),
    fileType: z.literal("pdf"),
    mediaType: z.literal("application/pdf"),
    relativePath: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9-]+\.pdf$/),
    uploadedAt: z.string().datetime(),
  }).strict(),
  z.object({
    originalFileName: z.string().trim().min(1),
    fileType: z.literal("docx"),
    mediaType: z.literal("application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    relativePath: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9-]+\.docx$/),
    uploadedAt: z.string().datetime(),
  }).strict(),
]);

const LegacyJobPlatformLinkSchema = z.object({
  platformName: z.string().trim().min(1, "Enter a platform name."),
  url: webUrl,
}).strict();

export const JobPlatformLinkSchema = LegacyJobPlatformLinkSchema.extend({
  applicationStatus: ApplicationChannelStatusSchema.nullable(),
  applicationDate: ApplicationDateSchema.nullable(),
}).strict();

const PositionFieldsSchema = z.object({
  id: z.string().trim().min(1),
  company: CompanySchema,
  title: z.string().trim().min(1),
  status: PositionStatusSchema,
  workMode: WorkModeSchema,
  employmentType: EmploymentTypeSchema,
  seniority: SenioritySchema,
  departmentId: optionalId,
  teamId: optionalId,
  locationId: optionalId,
  hiringManager: HiringManagerSchema,
  salary: SalarySchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const VersionFivePositionObjectSchema = PositionFieldsSchema.extend({
  description: RichTextDocumentSchema,
  jobPlatformLinks: z.array(JobPlatformLinkSchema),
  careerPageUrl: webUrl.nullable(),
  careerPageApplicationStatus: ApplicationChannelStatusSchema.nullable(),
  careerPageApplicationDate: ApplicationDateSchema.nullable(),
});

export const VersionFivePositionSchema = VersionFivePositionObjectSchema.strict().superRefine((position, context) => {
  if (!position.careerPageUrl && (position.careerPageApplicationStatus || position.careerPageApplicationDate)) {
    context.addIssue({ code: "custom", path: ["careerPageApplicationStatus"], message: "A career page URL is required for application tracking." });
  }
});

export const PositionSchema = VersionFivePositionObjectSchema.extend({
  questions: z.array(PositionQuestionSchema),
  readingItems: z.array(ReadingItemSchema),
  submittedResume: SubmittedResumeSchema.nullable(),
}).strict().superRefine((position, context) => {
  if (!position.careerPageUrl && (position.careerPageApplicationStatus || position.careerPageApplicationDate)) {
    context.addIssue({ code: "custom", path: ["careerPageApplicationStatus"], message: "A career page URL is required for application tracking." });
  }
  const questionIds = new Set<string>();
  position.questions.forEach((question, index) => {
    if (questionIds.has(question.id)) context.addIssue({ code: "custom", path: ["questions", index, "id"], message: "Duplicate question id." });
    questionIds.add(question.id);
  });
  const readingIds = new Set<string>();
  position.readingItems.forEach((reading, index) => {
    if (readingIds.has(reading.id)) context.addIssue({ code: "custom", path: ["readingItems", index, "id"], message: "Duplicate reading id." });
    readingIds.add(reading.id);
  });
  if (position.submittedResume && !position.submittedResume.relativePath.startsWith(`${position.id}/`)) {
    context.addIssue({ code: "custom", path: ["submittedResume", "relativePath"], message: "Resume path must belong to its position." });
  }
});

const LegacyPositionFieldsSchema = PositionFieldsSchema.omit({ company: true, seniority: true, status: true }).extend({
  company: LegacyCompanySchema,
  status: LegacyPositionStatusSchema,
  seniority: z.string().trim().min(1),
  requirements: z.array(z.string()),
});

export const LegacyPositionSchema = LegacyPositionFieldsSchema.extend({ description: z.string() }).strict();
export const VersionTwoPositionSchema = LegacyPositionFieldsSchema.extend({
  description: RichTextDocumentSchema,
  jobPlatformLinks: z.array(LegacyJobPlatformLinkSchema),
  careerPageUrl: webUrl.nullable(),
}).strict();

const VersionThreePositionSchema = PositionFieldsSchema.omit({ status: true }).extend({
  status: LegacyPositionStatusSchema,
  description: RichTextDocumentSchema,
  jobPlatformLinks: z.array(LegacyJobPlatformLinkSchema),
  careerPageUrl: webUrl.nullable(),
}).strict();

export const PositionSummarySchema = z.object({
  id: z.string().trim().min(1),
  company: CompanySchema,
  title: z.string().trim().min(1),
  status: PositionStatusSchema,
  workMode: WorkModeSchema,
  seniority: SenioritySchema,
  updatedAt: z.string().datetime(),
}).strict();

function withUniquePositionIds<T extends { positions: Array<{ id: string }> }>(schema: z.ZodType<T>) {
  return schema.superRefine((document, context) => {
    const ids = new Set<string>();
    document.positions.forEach((position, index) => {
      if (ids.has(position.id)) context.addIssue({ code: "custom", path: ["positions", index, "id"], message: "Duplicate position id." });
      ids.add(position.id);
    });
  });
}

export const PositionsDocumentSchema = withUniquePositionIds(z.object({
  version: z.literal(DATA_VERSION),
  listView: ListViewPreferenceSchema,
  positions: z.array(PositionSchema),
}).strict());

export const VersionFivePositionsDocumentSchema = withUniquePositionIds(z.object({
  version: z.literal(5),
  listView: ListViewPreferenceSchema,
  positions: z.array(VersionFivePositionSchema),
}).strict());

export const VersionThreePositionsDocumentSchema = withUniquePositionIds(z.object({
  version: z.literal(3),
  positions: z.array(VersionThreePositionSchema),
}).strict());

export const VersionFourPositionsDocumentSchema = withUniquePositionIds(z.object({
  version: z.literal(4),
  listView: ListViewPreferenceSchema,
  positions: z.array(VersionThreePositionSchema),
}).strict());

export const LegacyPositionsDocumentSchema = withUniquePositionIds(z.object({
  version: z.literal(1),
  positions: z.array(LegacyPositionSchema),
}).strict());

export const VersionTwoPositionsDocumentSchema = withUniquePositionIds(z.object({
  version: z.literal(2),
  positions: z.array(VersionTwoPositionSchema),
}).strict());

export const TeamSchema = z.object({ id: z.string().trim().min(1), name: z.string().trim().min(1) });
export const DepartmentSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  teams: z.array(TeamSchema),
});
export const LocationSchema = z.object({ id: z.string().trim().min(1), name: z.string().trim().min(1) });
export const ReferenceDataSchema = z.object({
  version: z.literal(REFERENCE_DATA_VERSION),
  departments: z.array(DepartmentSchema),
  locations: z.array(LocationSchema),
});

export const PositionDetailsUpdateSchema = z.object({
  status: PositionStatusSchema,
  departmentId: optionalId,
  teamId: optionalId,
  locationId: optionalId,
  hiringManager: HiringManagerSchema,
  jobPlatformLinks: z.array(JobPlatformLinkSchema),
  careerPageUrl: webUrl.nullable(),
  careerPageApplicationStatus: ApplicationChannelStatusSchema.nullable(),
  careerPageApplicationDate: ApplicationDateSchema.nullable(),
  description: RichTextDocumentSchema,
}).strict().superRefine((position, context) => {
  if (!position.careerPageUrl && (position.careerPageApplicationStatus || position.careerPageApplicationDate)) {
    context.addIssue({ code: "custom", path: ["careerPageApplicationStatus"], message: "A career page URL is required for application tracking." });
  }
});

const base64Payload = z.string()
  .max(MAX_LOGO_BASE64_LENGTH, "Logo must be 2 MB or smaller.")
  .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/, "Logo data is invalid.");

export const CompanyLogoInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }).strict(),
  z.object({ kind: z.literal("remote"), url: webUrl }).strict(),
  z.object({
    kind: z.literal("upload"),
    fileName: z.string().trim().min(1),
    mediaType: z.enum(["image/png", "image/jpeg", "image/svg+xml"]),
    dataBase64: base64Payload,
  }).strict(),
]);

export const CreatePositionInputSchema = z.object({
  companyName: z.string().trim().min(1, "Enter a company name."),
  companyLogo: CompanyLogoInputSchema,
  title: z.string().trim().min(1, "Enter a position name."),
  workMode: WorkModeSchema,
  seniority: SenioritySchema,
  employmentType: EmploymentTypeSchema.default("full_time"),
  departmentId: optionalId,
  teamId: optionalId,
  locationId: optionalId,
  hiringManager: HiringManagerSchema,
  salary: SalarySchema,
  jobPlatformLinks: z.array(JobPlatformLinkSchema),
  careerPageUrl: webUrl.nullable(),
  careerPageApplicationStatus: ApplicationChannelStatusSchema.nullable(),
  careerPageApplicationDate: ApplicationDateSchema.nullable(),
  description: RichTextDocumentSchema,
}).strict().superRefine((position, context) => {
  if (!position.careerPageUrl && (position.careerPageApplicationStatus || position.careerPageApplicationDate)) {
    context.addIssue({ code: "custom", path: ["careerPageApplicationStatus"], message: "A career page URL is required for application tracking." });
  }
});

export function descriptionFromPlainText(description: string): RichTextDocument {
  return description
    ? { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: description }] }] }
    : structuredClone(EMPTY_RICH_TEXT_DOCUMENT);
}

export function appendRequirements(description: RichTextDocument, requirements: string[]): RichTextDocument {
  const entries = requirements.filter((requirement) => requirement.length > 0);
  if (entries.length === 0) return structuredClone(description);
  return {
    type: "doc",
    content: [
      ...structuredClone(description.content),
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Requirements" }] },
      {
        type: "bulletList",
        content: entries.map((requirement) => ({
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: requirement }] }],
        })),
      },
    ],
  };
}

function mapLegacyStatus(status: z.infer<typeof LegacyPositionStatusSchema>): PositionStatus {
  return {
    draft: "saved",
    open: "applied",
    interviewing: "interviewing",
    on_hold: "paused",
    closed: "rejected",
  }[status] as PositionStatus;
}

function addApplicationMetadata<T extends {
  status: z.infer<typeof LegacyPositionStatusSchema>;
  jobPlatformLinks: z.infer<typeof LegacyJobPlatformLinkSchema>[];
  careerPageUrl: string | null;
}>(position: T) {
  return {
    ...position,
    status: mapLegacyStatus(position.status),
    jobPlatformLinks: position.jobPlatformLinks.map((link) => ({
      ...link,
      applicationStatus: null,
      applicationDate: null,
    })),
    careerPageApplicationStatus: null,
    careerPageApplicationDate: null,
  };
}

function addPreparationMetadata<T>(position: T) {
  return {
    ...position,
    questions: [],
    readingItems: [],
    submittedResume: null,
  };
}

export function normalizePositionsDocument(value: unknown): PositionsDocument {
  const current = PositionsDocumentSchema.safeParse(value);
  if (current.success) return current.data;

  const versionFive = VersionFivePositionsDocumentSchema.safeParse(value);
  if (versionFive.success) {
    return PositionsDocumentSchema.parse({
      version: DATA_VERSION,
      listView: versionFive.data.listView,
      positions: versionFive.data.positions.map(addPreparationMetadata),
    });
  }

  const versionFour = VersionFourPositionsDocumentSchema.safeParse(value);
  if (versionFour.success) {
    return PositionsDocumentSchema.parse({
      version: DATA_VERSION,
      listView: versionFour.data.listView,
      positions: versionFour.data.positions.map((position) => addPreparationMetadata(addApplicationMetadata(position))),
    });
  }

  const versionThree = VersionThreePositionsDocumentSchema.safeParse(value);
  if (versionThree.success) {
    return PositionsDocumentSchema.parse({
      version: DATA_VERSION,
      listView: DEFAULT_LIST_VIEW,
      positions: versionThree.data.positions.map((position) => addPreparationMetadata(addApplicationMetadata(position))),
    });
  }

  const versionTwo = VersionTwoPositionsDocumentSchema.safeParse(value);
  if (versionTwo.success) {
    return PositionsDocumentSchema.parse({
      version: DATA_VERSION,
      listView: DEFAULT_LIST_VIEW,
      positions: versionTwo.data.positions.map(({ requirements, ...position }) => addPreparationMetadata(addApplicationMetadata({
        ...position,
        company: { ...position.company, logoUrl: null },
        description: appendRequirements(position.description, requirements),
      }))),
    });
  }

  const legacy = LegacyPositionsDocumentSchema.safeParse(value);
  if (legacy.success) {
    return PositionsDocumentSchema.parse({
      version: DATA_VERSION,
      listView: DEFAULT_LIST_VIEW,
      positions: legacy.data.positions.map(({ requirements, description, ...position }) => addPreparationMetadata(addApplicationMetadata({
        ...position,
        company: { ...position.company, logoUrl: null },
        description: appendRequirements(descriptionFromPlainText(description), requirements),
        jobPlatformLinks: [],
        careerPageUrl: null,
      }))),
    });
  }

  throw current.error;
}

export type PositionStatus = z.infer<typeof PositionStatusSchema>;
export type ApplicationChannelStatus = z.infer<typeof ApplicationChannelStatusSchema>;
export type WorkMode = z.infer<typeof WorkModeSchema>;
export type EmploymentType = z.infer<typeof EmploymentTypeSchema>;
export type Seniority = z.infer<typeof SenioritySchema>;
export type SortColumn = z.infer<typeof SortColumnSchema>;
export type SortDirection = z.infer<typeof SortDirectionSchema>;
export type ListViewPreference = z.infer<typeof ListViewPreferenceSchema>;
export type ReorderPositionInput = z.infer<typeof ReorderPositionInputSchema>;
export type Company = z.infer<typeof CompanySchema>;
export type HiringManager = z.infer<typeof HiringManagerSchema>;
export type Salary = z.infer<typeof SalarySchema>;
export type CompanyLogoInput = z.infer<typeof CompanyLogoInputSchema>;
export type CreatePositionInput = z.infer<typeof CreatePositionInputSchema>;
export type JobPlatformLink = z.infer<typeof JobPlatformLinkSchema>;
export type Position = z.infer<typeof PositionSchema>;
export type PositionSummary = z.infer<typeof PositionSummarySchema>;
export type PositionsDocument = z.infer<typeof PositionsDocumentSchema>;
export type Department = z.infer<typeof DepartmentSchema>;
export type Team = z.infer<typeof TeamSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type ReferenceData = z.infer<typeof ReferenceDataSchema>;
export type PositionDetailsUpdate = z.infer<typeof PositionDetailsUpdateSchema>;
export type QuestionCategory = z.infer<typeof QuestionCategorySchema>;
export type QuestionCodeLanguage = z.infer<typeof QuestionCodeLanguageSchema>;
export type PositionQuestionInput = z.infer<typeof PositionQuestionInputSchema>;
export type PositionQuestion = z.infer<typeof PositionQuestionSchema>;
export type ReadingItemInput = z.infer<typeof ReadingItemInputSchema>;
export type ReadingItem = z.infer<typeof ReadingItemSchema>;
export type SubmittedResume = z.infer<typeof SubmittedResumeSchema>;
