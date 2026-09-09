import { useState, useEffect } from "react";
import { CalendarCheck, Loader2 } from "lucide-react";

import AuthGate from "./components/AuthGate";
import BoardShell from "./components/BoardShell";

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const email = localStorage.getItem("sb_session");
    if (email) {
      const raw = localStorage.getItem(`sb_account:${email}`);
      if (raw) {
        let acct = JSON.parse(raw);
        if (acct.name === "Jordan Avery" || !acct.name) {
          acct.name = "Aftab";
          acct.email = "aftab@dev.local";
          localStorage.setItem("sb_account:aftab@dev.local", JSON.stringify(acct));
          localStorage.setItem("sb_session", "aftab@dev.local");
        }
        setUser(acct);
      } else {
        localStorage.removeItem("sb_session");
      }
    }
    setChecking(false);
  }, []);

  if (checking) {
    return (
      <div className="sb-splash">
        <div className="sb-mark">
          <CalendarCheck size={22} strokeWidth={2.25} color="#fff" />
        </div>
        <Loader2 size={20} className="sb-spin" color="#6E6E73" />
      </div>
    );
  }

  if (!user) {
    return <AuthGate onSignedIn={setUser} />;
  }

  return (
    <BoardShell
      user={user}
      onSignOut={() => setUser(null)}
    />
  );
}
