/**
 * Calm, actionable copy for Firebase Auth failures (no raw error dumps in UI).
 */
export function friendlyAuthMessage(err) {
  const code = err?.code || '';
  const fallback = typeof err?.message === 'string' ? err.message : 'Something went wrong. Please try again.';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/invalid-login-credentials':
      return "That email or password doesn't match our records. Double-check and try again.";
    case 'auth/user-not-found':
      return 'No account exists with this email. Create one or check the address.';
    case 'auth/email-already-in-use':
      return 'This email is already registered. Sign in or use a different email.';
    case 'auth/weak-password':
      return 'Choose a stronger password (at least six characters).';
    case 'auth/invalid-email':
      return 'That email doesn\'t look valid. Check for typos.';
    case 'auth/network-request-failed':
      return 'Connection problem. Check your network and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts for now. Wait a minute, then try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in closed before it finished. Try again when you\'re ready.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method isn\'t enabled. Contact support if this keeps happening.';
    default:
      return fallback;
  }
}
