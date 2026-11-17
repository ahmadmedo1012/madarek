/**
 * R362 (Agent 5, §G upload experience) — the UploadDropZone pin.
 *
 * components/pdf/UploadDropZone.tsx wraps the two upload modals' file
 * fields (ResearchPage's UploadModal + TeacherPages' MaterialFormModal
 * file mode): a dropped file routes through the caller's pickFile —
 * the SAME validation pipeline and error seat as a picked file. This
 * suite pins the contract:
 *
 *   · a drop calls onFile with the first dragged file;
 *   · the affordance (data-over) paints on dragenter and clears on
 *     dragleave/drop (the depth counter keeps child-crossings stable);
 *   · a disabled zone ignores drops (an in-flight upload is not
 *     replaceable);
 *   · a drag without Files (text/link selections) never arms the zone;
 *   · the standing hint line is aria-hidden (the FormField label and
 *     the native input carry the semantics — the hint is chrome).
 *
 * jsdom note: DataTransfer is partial in jsdom; testing-library's
 * fireEvent.drop accepts a dataTransfer stub ({ files }) which is all
 * the handler reads.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { UploadDropZone } from '../../src/components/pdf/UploadDropZone';

afterEach(() => {
  cleanup();
});

function makeFile(name = 'paper.pdf') {
  return new File(['%PDF-1.7 stub'], name, { type: 'application/pdf' });
}

function renderZone(props: Partial<Parameters<typeof UploadDropZone>[0]> = {}) {
  const onFile = vi.fn();
  const utils = render(
    <UploadDropZone onFile={onFile} {...props}>
      <label htmlFor="f">ملف البحث</label>
      <input id="f" type="file" accept="application/pdf,.pdf" />
    </UploadDropZone>,
  );
  return { onFile, zone: utils.container.querySelector('.upload-drop') as HTMLElement };
}

const FILES = { dataTransfer: { types: ['Files'], files: [] } };

describe('UploadDropZone (r362 §G)', () => {
  it('a drop routes the first file into the caller pick path', () => {
    const { onFile, zone } = renderZone();
    const file = makeFile();
    fireEvent.drop(zone, { dataTransfer: { types: ['Files'], files: [file] } });
    expect(onFile).toHaveBeenCalledTimes(1);
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it('the affordance paints on dragenter and clears on drop', () => {
    const { zone } = renderZone();
    fireEvent.dragEnter(zone, FILES);
    expect(zone.getAttribute('data-over')).toBe('true');
    fireEvent.drop(zone, { dataTransfer: { types: ['Files'], files: [makeFile()] } });
    expect(zone.getAttribute('data-over')).toBe(null);
  });

  it('dragleave clears the affordance (depth counter)', () => {
    const { zone } = renderZone();
    fireEvent.dragEnter(zone, FILES);
    fireEvent.dragEnter(zone, FILES); // depth 2 (entering a child)
    fireEvent.dragLeave(zone, FILES); // depth 1 — still over
    expect(zone.getAttribute('data-over')).toBe('true');
    fireEvent.dragLeave(zone, FILES); // depth 0 — left
    expect(zone.getAttribute('data-over')).toBe(null);
  });

  it('a disabled zone ignores drops (in-flight uploads are not replaceable)', () => {
    const { onFile, zone } = renderZone({ disabled: true });
    expect(zone.getAttribute('data-disabled')).toBe('true');
    fireEvent.dragEnter(zone, FILES);
    expect(zone.getAttribute('data-over')).toBe(null);
    fireEvent.drop(zone, { dataTransfer: { types: ['Files'], files: [makeFile()] } });
    expect(onFile).not.toHaveBeenCalled();
  });

  it('a text/link drag (no Files) never arms the zone', () => {
    const { zone } = renderZone();
    fireEvent.dragEnter(zone, { dataTransfer: { types: ['text/plain'], files: [] } });
    expect(zone.getAttribute('data-over')).toBe(null);
  });

  it('the standing hint is aria-hidden chrome (the input carries semantics)', () => {
    renderZone();
    const hint = screen.getByText('أو أفلِت ملف الـ PDF هنا.');
    expect(hint.getAttribute('aria-hidden')).toBe('true');
  });
});
