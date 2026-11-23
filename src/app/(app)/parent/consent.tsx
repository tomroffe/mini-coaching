"use client";

import { Camera, CameraOff } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { setPhotoConsent } from "./actions";

export function ConsentToggle({ playerId, name, consent }: { playerId: string; name: string; consent: boolean }) {
  const [, start] = useTransition();
  const [on, set] = useOptimistic(consent);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
      <span className="inline-flex items-center gap-1.5 text-muted">
        {on ? <Camera className="size-4" /> : <CameraOff className="size-4" />}
        Photo consent: <span className="font-semibold text-text">{on ? "Yes" : "No"}</span>
      </span>
      <button
        type="button"
        className="text-brand underline"
        onClick={() => {
          const next = !on;
          if (!next && !window.confirm(`Withdraw photo consent for ${name}? Any stored photo will be deleted.`)) return;
          start(async () => { set(next); await setPhotoConsent(playerId, next); });
        }}
      >
        Change
      </button>
    </div>
  );
}
