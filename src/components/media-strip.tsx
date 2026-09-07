"use client";

import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";

export interface MediaStripItem {
  id: string;
  kind: "PHOTO" | "VIDEO" | "DOC" | "AUDIO";
  url: string;
  mimeType?: string;
  caption?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capturedAt?: Date | string | null;
  uploadedAt?: Date | string | null;
  entityType?: string;
}

function dateLabel(value: MediaStripItem["capturedAt"]): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
}

export function MediaStrip({
  items,
  title = "Attached media",
}: {
  items: MediaStripItem[];
  title?: string;
}) {
  const [selected, setSelected] = useState<MediaStripItem | null>(null);
  const entityTypes = [...new Set(items.map((item) => item.entityType).filter(Boolean))] as string[];
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const date = item.capturedAt ?? item.uploadedAt;
        return (
          (entityFilter === "ALL" || item.entityType === entityFilter) &&
          (!dateFilter || (date ? new Date(date).toISOString().slice(0, 10) >= dateFilter : false))
        );
      }),
    [dateFilter, entityFilter, items]
  );
  if (items.length === 0) return null;

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon icon="mdi:image-multiple-outline" width={17} />
          {title}
          <span className="text-xs text-muted-foreground">({items.length})</span>
        </div>
        {(entityTypes.length > 1 || items.length > 1) && (
          <div className="flex flex-wrap items-center gap-2">
            {entityTypes.length > 1 && (
              <select value={entityFilter} onChange={(event) => setEntityFilter(event.target.value)} className="h-8 rounded-md border bg-background px-2 text-xs">
                <option value="ALL">All record types</option>
                {entityTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            )}
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              From
              <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="h-8 rounded-md border bg-background px-2 text-xs" />
            </label>
          </div>
        )}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item)}
              className="group relative h-24 w-32 shrink-0 overflow-hidden rounded-md border bg-muted text-left"
              aria-label={item.caption ?? `${item.kind} attachment`}
            >
              {item.kind === "PHOTO" && (
                <img src={item.url} alt={item.caption ?? "Attached photo"} className="h-full w-full object-cover transition group-hover:scale-105" />
              )}
              {item.kind !== "PHOTO" && (
                <span className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground">
                  <Icon icon={item.kind === "VIDEO" ? "mdi:video-outline" : item.kind === "AUDIO" ? "mdi:microphone-outline" : "mdi:file-outline"} width={24} />
                  <span className="text-[10px]">{item.kind}</span>
                </span>
              )}
              {item.entityType && <span className="absolute bottom-0 left-0 right-0 truncate bg-black/60 px-1.5 py-1 text-[10px] text-white">{item.entityType}</span>}
            </button>
          ))}
        </div>
        {filteredItems.length === 0 && <p className="text-xs text-muted-foreground">No media matches the selected filters.</p>}
      </div>
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" onClick={() => setSelected(null)}>
          <div className="max-h-[90vh] max-w-3xl overflow-auto rounded-lg bg-background p-4 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{selected.caption ?? `${selected.kind} attachment`}</p>
                <p className="text-xs text-muted-foreground">{dateLabel(selected.capturedAt)}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close media viewer"><Icon icon="mdi:close" width={20} /></button>
            </div>
            {selected.kind === "PHOTO" && <img src={selected.url} alt={selected.caption ?? "Attached photo"} className="max-h-[65vh] w-auto max-w-full rounded object-contain" />}
            {selected.kind === "VIDEO" && <video src={selected.url} controls className="max-h-[65vh] max-w-full rounded" />}
            {selected.kind === "AUDIO" && <audio src={selected.url} controls className="w-full" />}
            {selected.kind === "DOC" && <a href={selected.url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">Open document</a>}
            {selected.latitude != null && selected.longitude != null && (
              <a className="mt-3 flex items-center gap-1 text-xs text-primary underline" href={`https://www.openstreetmap.org/?mlat=${selected.latitude}&mlon=${selected.longitude}#map=17/${selected.latitude}/${selected.longitude}`} target="_blank" rel="noreferrer">
                <Icon icon="mdi:map-marker-outline" width={15} /> View map pin ({selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)})
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function MediaUpload({
  projectId,
  entityId,
  entityType = "PROJECT",
}: {
  projectId: string;
  entityId: string;
  entityType?: string;
}) {
  const [pending, setPending] = useState(false);
  const [caption, setCaption] = useState("");

  async function upload(file: File) {
    setPending(true);
    const form = new FormData();
    form.set("file", file);
    form.set("projectId", projectId);
    form.set("entityId", entityId);
    form.set("entityType", entityType);
    form.set("kind", file.type.startsWith("image/") ? "PHOTO" : file.type.startsWith("video/") ? "VIDEO" : file.type.startsWith("audio/") ? "AUDIO" : "DOC");
    form.set("caption", caption);
    const response = await fetch("/api/media", { method: "POST", body: form });
    setPending(false);
    if (!response.ok) {
      throw new Error("Media upload failed");
    }
    window.location.reload();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Caption (optional)" className="h-8 rounded-md border bg-background px-2 text-xs" />
      <label className="inline-flex h-8 cursor-pointer items-center rounded-md border px-3 text-xs hover:bg-muted">
        {pending ? "Uploading…" : "Attach media"}
        <input type="file" className="hidden" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx" disabled={pending} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
      </label>
    </div>
  );
}
