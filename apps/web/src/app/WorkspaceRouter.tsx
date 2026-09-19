import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { PositionCreateRoute } from "../features/positions/components/PositionCreateRoute";
import { PositionDetailsRoute, type PositionDetailSection } from "../features/positions/components/PositionDetailsRoute";
import { PositionList } from "../features/positions/components/PositionList";
import { ReadinessRoute } from "../features/positions/components/ReadinessRoute";

type Route = { kind: "list" } | { kind: "create" } | { kind: "readiness" } | { kind: "readinessArticle"; articleId: string } | { kind: "details"; positionId: string; section: PositionDetailSection };
type WorkspaceApi = NonNullable<ComponentProps<typeof PositionList>["api"]> & NonNullable<ComponentProps<typeof PositionCreateRoute>["api"]> & NonNullable<ComponentProps<typeof PositionDetailsRoute>["api"]> & NonNullable<ComponentProps<typeof ReadinessRoute>["api"]>;

function readRoute(): Route {
  if (window.location.pathname === "/positions/new") return { kind: "create" };
  const readinessArticle = window.location.pathname.match(/^\/readiness\/articles\/([^/]+)\/?$/);
  if (readinessArticle) return { kind: "readinessArticle", articleId: decodeURIComponent(readinessArticle[1]) };
  if (window.location.pathname === "/readiness") return { kind: "readiness" };
  const match = window.location.pathname.match(/^\/positions\/([^/]+)(?:\/(application|role-details|readiness|questions))?\/?$/);
  if (match?.[2] === "readiness") return { kind: "readiness" };
  return match ? { kind: "details", positionId: decodeURIComponent(match[1]), section: (match[2] ?? "application") as PositionDetailSection } : { kind: "list" };
}

function routePath(route: Route) {
  if (route.kind === "create") return "/positions/new";
  if (route.kind === "readiness") return "/readiness";
  if (route.kind === "readinessArticle") return `/readiness/articles/${encodeURIComponent(route.articleId)}`;
  if (route.kind === "details") return `/positions/${encodeURIComponent(route.positionId)}/${route.section}`;
  return "/";
}

export function WorkspaceRouter({ api, headerActions }: { api?: WorkspaceApi; headerActions?: ReactNode }) {
  const [route, setRoute] = useState<Route>(readRoute);
  const [createDirty, setCreateDirty] = useState(false);
  const [detailsDirty, setDetailsDirty] = useState(false);

  useEffect(() => {
    const onPopState = () => {
      const dirty = createDirty || detailsDirty;
      if (dirty && !window.confirm(createDirty ? "Discard your unsaved position?" : "Discard unsaved changes?")) { window.history.pushState({}, "", routePath(route)); return; }
      setCreateDirty(false); setDetailsDirty(false); setRoute(readRoute());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [createDirty, detailsDirty, route]);

  function navigate(path: string, force = false) {
    if (!force && (createDirty || detailsDirty) && !window.confirm(createDirty ? "Discard your unsaved position?" : "Discard unsaved changes?")) return;
    window.history.pushState({}, "", path); setCreateDirty(false); setDetailsDirty(false); setRoute(readRoute());
  }

  return <main className="app-shell">
    {route.kind === "list" && <header className="workspace-header"><span>Positions</span><span className="workspace-header-actions"><button className="secondary-button" type="button" onClick={() => navigate("/readiness")}>Readiness</button><span className="workspace-label">Hiring workspace</span>{headerActions}</span></header>}
    {route.kind === "list" && <PositionList api={api} onCreate={() => navigate("/positions/new")} onOpen={(id) => navigate(`/positions/${encodeURIComponent(id)}/application`)} />}
    {route.kind === "create" && <PositionCreateRoute api={api} onDirtyChange={setCreateDirty} onBack={() => navigate("/")} onCreated={() => navigate("/", true)} />}
    {route.kind === "readiness" && <ReadinessRoute api={api} onDirtyChange={setDetailsDirty} onBack={() => navigate("/", true)} onOpenArticle={(id) => navigate(`/readiness/articles/${encodeURIComponent(id)}`)} />}
    {route.kind === "readinessArticle" && <ReadinessRoute api={api} articleId={route.articleId} onDirtyChange={setDetailsDirty} onBack={() => navigate("/readiness", true)} onOpenArticle={(id) => navigate(`/readiness/articles/${encodeURIComponent(id)}`, true)} onArticleDeleted={() => navigate("/readiness", true)} />}
    {route.kind === "details" && <PositionDetailsRoute api={api} positionId={route.positionId} section={route.section} onDirtyChange={setDetailsDirty} onBack={() => navigate("/", true)} onSectionChange={(section) => navigate(`/positions/${encodeURIComponent(route.positionId)}/${section}`, true)} />}
  </main>;
}
