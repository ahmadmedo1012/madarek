/**
 * UploadDropZone — R362 (Agent 5, §G upload experience): the drag-and-
 * drop half of the two honest pick paths.
 *
 * Both upload surfaces (the student research modal, ResearchPage.tsx,
 * and the teacher materials modal's file mode, TeacherPages.tsx) ship
 * a native <input type="file"> (the keyboard/screen-reader control) —
 * but no drop target: a teacher with the PDF already open in a file
 * manager had to round-trip the picker dialog. This wrapper turns the
 * field's region into a drop target that routes the dropped file into
 * the caller's EXISTING pickFile path — the same deep validation
 * (validatePdfFile / validatePdfFileDeep: format + 20MB + %PDF- magic
 * bytes), the same inline error seat, the same progress bar. No
 * parallel pipeline: a drop IS a pick.
 *
 * The native input remains the only focusable control (the drop region
 * is a presentation affordance — pointer + drag events only, no fake
 * button); dragenter/dragleave use a depth counter so crossing INTO
 * child elements does not flicker the affordance; a disabled zone
 * ignores drops (an in-flight upload must not be replaced mid-flight).
 *
 * Dropzone affordance + the restored .upload-file-* chip family ride
 * in src/styles/student.css (§upload modal body — see the family note
 * there).
 */
import {
  useCallback,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type ReactNode,
} from 'react';
import { FileUp } from 'lucide-react';
import { Icon } from '../Icon';

export function UploadDropZone({
  onFile,
  disabled = false,
  hint = 'أو أفلِت ملف الـ PDF هنا.',
  children,
}: {
  /** The dropped file routed into the caller's pick path (validation
   *  and error display stay the caller's — one pipeline, no fork). */
  onFile: (file: File) => void;
  /** Pending uploads lock the zone (an in-flight body is not
   *  replaceable mid-flight). */
  disabled?: boolean;
  /** The affordance's standing hint line (aria-hidden — the native
   *  input's label + the field's FormField hint carry the semantics). */
  hint?: string;
  children: ReactNode;
}) {
  const [over, setOver] = useState(false);
  /* dragenter/dragleave fire per ELEMENT boundary (entering a child
   * fires leave on the parent); a depth counter keeps the affordance
   * stable while the pointer moves inside the region. */
  const depth = useRef(0);

  const onDragEnter = useCallback((e: ReactDragEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (!e.dataTransfer?.types?.includes('Files')) return;
    e.preventDefault();
    depth.current += 1;
    setOver(true);
  }, [disabled]);

  const onDragOver = useCallback((e: ReactDragEvent<HTMLDivElement>) => {
    if (disabled) return;
    // The drop target contract: dragover must preventDefault for the
    // browser to allow the subsequent drop.
    e.preventDefault();
  }, [disabled]);

  const onDragLeave = useCallback((e: ReactDragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setOver(false);
  }, [disabled]);

  const onDrop = useCallback((e: ReactDragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    depth.current = 0;
    setOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) onFile(file);
  }, [disabled, onFile]);

  return (
    <div
      className="upload-drop"
      data-over={over || undefined}
      data-disabled={disabled || undefined}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {children}
      <p className="upload-drop-hint" aria-hidden="true">
        <Icon icon={FileUp} size={13} />
        {hint}
      </p>
    </div>
  );
}
