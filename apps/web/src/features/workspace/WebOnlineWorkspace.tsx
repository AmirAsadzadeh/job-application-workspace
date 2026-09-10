import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { WorkspaceRouter } from "../../app/WorkspaceRouter";
import { AccountPanel } from "../account/AccountPanel";
import { AuthScreen } from "../auth/AuthScreen";
import { useAuth } from "../auth/AuthProvider";
import { onlinePositionApi, setOnlineAuthenticationFailureHandler } from "../positions/onlinePositionApi";

export function WebOnlineWorkspace() {
  const session = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  useEffect(() => {
    setOnlineAuthenticationFailureHandler(() => { void session.refetch(); });
    return () => setOnlineAuthenticationFailureHandler(null);
  }, [session.refetch]);
  if (session.isPending) return <main className="auth-shell"><p role="status">Checking session...</p></main>;
  if (!session.data?.user) return <AuthScreen />;
  return <>
    <WorkspaceRouter api={onlinePositionApi} headerActions={<><span className="mode-indicator">Online</span><button className="icon-button" type="button" onClick={() => setAccountOpen(true)} aria-label="Open account settings" title="Account"><UserRound size={15} /></button></>} />
    {accountOpen && <div className="modal-backdrop" role="presentation"><AccountPanel onClose={() => setAccountOpen(false)} /></div>}
  </>;
}
