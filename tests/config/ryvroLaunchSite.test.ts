import fs from 'fs';
import path from 'path';

const root = process.cwd();

const read = (relativePath: string): string =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Ryvro launch site', () => {
  const launchReadme = read('web/launch/README.md');
  const actionPage = read('web/launch/auth/action/index.html');
  const actionHandler = read('web/launch/auth/action/handler.js');
  const deleteAccountPage = read('web/launch/delete-account/index.html');
  const firebaseLaunchConfig = read('firebase.launch.json');

  it('publishes the Firebase Auth action handler under the launch site', () => {
    expect(launchReadme).toContain('https://getryvro.com/auth/action');
    expect(firebaseLaunchConfig).toContain('"public": "web/launch"');
    expect(firebaseLaunchConfig).toContain('script-src');
    expect(firebaseLaunchConfig).toContain('https://identitytoolkit.googleapis.com');
    expect(firebaseLaunchConfig).toContain('https://securetoken.googleapis.com');
    expect(actionPage).toContain('Ryvro Account Action');
    expect(actionPage).toContain('/__/firebase/8.10.1/firebase-app.js');
    expect(actionPage).toContain('/__/firebase/8.10.1/firebase-auth.js');
    expect(actionPage).toContain('/__/firebase/init.js');
    expect(actionPage).toContain('/auth/action/handler.js?v=20260606');
    expect(firebaseLaunchConfig).toContain('"source": "/auth/action/**"');
    expect(firebaseLaunchConfig).toContain('"value": "no-store"');
  });

  it('handles Firebase email verification, password reset, and email recovery actions', () => {
    expect(actionHandler).toContain('new URLSearchParams(window.location.search)');
    expect(actionHandler).toContain("mode === 'resetPassword'");
    expect(actionHandler).toContain("mode === 'verifyEmail'");
    expect(actionHandler).toContain("mode === 'recoverEmail'");
    expect(actionHandler).toContain('verifyPasswordResetCode');
    expect(actionHandler).toContain('confirmPasswordReset');
    expect(actionHandler).toContain('applyActionCode');
    expect(actionHandler).toContain('checkActionCode');
    expect(actionHandler).toContain('continueUrl');
    expect(actionHandler).toContain('resolveSafeContinueUrl');
    expect(actionHandler).toContain('url.origin === window.location.origin');
  });

  it('keeps the action handler free of committed Firebase API keys', () => {
    expect(actionPage).not.toMatch(/AIza[0-9A-Za-z_-]+/);
    expect(actionHandler).not.toMatch(/AIza[0-9A-Za-z_-]+/);
    expect(actionPage).toContain('/__/firebase/init.js');
  });

  it('keeps the account deletion request flow ready for app review', () => {
    expect(deleteAccountPage).toContain('Delete Your Ryvro Account');
    expect(deleteAccountPage).toContain('support@getryvro.com');
    expect(deleteAccountPage).toContain('subject=Ryvro%20account%20deletion%20request');
    expect(deleteAccountPage).toContain(
      'Please%20delete%20my%20Ryvro%20account%20and%20associated%20app%20data'
    );
    expect(deleteAccountPage).toContain('Account%20email%3A%0ACountry%3A%0AOptional%20notes');
    expect(deleteAccountPage).toContain('Start deletion request');
    expect(deleteAccountPage).toContain('/support/');
  });
});
