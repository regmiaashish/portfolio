import { type FormEvent, useState } from "react";

import { Button } from "../../components/ui/Button";
import { Input, PasswordInput } from "../../components/ui/Field";
import { ApiError } from "../../lib/api";
import { login } from "../api";
import styles from "../Admin.module.css";

interface LoginPageProps {
  notice?: string;
  onSignedIn: () => Promise<void>;
}

export function LoginPage({ notice, onSignedIn }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      await onSignedIn();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Signing in failed. Try again.");
      setBusy(false);
    }
  };

  return (
    <main className={styles.loginCard}>
      <h1>Site admin</h1>
      <p className={styles.muted}>Sign in to edit the public site.</p>
      {notice && (
        <p role="status" className={styles.status}>
          {notice}
        </p>
      )}
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {error && (
          <p role="alert" className={styles.alert}>
            {error}
          </p>
        )}
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <PasswordInput
          label="Password"
          name="password"
          autoComplete="current-password"
          maxLength={128}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Button type="submit" variant="primary" disabled={busy} aria-busy={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </main>
  );
}
