/**
 * PhotoPicker — the 88px dashed-circle profile-photo picker, extracted out of
 * SignupPage.tsx (step 5) so ProfileCompletionPage.tsx can use the exact same
 * validated control rather than a second hand-rolled copy. Still local-preview
 * only: it hands the parent a `File` + object-URL and does nothing else — the
 * REAL upload (presign -> PUT -> register) lives in api/files.ts, and which
 * flow to call it through (signup has no session; ProfileCompletionPage does)
 * is a decision only the parent can make.
 *
 * `validatePhotoFile` enforces the exact same constraints backend-initial's
 * `therapist_photo` document class does server-side (image/*, <=10MB — see
 * shared/storage/document-classes.ts) — not an arbitrary UI limit.
 */
import { useState, type ChangeEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Camera } from 'lucide-react';

/** Matches backend-initial's `therapist_photo` document class cap exactly. */
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export function validatePhotoFile(file: { type: string; size: number }): string | null {
  if (!file.type.startsWith('image/')) {
    return 'Please choose an image file (JPG, PNG, etc.)';
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return 'Photo must be under 10 MB';
  }
  return null;
}

export interface PhotoPickerProps {
  /** Object URL (or a real signed download URL) to render as the current
   *  photo. `null` shows the empty dashed-circle state (or `fallback`). */
  previewUrl: string | null;
  /** Shown instead of the camera icon when there's no photo yet but the
   *  caller has something better to show (e.g. name initials). */
  fallback?: ReactNode;
  /** Called with the picked File once it passes `validatePhotoFile` — the
   *  caller owns the object URL's lifecycle (create/revoke). */
  onFileSelected: (file: File) => void;
  /** Must be unique on the page if more than one picker is ever mounted at
   *  once — it backs the <label htmlFor>/<input id> pairing. */
  inputId?: string;
  disabled?: boolean;
}

export function PhotoPicker({
  previewUrl,
  fallback,
  onFileSelected,
  inputId = 'profile-photo-input',
  disabled = false,
}: PhotoPickerProps) {
  // Purely to force the native <input> to fire `change` again if the user
  // re-picks the exact same file after a validation error cleared it.
  const [inputKey, setInputKey] = useState(0);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const error = validatePhotoFile(file);
    if (error) {
      toast.error(error);
      setInputKey((k) => k + 1);
      return;
    }
    onFileSelected(file);
  };

  return (
    <label
      htmlFor={inputId}
      className={`group flex h-[88px] w-[88px] shrink-0 flex-col items-center justify-center overflow-hidden rounded-full border-[1.5px] border-dashed border-rule-hi bg-canvas transition-colors ${
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-action hover:bg-action-light/40'
      }`}
    >
      {previewUrl ? (
        <img src={previewUrl} alt="Profile preview" className="h-full w-full object-cover" />
      ) : fallback !== undefined ? (
        fallback
      ) : (
        <>
          <Camera className="h-5 w-5 text-muted-text transition-colors group-hover:text-action-dark" strokeWidth={1.75} />
          <span className="mt-1 text-[10px] text-muted-text">Add photo</span>
        </>
      )}
      <input
        key={inputKey}
        id={inputId}
        type="file"
        accept="image/*"
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
      />
    </label>
  );
}
