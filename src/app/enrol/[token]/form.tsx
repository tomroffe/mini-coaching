"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Camera, CameraOff, Plus, X } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import { Button, Card, Field, Input } from "@/components/ui";
import { cn, todayISO } from "@/lib/utils";
import { completeEnrolment, type EnrolInput } from "./actions";

type Child = { key: number; firstName: string; lastName: string; dob: string; photoConsent: "" | "yes" | "no" };
let k = 0;
const blankChild = (): Child => ({ key: ++k, firstName: "", lastName: "", dob: "", photoConsent: "" });

export function EnrolForm({ token, signedInAs }: { token: string; signedInAs?: string }) {
  const [state, dispatch, pending] = useActionState(completeEnrolment.bind(null, token), undefined);
  const [mode, setMode] = useState<"new" | "existing" | "session">(signedInAs ? "session" : "new");
  const [acct, setAcct] = useState({ parentName: "", email: "", password: "", confirm: "" });
  const [children, setChildren] = useState<Child[]>([blankChild()]);

  const setChild = (key: number, patch: Partial<Child>) => setChildren((cs) => cs.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  const a = (f: keyof typeof acct) => ({ value: acct[f], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setAcct((s) => ({ ...s, [f]: e.target.value })) });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input: EnrolInput = {
      mode,
      ...acct,
      children: children.map(({ firstName, lastName, dob, photoConsent }) => ({ firstName, lastName, dob, photoConsent: photoConsent as "yes" | "no" })),
    };
    startTransition(() => dispatch(input));
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Your account</h2>
        {mode === "session" ? (
          <p className="text-sm">
            Signed in as <span className="font-semibold">{signedInAs}</span>.{" "}
            <button type="button" className="text-brand underline" onClick={() => setMode("existing")}>Not you?</button>
          </p>
        ) : (
          <>
            <div className="mb-4 flex gap-1 rounded-xl bg-surface-2 p-1 text-sm" role="tablist">
              {(["new", "existing"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => setMode(m)}
                  className={cn("relative flex-1 rounded-lg px-3 py-2 font-medium", mode === m ? "text-text" : "text-muted")}
                >
                  {mode === m && <motion.span layoutId="acct-tab" className="absolute inset-0 rounded-lg bg-surface shadow-sm" />}
                  <span className="relative">{m === "new" ? "New here" : "I already have an account"}</span>
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {mode === "new" && (
                <Field label="Your name"><Input {...a("parentName")} autoComplete="name" required /></Field>
              )}
              <Field label="Email"><Input type="email" {...a("email")} autoComplete="email" inputMode="email" required /></Field>
              <Field label={mode === "new" ? "Choose a password" : "Password"} hint={mode === "new" ? "At least 10 characters." : undefined}>
                <Input type="password" {...a("password")} autoComplete={mode === "new" ? "new-password" : "current-password"} minLength={mode === "new" ? 10 : undefined} required />
              </Field>
              {mode === "new" && (
                <Field label="Confirm password"><Input type="password" {...a("confirm")} autoComplete="new-password" required /></Field>
              )}
            </div>
          </>
        )}
      </Card>

      <AnimatePresence initial={false}>
        {children.map((c, i) => (
          <motion.div key={c.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
            <Card className="relative p-5">
              <h2 className="mb-3 font-semibold">{children.length > 1 ? `Child ${i + 1}` : "Your child"}</h2>
              {children.length > 1 && (
                <button type="button" aria-label={`Remove child ${i + 1}`} onClick={() => setChildren((cs) => cs.filter((x) => x.key !== c.key))} className="absolute top-4 right-4 text-muted hover:text-danger">
                  <X className="size-5" />
                </button>
              )}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="First name"><Input value={c.firstName} onChange={(e) => setChild(c.key, { firstName: e.target.value })} autoComplete="off" required /></Field>
                  <Field label="Last name"><Input value={c.lastName} onChange={(e) => setChild(c.key, { lastName: e.target.value })} autoComplete="off" required /></Field>
                </div>
                <Field label="Date of birth (optional)"><Input type="date" value={c.dob} max={todayISO()} onChange={(e) => setChild(c.key, { dob: e.target.value })} /></Field>
                <fieldset>
                  <legend className="mb-1.5 text-sm font-medium">Photo consent</legend>
                  <div className="space-y-2">
                    {([
                      { v: "yes", icon: Camera, title: "Yes, photos are OK", text: "Coaches may take and store a photo of my child for the club register. Only visible to coaches and me." },
                      { v: "no", icon: CameraOff, title: "No photos", text: "No photo will be stored. I can change this later." },
                    ] as const).map((o) => (
                      <label key={o.v} className={cn("flex cursor-pointer gap-3 rounded-xl border-2 p-3 text-sm transition", c.photoConsent === o.v ? "border-brand bg-brand-soft" : "border-border")}>
                        <input type="radio" name={`consent-${c.key}`} value={o.v} checked={c.photoConsent === o.v} onChange={() => setChild(c.key, { photoConsent: o.v })} required className="sr-only" />
                        <o.icon className={cn("mt-0.5 size-5 shrink-0", c.photoConsent === o.v ? "text-brand" : "text-muted")} />
                        <span><span className="block font-semibold">{o.title}</span><span className="text-muted">{o.text}</span></span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {children.length < 4 && (
        <button type="button" onClick={() => setChildren((cs) => [...cs, blankChild()])} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-3 text-sm font-medium text-muted hover:border-brand hover:text-brand">
          <Plus className="size-4" /> Add another child
        </button>
      )}

      {state?.error && <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-danger" role="alert">{state.error}</p>}
      <Button className="h-12 w-full text-base" disabled={pending}>{pending ? "Enrolling…" : "Enrol"}</Button>
    </form>
  );
}
