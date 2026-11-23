"use client";

import { ExternalLink, Film, Link2, Trash2, Upload } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { Button, Card, CardHeader, Input } from "@/components/ui";
import { addDrillMedia, removeDrillMedia } from "../actions";

type Media = { id: string; type: "upload" | "youtube" | "vimeo" | "image" | "link"; storageKey: string | null; url: string | null; mime: string | null; caption: string };

export function MediaManager({ drillId, slug, media, canEdit }: { drillId: string; slug: string; media: Media[]; canEdit: boolean }) {
  const [state, action, pending] = useActionState(addDrillMedia.bind(null, drillId, slug), undefined);
  const [mode, setMode] = useState<"link" | "file">("link");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card>
      <CardHeader title="Videos & media" subtitle="Demo videos, photos of the set-up, or useful links." />
      <div className="space-y-4 px-5 pb-5">
        {media.length === 0 && <p className="text-sm text-muted">Nothing added yet.</p>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {media.map((m) => (
            <figure key={m.id} className="group relative overflow-hidden rounded-xl border border-border bg-surface-2">
              {(m.type === "youtube" || m.type === "vimeo") && (
                <iframe src={m.url!} className="aspect-video w-full" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen title={m.caption || "Video"} loading="lazy" />
              )}
              {m.type === "upload" && <video src={`/api/media/${m.storageKey}`} controls preload="metadata" className="aspect-video w-full bg-black" />}
              {m.type === "image" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/media/${m.storageKey}`} alt={m.caption} className="aspect-video w-full object-cover" />
              )}
              {m.type === "link" && (
                <a href={m.url!} target="_blank" rel="noreferrer" className="flex aspect-video items-center justify-center gap-2 text-sm font-medium text-brand">
                  <ExternalLink className="size-4" /> Open link
                </a>
              )}
              {(m.caption || canEdit) && (
                <figcaption className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="truncate">{m.caption}</span>
                  {canEdit && (
                    <button
                      className="rounded p-1 text-muted opacity-60 hover:text-danger group-hover:opacity-100"
                      aria-label="Remove media"
                      onClick={() => { if (window.confirm("Remove this item?")) removeDrillMedia(m.id, slug); }}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </figcaption>
              )}
            </figure>
          ))}
        </div>

        {canEdit && (
          <form
            ref={formRef}
            action={async (fd) => { await action(fd); formRef.current?.reset(); }}
            className="space-y-3 rounded-xl border border-dashed border-border p-4"
          >
            <div className="flex gap-1 rounded-lg bg-surface-2 p-1 text-sm">
              <ModeBtn active={mode === "link"} onClick={() => setMode("link")}><Link2 className="size-4" /> YouTube / Vimeo / link</ModeBtn>
              <ModeBtn active={mode === "file"} onClick={() => setMode("file")}><Upload className="size-4" /> Upload file</ModeBtn>
            </div>
            {mode === "link" ? (
              <Input name="url" type="url" placeholder="https://youtu.be/…" />
            ) : (
              <Input name="file" type="file" accept="video/mp4,video/webm,video/quicktime,image/*" className="py-1.5" />
            )}
            <div className="flex gap-2">
              <Input name="caption" placeholder="Caption (optional)" />
              <Button disabled={pending}>
                <Film className="size-4" /> {pending ? "Adding…" : "Add"}
              </Button>
            </div>
            {state?.error && <p className="text-sm text-danger">{state.error}</p>}
          </form>
        )}
      </div>
    </Card>
  );
}

function ModeBtn({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 font-medium transition ${active ? "bg-surface shadow-sm" : "text-muted"}`}>
      {children}
    </button>
  );
}
