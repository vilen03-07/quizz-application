// High-Security Email Normalization, Anti-Alias & Disposable Domain Filter

// Comprehensive list of burner / temporary / disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  '10minutemail.com',
  '10minutemail.net',
  'tempmail.com',
  'temp-mail.org',
  'tempmail.net',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamailblock.com',
  'sharklasers.com',
  'grr.la',
  'yopmail.com',
  'yopmail.net',
  'cool.fr.nf',
  'jetable.fr.nf',
  'nospam.ze.tc',
  'nomail.xl.cx',
  'mega.zik.dj',
  'speed.1s.fr',
  'courriel.fr.nf',
  'moncourrier.fr.nf',
  'monemail.fr.nf',
  'monmail.fr.nf',
  'trashmail.com',
  'trashmail.net',
  'trashmail.org',
  'dispostable.com',
  'getairmail.com',
  'fakeinbox.com',
  'maildrop.cc',
  'inboxkitten.com',
  'throwawaymail.com',
  'burnermail.io',
  'crazymailing.com',
  'mytemp.email',
  'mohmal.com',
  'emailondeck.com',
  'fakemailgenerator.com',
  'generator.email',
  'tempail.com',
  'getnada.com',
  'nada.ltd',
  'inboxbear.com',
  'dropmail.me',
  'zoho.eu', // sometimes used for burner routing if disposable
  'mintemail.com',
  'harakirimail.com',
  'armyspy.com',
  'cuvox.de',
  'dayrep.com',
  'fleckens.hu',
  'gustr.com',
  'jourrapide.com',
  'rhyta.com',
  'superrito.com',
  'teleworm.us',
  'einrot.com',
]);

// Strict RFC 5322 Email Regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Normalizes an email address to its true canonical form:
 * 1. For Gmail/Googlemail: strips all dots (.) and strips anything after (+) tag
 * 2. Normalizes googlemail.com -> gmail.com
 * 3. For other providers: strips (+) tag
 * 4. Checks for invalid syntax, illegal characters, and disposable/temporary domains
 */
export function validateAndNormalizeEmail(rawEmail) {
  if (!rawEmail || typeof rawEmail !== 'string') {
    return {
      isValid: false,
      error: 'Email address is required.',
    };
  }

  const trimmed = rawEmail.trim().toLowerCase();

  // Basic regex check
  if (!EMAIL_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: 'Please enter a valid, well-formed email address (e.g. name@gmail.com).',
    };
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return {
      isValid: false,
      error: 'Invalid email address format.',
    };
  }

  let [localPart, domainPart] = parts;

  // Check disposable domain blacklist
  if (DISPOSABLE_DOMAINS.has(domainPart)) {
    return {
      isValid: false,
      isDisposable: true,
      error: 'Disposable / temporary email addresses are strictly prohibited for quiz integrity.',
    };
  }

  // Canonical Google/Gmail normalization
  if (domainPart === 'gmail.com' || domainPart === 'googlemail.com') {
    domainPart = 'gmail.com';
    // Remove everything after '+' tag
    localPart = localPart.split('+')[0];
    // Remove all dots '.' from Gmail username
    localPart = localPart.replace(/\./g, '');
  } else {
    // For other domains (Outlook, Yahoo, iCloud, custom domain), strip '+' tag
    localPart = localPart.split('+')[0];
  }

  if (!localPart || localPart.length < 2) {
    return {
      isValid: false,
      error: 'Invalid email username portion.',
    };
  }

  const normalizedEmail = `${localPart}@${domainPart}`;

  return {
    isValid: true,
    originalEmail: trimmed,
    normalizedEmail,
    domain: domainPart,
    isGmail: domainPart === 'gmail.com',
  };
}
