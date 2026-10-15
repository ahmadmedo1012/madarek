// MessageComposeModal — r171a extraction of the r170a compose/reply
// modal. The send lifecycle (useSendMessage, client-side
// validateMessageDraft, trim, toast success, inline server-error
// mapping via sendErrorMessage) is role-agnostic and lives HERE; what
// varies per role is recipient DISCOVERY, injected from the role page:
//  - recipientGroups: the role's real optgroups (the teacher's roster,
//    the student's enrolled teachers) rendered after the shared
//    «مراسلون سابقون» correspondents optgroup;
//  - statusOptions: the role pool's loading/error rows;
//  - noRecipientsHint: the honest empty-pool line on the recipient field;
//  - extraFields: the role's discovery selector above the recipient
//    field (the teacher's offering picker).
// The modal markup is byte-identical to the r170a teacher modal (same
// modal-header/modal-body/modal-footer, same FormField ARIA contract).
import { useState } from 'react';
import type { ReactNode } from 'react';
import { X, Send } from 'lucide-react';
import { FormField } from '../primitives';
import { Icon } from '../Icon';
import { Modal } from '../overlays/Modal';
import { useDiscardGuard } from '../curriculum/AuthoringModal';
import { useSendMessage } from '../../hooks/useResources';
import { toast } from '../../lib/toast';
import { validateMessageDraft, MESSAGE_MAX_CHARS, sendErrorMessage } from './MessagesInbox';

/** One pickable recipient inside a discovery group. `detail` rides the
 * option text after the name («الاسم · التفصيل») — the teacher passes
 * the roster's universityId, the student the first shared course. */
export interface RecipientOption {
  id: string;
  name: string;
  detail?: string;
}

/** A role-specific discovery optgroup (the teacher's «طلاب المقرّر»,
 * the student's «أساتذة مقرّراتي»). */
export interface RecipientGroup {
  label: string;
  options: Array<RecipientOption>;
}

export interface MessageComposeModalProps {
  /** The reply target; the parent derives it from the clicked row so
   * the option is guaranteed present in the correspondents optgroup. */
  presetRecipient: { id: string; name: string } | null;
  /** The inbox-side pool («مراسلون سابقون» optgroup). */
  correspondents: Array<{ id: string; name: string }>;
  /** Role discovery groups, rendered after the correspondents group. */
  recipientGroups?: Array<RecipientGroup>;
  /** Disabled status rows inside the recipient select (loading/error
   * lines for the role pool — the teacher's roster states). */
  statusOptions?: Array<string>;
  /** The honest empty-pool hint on the recipient field, shown when both
   * the correspondents AND every discovery group are empty. */
  noRecipientsHint?: string;
  /** Caller-owned draft state (the teacher's offering pick) that counts
   * toward the discard guard's dirty check. */
  extraDirty?: boolean;
  /** Role-specific discovery fields rendered ABOVE the recipient field.
   * A plain node renders as-is; a function receives { sendPending } so
   * its controls can disable during the send exactly like the modal's
   * own fields (the teacher's offering selector does). */
  extraFields?: ReactNode | ((state: { sendPending: boolean }) => ReactNode);
  onClose: () => void;
}

/** Compose/reply modal — the existing Modal + FormField grammar (same
 * shape as the grade/material modals). Role pages wrap it with their
 * recipient discovery; the send logic stays here. */
export function MessageComposeModal({
  presetRecipient,
  correspondents,
  recipientGroups = [],
  statusOptions = [],
  noRecipientsHint,
  extraDirty = false,
  extraFields,
  onClose,
}: MessageComposeModalProps) {
  const send = useSendMessage();
  const [recipientId, setRecipientId] = useState(presetRecipient?.id ?? '');
  const [body, setBody] = useState('');
  const [clientErrors, setClientErrors] = useState<{ recipient?: string; body?: string }>({});

  const dirty =
    body.trim().length > 0 ||
    (presetRecipient ? recipientId !== presetRecipient.id : Boolean(recipientId) || extraDirty);
  const { requestClose, escapeLocked, guard } = useDiscardGuard({
    dirty,
    pending: send.isPending,
    onClose,
  });

  const onSubmit = async () => {
    const errs = validateMessageDraft(recipientId, body);
    setClientErrors(errs);
    if (errs.recipient || errs.body) return;
    try {
      await send.mutateAsync({ toUserId: recipientId, body: body.trim() });
      toast.success('أُرسلت الرسالة وستظهر في سجلّ الرسائل أدناه.', { title: 'تمّ الإرسال' });
      onClose();
    } catch {
      // surfaced inline from send.isError below
    }
  };

  const noRecipients =
    correspondents.length === 0 && recipientGroups.every((g) => g.options.length === 0);

  const extra =
    typeof extraFields === 'function' ? extraFields({ sendPending: send.isPending }) : extraFields;

  return (
    <Modal
      open
      onClose={requestClose}
      ariaLabel={presetRecipient ? 'ردّ على رسالة' : 'رسالة جديدة'}
      closeOnOverlayClick={!send.isPending}
      closeOnEscape={!escapeLocked}
    >
      <div className="modal-header">
        <div className="modal-title">{presetRecipient ? 'ردّ على رسالة' : 'رسالة جديدة'}</div>
        <button type="button" className="icon-btn" onClick={requestClose} aria-label="إغلاق" disabled={send.isPending}>
          <Icon icon={X} size={16} />
        </button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void onSubmit(); }} noValidate>
        <div className="modal-body">
          {/* The role's discovery selector — one real endpoint behind it
              (see the scope note in MessagesInbox). Hidden entirely for
              a plain reply preset (nothing to discover) — the teacher
              wrapper already skips it there. */}
          {extra}
          <FormField
            label="المستلِم"
            error={clientErrors.recipient}
            hint={noRecipients ? noRecipientsHint : undefined}
          >
            <select
              className="input"
              value={recipientId}
              onChange={(e) => {
                setRecipientId(e.target.value);
                setClientErrors((ce) => ({ ...ce, recipient: undefined }));
              }}
              disabled={send.isPending}
            >
              <option value="">— اختر مستلِماً —</option>
              {correspondents.length > 0 && (
                <optgroup label="مراسلون سابقون">
                  {correspondents.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              )}
              {recipientGroups.map((group) => (
                group.options.length > 0 && (
                  <optgroup key={group.label} label={group.label}>
                    {group.options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}{o.detail ? ` · ${o.detail}` : ''}
                      </option>
                    ))}
                  </optgroup>
                )
              ))}
              {statusOptions.map((text) => (
                <option key={text} disabled>{text}</option>
              ))}
            </select>
          </FormField>

          <FormField
            label="نص الرسالة"
            error={clientErrors.body}
            hint={<span><bdi>{body.length}</bdi> / <bdi>{MESSAGE_MAX_CHARS}</bdi> حرف</span>}
          >
            <textarea
              className="input"
              rows={5}
              placeholder="اكتب رسالتك…"
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setClientErrors((ce) => ({ ...ce, body: undefined }));
              }}
              /* Mirror the backend cap (same pattern as the review
               * feedback textarea): the zod max is 4000 — an uncapped
               * textarea would let a paste POST past the client and
               * surface as a connectivity error. */
              maxLength={MESSAGE_MAX_CHARS}
              disabled={send.isPending}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </FormField>

          {send.isError && (
            <div className="form-feedback fail" role="alert">
              <Icon icon={X} size={14} />
              <span className="flex-1">{sendErrorMessage(send.error)}</span>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn ghost" onClick={requestClose} disabled={send.isPending}>
            إلغاء
          </button>
          <button type="submit" className="btn primary" disabled={send.isPending}>
            {send.isPending ? 'جارٍ الإرسال…' : <><Icon icon={Send} size={13} /> إرسال الرسالة</>}
          </button>
        </div>
      </form>
      {guard}
    </Modal>
  );
}
