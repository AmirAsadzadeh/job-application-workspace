import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  CreatePositionInputSchema,
  ListViewPreferenceSchema,
  PositionDetailsUpdateSchema,
  PositionQuestionInputSchema,
  PositionStatusSchema,
  ReadingItemInputSchema,
  type Position,
  type PositionsDocument,
} from "@workspace/domain/positionSchema";
import type { WorkspaceAuth } from "../auth/auth.js";
import { requireSession } from "../auth/requireSession.js";
import type { Database } from "../db/connection.js";
import { createOnlineWorkspaceRepository } from "../repositories/onlineWorkspaceRepository.js";

function expectedRevision(request: FastifyRequest) {
  const value = request.headers["if-match"];
  const revision = Number(Array.isArray(value) ? value[0] : value);
  if (!Number.isInteger(revision) || revision < 0) throw failure(422, "VALIDATION_FAILED", "A current workspace revision is required.");
  return revision;
}

function failure(statusCode: number, code: string, message: string) {
  return Object.assign(new Error(message), { statusCode, code });
}

function positionById(document: PositionsDocument, positionId: string) {
  const position = document.positions.find((candidate) => candidate.id === positionId);
  if (!position) throw failure(404, "NOT_FOUND", "Position was not found.");
  return position;
}

export function registerWorkspaceRoutes(server: FastifyInstance, auth: WorkspaceAuth, database: Database) {
  const repository = createOnlineWorkspaceRepository(database);
  const authenticated = requireSession(auth);

  server.get("/api/workspace", { preHandler: authenticated }, async (request) => {
    const workspace = await repository.ensure(request.account!.id);
    return { revision: workspace.revision, updatedAt: workspace.updatedAt, positions: workspace.positions, referenceData: workspace.referenceData };
  });
  server.get("/api/workspace/revision", { preHandler: authenticated }, async (request) => {
    const workspace = await repository.ensure(request.account!.id);
    return { revision: workspace.revision, updatedAt: workspace.updatedAt };
  });
  server.get("/api/reference-data", { preHandler: authenticated }, async (request) => (await repository.ensure(request.account!.id)).referenceData);

  server.get("/api/positions", { preHandler: authenticated }, async (request) => {
    const workspace = await repository.ensure(request.account!.id);
    const query = request.query as { q?: string; status?: string };
    const status = query.status ? PositionStatusSchema.parse(query.status) : undefined;
    const term = query.q?.trim().toLocaleLowerCase();
    const filtered = workspace.positions.positions.filter((position) => (!status || position.status === status) && (!term || `${position.company.name} ${position.title}`.toLocaleLowerCase().includes(term)));
    return { positions: filtered.map(({ id, company, title, status: currentStatus, workMode, seniority, updatedAt }) => ({ id, company, title, status: currentStatus, workMode, seniority, updatedAt })), listView: workspace.positions.listView, revision: workspace.revision };
  });

  server.post("/api/positions", { preHandler: authenticated }, async (request, reply) => {
    const input = CreatePositionInputSchema.safeParse(request.body);
    if (!input.success) throw failure(422, "VALIDATION_FAILED", "Check the position fields.");
    if (input.data.companyLogo.kind === "upload") throw failure(422, "FILE_INVALID", "Upload the company logo after creating the Online position.");
    const workspace = await repository.ensure(request.account!.id);
    const now = new Date().toISOString();
    const position: Position = {
      id: `pos-${randomUUID()}`,
      company: { name: input.data.companyName, logoPath: null, logoUrl: input.data.companyLogo.kind === "remote" ? input.data.companyLogo.url : null },
      title: input.data.title, status: "saved", workMode: input.data.workMode, employmentType: input.data.employmentType, seniority: input.data.seniority,
      departmentId: input.data.departmentId, teamId: input.data.teamId, locationId: input.data.locationId, hiringManager: input.data.hiringManager, salary: input.data.salary,
      jobPlatformLinks: input.data.jobPlatformLinks, careerPageUrl: input.data.careerPageUrl, careerPageApplicationStatus: input.data.careerPageApplicationStatus, careerPageApplicationDate: input.data.careerPageApplicationDate,
      description: input.data.description, questions: [], readingItems: [], submittedResume: null, createdAt: now, updatedAt: now,
    };
    const revision = await repository.replace(request.account!.id, { ...workspace.positions, positions: [...workspace.positions.positions, position] }, workspace.referenceData, expectedRevision(request));
    return reply.status(201).send({ position, workspaceRevision: revision, positionRevision: 0 });
  });

  server.get("/api/positions/:positionId", { preHandler: authenticated }, async (request) => {
    const workspace = await repository.ensure(request.account!.id);
    return { position: positionById(workspace.positions, (request.params as { positionId: string }).positionId), workspaceRevision: workspace.revision };
  });

  server.patch("/api/positions/:positionId", { preHandler: authenticated }, async (request) => {
    const update = PositionDetailsUpdateSchema.safeParse(request.body);
    if (!update.success) throw failure(422, "VALIDATION_FAILED", "Check the position fields.");
    const workspace = await repository.ensure(request.account!.id);
    const current = positionById(workspace.positions, (request.params as { positionId: string }).positionId);
    const next: Position = { ...current, ...update.data, updatedAt: new Date().toISOString() };
    const positions = workspace.positions.positions.map((position) => position.id === current.id ? next : position);
    const revision = await repository.replace(request.account!.id, { ...workspace.positions, positions }, workspace.referenceData, expectedRevision(request));
    return { position: next, workspaceRevision: revision, positionRevision: revision };
  });

  server.patch("/api/positions/list-view", { preHandler: authenticated }, async (request) => {
    const listView = ListViewPreferenceSchema.safeParse(request.body);
    if (!listView.success) throw failure(422, "VALIDATION_FAILED", "List view is invalid.");
    const workspace = await repository.ensure(request.account!.id);
    const revision = await repository.replace(request.account!.id, { ...workspace.positions, listView: listView.data }, workspace.referenceData, expectedRevision(request));
    return { listView: listView.data, revision };
  });

  server.patch("/api/positions/order", { preHandler: authenticated }, async (request) => {
    const orderedIds = (request.body as { orderedIds?: unknown })?.orderedIds;
    if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== "string") || new Set(orderedIds).size !== orderedIds.length) throw failure(422, "VALIDATION_FAILED", "Position order is invalid.");
    const workspace = await repository.ensure(request.account!.id);
    if (orderedIds.length !== workspace.positions.positions.length || workspace.positions.positions.some((position) => !orderedIds.includes(position.id))) throw failure(422, "VALIDATION_FAILED", "Position order must include every position once.");
    const byId = new Map(workspace.positions.positions.map((position) => [position.id, position]));
    const positions = orderedIds.map((id) => byId.get(id)!);
    const revision = await repository.replace(request.account!.id, { ...workspace.positions, listView: { mode: "manual", column: null, direction: null }, positions }, workspace.referenceData, expectedRevision(request));
    return { positions: orderedIds, revision };
  });

  server.post("/api/positions/:positionId/questions", { preHandler: authenticated }, async (request, reply) => {
    const input = PositionQuestionInputSchema.safeParse(request.body);
    if (!input.success) throw failure(422, "VALIDATION_FAILED", "Check the question fields.");
    const workspace = await repository.ensure(request.account!.id);
    const current = positionById(workspace.positions, (request.params as { positionId: string }).positionId);
    const now = new Date().toISOString();
    const question = { ...input.data, id: `question-${randomUUID()}`, createdAt: now, updatedAt: now };
    const next = { ...current, questions: [...current.questions, question], updatedAt: now };
    const revision = await repository.replace(request.account!.id, { ...workspace.positions, positions: workspace.positions.positions.map((position) => position.id === current.id ? next : position) }, workspace.referenceData, expectedRevision(request));
    return reply.status(201).send({ question, position: next, workspaceRevision: revision });
  });

  server.patch("/api/positions/:positionId/questions/:questionId", { preHandler: authenticated }, async (request) => {
    const input = PositionQuestionInputSchema.safeParse(request.body);
    if (!input.success) throw failure(422, "VALIDATION_FAILED", "Check the question fields.");
    const { positionId, questionId } = request.params as { positionId: string; questionId: string };
    const workspace = await repository.ensure(request.account!.id);
    const current = positionById(workspace.positions, positionId);
    const existing = current.questions.find((question) => question.id === questionId);
    if (!existing) throw failure(404, "NOT_FOUND", "Question was not found.");
    const now = new Date().toISOString();
    const question = { ...existing, ...input.data, updatedAt: now };
    const next = { ...current, questions: current.questions.map((candidate) => candidate.id === questionId ? question : candidate), updatedAt: now };
    const revision = await repository.replace(request.account!.id, { ...workspace.positions, positions: workspace.positions.positions.map((position) => position.id === current.id ? next : position) }, workspace.referenceData, expectedRevision(request));
    return { question, position: next, workspaceRevision: revision };
  });

  server.delete("/api/positions/:positionId/questions/:questionId", { preHandler: authenticated }, async (request) => {
    const { positionId, questionId } = request.params as { positionId: string; questionId: string };
    const workspace = await repository.ensure(request.account!.id);
    const current = positionById(workspace.positions, positionId);
    if (!current.questions.some((question) => question.id === questionId)) throw failure(404, "NOT_FOUND", "Question was not found.");
    const now = new Date().toISOString();
    const next = { ...current, questions: current.questions.filter((question) => question.id !== questionId), updatedAt: now };
    const revision = await repository.replace(request.account!.id, { ...workspace.positions, positions: workspace.positions.positions.map((position) => position.id === current.id ? next : position) }, workspace.referenceData, expectedRevision(request));
    return { position: next, workspaceRevision: revision };
  });

  server.post("/api/positions/:positionId/readiness/readings", { preHandler: authenticated }, async (request, reply) => {
    const input = ReadingItemInputSchema.safeParse(request.body);
    if (!input.success) throw failure(422, "VALIDATION_FAILED", "Check the reading fields.");
    const workspace = await repository.ensure(request.account!.id);
    const current = positionById(workspace.positions, (request.params as { positionId: string }).positionId);
    const now = new Date().toISOString();
    const reading = { ...input.data, id: `reading-${randomUUID()}`, createdAt: now, updatedAt: now };
    const next = { ...current, readingItems: [...current.readingItems, reading], updatedAt: now };
    const revision = await repository.replace(request.account!.id, { ...workspace.positions, positions: workspace.positions.positions.map((position) => position.id === current.id ? next : position) }, workspace.referenceData, expectedRevision(request));
    return reply.status(201).send({ reading, position: next, workspaceRevision: revision });
  });

  server.patch("/api/positions/:positionId/readiness/readings/:readingId", { preHandler: authenticated }, async (request) => {
    const input = ReadingItemInputSchema.safeParse(request.body);
    if (!input.success) throw failure(422, "VALIDATION_FAILED", "Check the reading fields.");
    const { positionId, readingId } = request.params as { positionId: string; readingId: string };
    const workspace = await repository.ensure(request.account!.id);
    const current = positionById(workspace.positions, positionId);
    const existing = current.readingItems.find((reading) => reading.id === readingId);
    if (!existing) throw failure(404, "NOT_FOUND", "Reading item was not found.");
    const now = new Date().toISOString();
    const reading = { ...existing, ...input.data, updatedAt: now };
    const next = { ...current, readingItems: current.readingItems.map((candidate) => candidate.id === readingId ? reading : candidate), updatedAt: now };
    const revision = await repository.replace(request.account!.id, { ...workspace.positions, positions: workspace.positions.positions.map((position) => position.id === current.id ? next : position) }, workspace.referenceData, expectedRevision(request));
    return { reading, position: next, workspaceRevision: revision };
  });

  server.delete("/api/positions/:positionId/readiness/readings/:readingId", { preHandler: authenticated }, async (request) => {
    const { positionId, readingId } = request.params as { positionId: string; readingId: string };
    const workspace = await repository.ensure(request.account!.id);
    const current = positionById(workspace.positions, positionId);
    if (!current.readingItems.some((reading) => reading.id === readingId)) throw failure(404, "NOT_FOUND", "Reading item was not found.");
    const now = new Date().toISOString();
    const next = { ...current, readingItems: current.readingItems.filter((reading) => reading.id !== readingId), updatedAt: now };
    const revision = await repository.replace(request.account!.id, { ...workspace.positions, positions: workspace.positions.positions.map((position) => position.id === current.id ? next : position) }, workspace.referenceData, expectedRevision(request));
    return { position: next, workspaceRevision: revision };
  });
}
