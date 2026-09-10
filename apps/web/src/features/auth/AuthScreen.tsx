import { useState, type FormEvent } from "react";
import { KeyRound, LogIn, Mail, UserPlus } from "lucide-react";
import { authClient } from "./authClient";

type View = "sign-in" | "register" | "recovery";

export function AuthScreen() {
  const [view, setView] = useState<View>("sign-in");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const name = String(data.get("name") ?? "").trim();
    try {
      if (view === "recovery") {
        const result = await authClient.requestPasswordReset({ email, redirectTo: `${window.location.origin}/reset-password` });
        if (result.error) throw new Error(result.error.message);
        setMessage("If that account exists, a recovery email has been sent.");
      } else if (view === "register") {
        const result = await authClient.signUp.email({ email, password, name });
        if (result.error) throw new Error(result.error.message);
        setMessage("Check your email to verify the account.");
      } else {
        const result = await authClient.signIn.email({ email, password });
        if (result.error) throw new Error(result.error.message);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The request could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  const Icon = view === "register" ? UserPlus : view === "recovery" ? Mail : LogIn;
  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="auth-title">
        <header><Icon size={17} aria-hidden="true" /><h1 id="auth-title">{view === "register" ? "Create account" : view === "recovery" ? "Recover account" : "Sign in"}</h1></header>
        <form onSubmit={submit}>
          {view === "register" && <label>Name<input name="name" autoComplete="name" required /></label>}
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          {view !== "recovery" && <label>Password<input name="password" type="password" autoComplete={view === "register" ? "new-password" : "current-password"} minLength={12} required /></label>}
          {message && <p className="auth-message" role="status">{message}</p>}
          <button className="primary-button" type="submit" disabled={busy}><KeyRound size={14} aria-hidden="true" />{busy ? "Please wait" : view === "register" ? "Create account" : view === "recovery" ? "Send recovery email" : "Sign in"}</button>
        </form>
        <nav aria-label="Account options">
          {view !== "sign-in" && <button type="button" onClick={() => { setView("sign-in"); setMessage(""); }}>Sign in</button>}
          {view !== "register" && <button type="button" onClick={() => { setView("register"); setMessage(""); }}>Create account</button>}
          {view !== "recovery" && <button type="button" onClick={() => { setView("recovery"); setMessage(""); }}>Forgot password</button>}
        </nav>
      </section>
    </main>
  );
}
