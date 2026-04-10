/**
 * Client-side hint for showing admin UI only. Real authorization MUST be enforced
 * in Firestore Security Rules (and Cloud Functions / Admin SDK for privileged ops).
 *
 * Optional: set REACT_APP_ADMIN_UIDS to a comma-separated list of Firebase Auth UIDs.
 * When set, only those UIDs see the admin tools (preferred over name/email checks).
 * When unset, legacy checks apply for backward compatibility (still not server-side auth).
 */
export function isAdminUser(currentUser, userNickname) {
  if (!currentUser) return false;

  const raw = process.env.REACT_APP_ADMIN_UIDS;
  if (raw != null && String(raw).trim() !== '') {
    const allowed = String(raw)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return allowed.includes(currentUser.uid);
  }

  return (
    currentUser.displayName === 'Abrar Husain' ||
    userNickname === 'Abrar Husain' ||
    currentUser.email === 'abrarhusain@example.com'
  );
}
