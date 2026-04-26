"use client";

import { FormEvent, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

export default function AdminAuthPanel({
  signedInEmail,
  canManage,
}: {
  signedInEmail?: string | null;
  canManage: boolean;
}) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        window.location.reload();
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signInGoogle = async () => {
    setBusy(true);
    setMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/admin/reports`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const signInEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/admin/reports`;
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo },
      });
      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Magic link sent. Please check your email.");
      }
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    setMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={{ marginBottom: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8, background: "#fafafa" }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: "#111", fontSize: 18 }}>Admin Login</div>
      {signedInEmail ? (
        <div style={{ marginBottom: 10, fontSize: 13, color: "#333" }}>
          Signed in: <b>{signedInEmail}</b>
          {!canManage ? <span style={{ color: "#b00020", marginLeft: 8 }}>Not authorized admin</span> : null}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
        <button
          type="button"
          onClick={signInGoogle}
          disabled={busy}
          style={{
            minHeight: 42,
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #bbb",
            background: "#fff",
            color: "#111",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Sign in with Google
        </button>
        {signedInEmail ? (
          <button
            type="button"
            onClick={signOut}
            disabled={busy}
            style={{
              minHeight: 42,
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #bbb",
              background: "#fff",
              color: "#111",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        ) : null}
      </div>

      <form onSubmit={signInEmail} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="email"
          placeholder="Email login"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            minWidth: 280,
            width: "min(100%, 380px)",
            minHeight: 42,
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid #bbb",
            color: "#111",
            background: "#fff",
          }}
        />
        <button
          type="submit"
          disabled={busy || !email.trim()}
          style={{
            minHeight: 42,
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #bbb",
            background: "#fff",
            color: "#111",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Sign in with email
        </button>
      </form>
      {message ? <div style={{ marginTop: 8, fontSize: 12, color: "#333" }}>{message}</div> : null}
      <style>{`input::placeholder { color: #666; opacity: 1; }`}</style>
    </section>
  );
}
