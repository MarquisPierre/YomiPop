"use client";

import { Upload } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";

// Shows a button that opens the device's file picker for one picture, and passes the file on.
// Shows "Uploading…" while the caller works on it.
export function UploadButton({
  label,
  onFile,
}: {
  label: string;
  onFile: (file: File) => Promise<void>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  // Hands the chosen file on, then clears the picker so the same file can be picked again.
  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    await onFile(file).finally(() => setBusy(false));
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={choose}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        <Upload aria-hidden="true" />
        {busy ? "Uploading…" : label}
      </Button>
    </>
  );
}
