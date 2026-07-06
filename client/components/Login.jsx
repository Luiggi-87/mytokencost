import React, { useState } from "react";
import "../styles/Login.css";

function getResetTokenFromUrl() {
  return new URLSearchParams(window.location.search).get("reset_token");
}

export default function Login({ onLogin }) {
  const resetTokenFromUrl = getResetTokenFromUrl();
  const [mode, setMode] = useState(resetTokenFromUrl ? "reset" : "login"); // login | register | forgot | reset
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfoMessage("");

    try {
      if (mode === "forgot") {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao solicitar redefinição");
        setInfoMessage(data.message);
        return;
      }

      if (mode === "reset") {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: resetTokenFromUrl, newPassword }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao redefinir senha");
        setInfoMessage("Senha redefinida com sucesso! Faça login com sua nova senha.");
        window.history.replaceState({}, "", window.location.pathname);
        setMode("login");
        return;
      }

      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = {
        email,
        password,
        ...(mode === "register" && { organizationName }),
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao autenticar");
      }

      const data = await res.json();
      onLogin(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <img src="/logo.svg" alt="MyTokenCost" className="login-logo" />
        <h1>MyTokenCost</h1>
        <p>Real-time API cost management</p>

        {mode === "reset" && (
          <p style={{ textAlign: "center", color: "var(--text-muted)", marginTop: "-1rem", marginBottom: "1.5rem" }}>
            Crie sua nova senha
          </p>
        )}

        <form onSubmit={handleSubmit}>
          {(mode === "login" || mode === "register" || mode === "forgot") && (
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          )}

          {(mode === "login" || mode === "register") && (
            <div className="form-group">
              <label>Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          )}

          {mode === "reset" && (
            <div className="form-group">
              <label>Nova senha</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
              />
            </div>
          )}

          {mode === "register" && (
            <div className="form-group">
              <label>Nome da Organização</label>
              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          {mode === "login" && (
            <button
              type="button"
              className="forgot-password-link"
              onClick={() => {
                setMode("forgot");
                setError("");
                setInfoMessage("");
              }}
              disabled={loading}
            >
              Esqueci minha senha
            </button>
          )}

          {error && <div className="error-message">{error}</div>}
          {infoMessage && <div className="info-message">{infoMessage}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading
              ? "Carregando..."
              : mode === "login"
              ? "Entrar"
              : mode === "register"
              ? "Cadastrar"
              : mode === "forgot"
              ? "Enviar instruções"
              : "Redefinir senha"}
          </button>
        </form>

        {(mode === "login" || mode === "register") && (
          <p className="toggle-mode">
            {mode === "login" ? "Novo por aqui? " : "Já tem conta? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
                setInfoMessage("");
              }}
            >
              {mode === "login" ? "Cadastre-se" : "Faça login"}
            </button>
          </p>
        )}

        {mode === "forgot" && (
          <p className="toggle-mode">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
                setInfoMessage("");
              }}
            >
              Voltar para login
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
