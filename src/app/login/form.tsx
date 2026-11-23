"use client";

import { useActionState } from "react";
import { Button, Field, Input } from "@/components/ui";
import { acceptInvite, login } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" required autoFocus />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      {state?.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
      <Button className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export function InviteForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(acceptInvite.bind(null, token), undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="Email">
        <Input value={email} disabled />
      </Field>
      <Field label="Choose a password" hint="At least 10 characters.">
        <Input name="password" type="password" autoComplete="new-password" minLength={10} required autoFocus />
      </Field>
      {state?.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
      <Button className="w-full" disabled={pending}>
        {pending ? "Setting up…" : "Create account"}
      </Button>
    </form>
  );
}
