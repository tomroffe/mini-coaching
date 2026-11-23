"use client";

import { Camera, Trash2, X } from "lucide-react";
import { useActionState } from "react";
import { Button, Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui";
import { deletePlayer, linkGuardian, removePhoto, unlinkGuardian, updatePlayer, uploadPhoto } from "../actions";

type Player = { id: string; firstName: string; lastName: string; dob: string | null; ageGroupId: string | null; photoConsent: boolean; medicalNotes: string; emergencyContact: string; active: boolean };

export function PlayerDetailsForm({ player: p, groups, canEdit, canDelete }: { player: Player; groups: { id: string; code: string }[]; canEdit: boolean; canDelete: boolean }) {
  const [state, action, pending] = useActionState(updatePlayer.bind(null, p.id), undefined);
  return (
    <Card>
      <CardHeader title="Details" />
      <form action={action} className="space-y-3 px-5 pb-5">
        <fieldset disabled={!canEdit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name"><Input name="firstName" defaultValue={p.firstName} required /></Field>
            <Field label="Last name"><Input name="lastName" defaultValue={p.lastName} required /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of birth"><Input type="date" name="dob" defaultValue={p.dob ?? ""} /></Field>
            <Field label="Age group">
              <Select name="ageGroupId" defaultValue={p.ageGroupId ?? ""}>{groups.map((g) => <option key={g.id} value={g.id}>{g.code}</option>)}</Select>
            </Field>
          </div>
          <label className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm">
            <input type="checkbox" name="photoConsent" defaultChecked={p.photoConsent} className="mt-0.5 accent-[var(--brand)]" />
            <span><span className="font-medium">Photo consent given</span><br /><span className="text-xs text-muted">Unticking deletes any stored photo straight away.</span></span>
          </label>
          <Field label="Medical notes" hint="Allergies, asthma, conditions. Visible to this age group's coaches only."><Textarea name="medicalNotes" defaultValue={p.medicalNotes} rows={2} /></Field>
          <Field label="Emergency contact"><Input name="emergencyContact" defaultValue={p.emergencyContact} placeholder="Name, relationship, phone" /></Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="hidden" name="active" value="off" />
            <input type="checkbox" name="active" value="on" defaultChecked={p.active} className="accent-[var(--brand)]" /> Active player
          </label>
        </fieldset>
        {canEdit && (
          <div className="flex items-center gap-3">
            <Button disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
            {state?.ok && <span className="text-sm text-brand">{state.ok}</span>}
            {state?.error && <span className="text-sm text-danger">{state.error}</span>}
            {canDelete && (
              <button type="button" className="ml-auto text-sm text-muted hover:text-danger" onClick={() => { if (window.confirm(`Permanently delete ${p.firstName}'s record, attendance and awards?`)) deletePlayer(p.id); }}>
                Delete
              </button>
            )}
          </div>
        )}
      </form>
    </Card>
  );
}

export function PhotoForm({ playerId, hasPhoto, consent }: { playerId: string; hasPhoto: boolean; consent: boolean }) {
  const [state, action, pending] = useActionState(uploadPhoto.bind(null, playerId), undefined);
  if (!consent) {
    return (
      <Card className="border-dashed p-4 text-sm text-muted">
        <Camera className="mb-1 size-5" />
        Photo upload is locked until photo consent is recorded below.
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader title="Photo" />
      <form action={action} className="space-y-2 px-5 pb-5">
        <Input type="file" name="photo" accept="image/jpeg,image/png,image/webp" capture="user" className="py-1.5" />
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={pending}><Camera className="size-4" /> {pending ? "Uploading…" : hasPhoto ? "Replace" : "Upload"}</Button>
          {hasPhoto && <Button size="sm" variant="ghost" type="button" onClick={() => removePhoto(playerId)}><Trash2 className="size-4" /> Remove</Button>}
        </div>
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      </form>
    </Card>
  );
}

export function GuardianForm({ playerId, guardians, canEdit }: { playerId: string; guardians: { id: string; name: string; email: string }[]; canEdit: boolean }) {
  const [state, action, pending] = useActionState(linkGuardian.bind(null, playerId), undefined);
  return (
    <Card>
      <CardHeader title="Parents / guardians" subtitle="Linked parents can see this child's schedule, attendance and awards." />
      <div className="space-y-2 px-5 pb-5">
        {guardians.length === 0 && <p className="text-sm text-muted">None linked.</p>}
        {guardians.map((g) => (
          <div key={g.id} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm">
            <div><div className="font-medium">{g.name}</div><div className="text-xs text-muted">{g.email}</div></div>
            {canEdit && <button onClick={() => unlinkGuardian(playerId, g.id)} className="text-muted hover:text-danger" aria-label="Unlink"><X className="size-4" /></button>}
          </div>
        ))}
        {canEdit && (
          <form action={action} className="flex gap-2 pt-1">
            <Input name="email" type="email" placeholder="parent@email" required />
            <Button size="sm" variant="secondary" disabled={pending} className="h-10">Link</Button>
          </form>
        )}
        {state?.error && <p className="text-xs text-danger">{state.error}</p>}
        {state?.ok && <p className="text-xs text-brand">{state.ok}</p>}
      </div>
    </Card>
  );
}
