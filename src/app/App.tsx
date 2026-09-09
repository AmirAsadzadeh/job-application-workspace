import { useEffect, useState } from "react";
import { PositionCreateRoute } from "../features/positions/components/PositionCreateRoute";
import { PositionDetailsRoute, type PositionDetailSection } from "../features/positions/components/PositionDetailsRoute";
import { PositionList } from "../features/positions/components/PositionList";

type Route = { kind: "list" } | { kind: "create" } | { kind: "details"; positionId: string; section: PositionDetailSection };

function readRoute(): Route {
  if (window.location.pathname === "/positions/new") return { kind: "create" };
  const match = window.location.pathname.match(/^\/positions\/([^/]+)(?:\/(application|role-details|readiness|questions))?\/?$/);
  return match ? { kind: "details", positionId: decodeURIComponent(match[1]), section: (match[2] ?? "application") as PositionDetailSection } : { kind: "list" };
}

function routePath(route: Route) {
  if (route.kind === "create") return "/positions/new";
  if (route.kind === "details") return `/positions/${encodeURIComponent(route.positionId)}/${route.section}`;
  return "/";
}

export function App() {
  const [route, setRoute] = useState<Route>(readRoute);
  const [createDirty, setCreateDirty] = useState(false);
  const [detailsDirty, setDetailsDirty] = useState(false);

  useEffect(() => {
    const onPopState = () => {
      const dirty = createDirty || detailsDirty;
      if (dirty && !window.confirm(createDirty ? "Discard your unsaved position?" : "Discard unsaved changes?")) {
        window.history.pushState({}, "", routePath(route));
        return;
      }
      setCreateDirty(false);
      setDetailsDirty(false);
      setRoute(readRoute());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [createDirty, detailsDirty, route]);

  function navigate(path: string, force = false) {
    if (!force && (createDirty || detailsDirty) && !window.confirm(createDirty ? "Discard your unsaved position?" : "Discard unsaved changes?")) return;
    window.history.pushState({}, "", path);
    setCreateDirty(false);
    setDetailsDirty(false);
    setRoute(readRoute());
  }

  return (
    <main className="app-shell">
      {route.kind === "list" && <header className="workspace-header"><span>Positions</span><span className="workspace-label">Hiring workspace</span></header>}
      {route.kind === "list" && <PositionList onCreate={() => navigate("/positions/new")} onOpen={(id) => navigate(`/positions/${encodeURIComponent(id)}/application`)} />}
      {route.kind === "create" && <PositionCreateRoute onDirtyChange={setCreateDirty} onBack={() => navigate("/")} onCreated={() => navigate("/", true)} />}
      {route.kind === "details" && <PositionDetailsRoute positionId={route.positionId} section={route.section} onDirtyChange={setDetailsDirty} onBack={() => navigate("/", true)} onSectionChange={(section) => navigate(`/positions/${encodeURIComponent(route.positionId)}/${section}`, true)} />}
    </main>
  );
}
