/**
 * كلمات المرور الشائعة — مرآة الواجهة لقائمة الخلفية الحرفية.
 *
 * FE mirror of `backend/src/modules/auth/password-policy.ts`
 * (COMMON_PASSWORDS + isCommonPassword), the same way
 * `lib/search.ts` mirrors the backend search normalizer: same
 * entries, same case-insensitive exact-match predicate, so a
 * password the client accepts is a password the server accepts.
 *
 * ملاحظة صيانة (AGENTS.md §6 — نمط «يُطبَّق على الجهتين معًا»):
 * أي تعديل على القائمة أو على دلالة المطابقة يجب أن يطبَّق على
 * `password-policy.ts` في الخلفية وفي هذا الملف في الوقت نفسه —
 * انزياح بين النسختين يعيد عيب r165f (الفحص الوهمي عند العميل ثم
 * رفضٌ عام بلا حقل عند الخادم).
 */

/**
 * Compact top-of-the-breach-charts list (lowercase). Not exhaustive —
 * it exists to kill the zero-entropy passwords an attacker tries first.
 * (نسخة حرفية من قائمة الخلفية — لا تُحرَّر هنا منفردة.)
 */
const COMMON_PASSWORDS: ReadonlySet<string> = new Set([
  // Credential-shaped
  'password', 'password1', 'password12', 'password123', 'password1234',
  'passw0rd', 'p@ssword', 'p@ssw0rd', 'passwort', 'passwd', 'passcode',
  'secret', 'secrets', 'letmein', 'letmein123', 'trustno1', 'welcome',
  'welcome1', 'welcome123', 'admin', 'admin1', 'admin123', 'administrator',
  'root', 'superuser', 'superman', 'master', 'login', 'logon', 'qwerty',
  'qwerty123', 'qwertyuiop', 'qwertz', 'qazwsx', 'zaq12wsx', '1q2w3e4r',
  '1q2w3e4r5t', '1qaz2wsx', '1234qwer', 'qwe123', 'asdfgh', 'zxcvbnm',
  'abc123', 'abcd1234', 'iloveyou', 'sunshine', 'princess', 'dragon',
  'monkey', 'shadow', 'football', 'baseball', 'basketball', 'soccer',
  'tennis', 'hockey', 'jordan23', 'michael', 'jennifer', 'jessica',
  'ashley', 'bailey', 'hunter', 'ranger', 'buster', 'tigger',
  'charlie', 'flower', 'lovely', 'computer', 'internet', 'matrix',
  'pokemon', 'starwars', 'whatever', 'samsung', 'google', 'facebook',
  'linkedin', 'github', 'minecraft', 'aaaaaaab', 'aaaaaaaa',
  // Digit runs (min length 8 already kills the shorter ones)
  '12345678', '123456789', '1234567890', '12345678910', '87654321',
  '11111111', '22222222', '33333333', '44444444', '55555555',
  '66666666', '77777777', '88888888', '99999999', '00000000',
  '12121212', '123123123', '11223344', '10203040', '15975385',
  '14725836', '987654321',
]);

/** مطابقة تامة غير حسّاسة لحالة الأحرف ('Password123' === 'password123'). */
export const isCommonPassword = (password: string): boolean =>
  COMMON_PASSWORDS.has(password.toLowerCase());
