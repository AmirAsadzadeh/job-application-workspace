import { WorkspaceRouter } from "./WorkspaceRouter";
import { WebOnlineWorkspace } from "../features/workspace/WebOnlineWorkspace";

export function App() {
  return import.meta.env.VITE_WORKSPACE_MODE === "online" ? <WebOnlineWorkspace /> : <WorkspaceRouter />;
}
