(function () {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  const actionCode = params.get('oobCode');
  const continueUrl = params.get('continueUrl');
  const lang = params.get('lang') || 'en';
  const title = document.getElementById('action-title');
  const message = document.getElementById('action-message');
  const links = document.getElementById('action-links');
  const resetPanel = document.getElementById('reset-password-panel');
  const resetForm = document.getElementById('reset-password-form');
  const passwordInput = document.getElementById('new-password');

  function showState(nextTitle, nextMessage, showLinks) {
    title.textContent = nextTitle;
    message.textContent = nextMessage;
    links.hidden = !showLinks;
  }

  function finish(nextTitle, nextMessage) {
    resetPanel.hidden = true;
    showState(nextTitle, nextMessage, true);
  }

  function fail(nextMessage) {
    resetPanel.hidden = true;
    showState('This Ryvro link could not be used', nextMessage, true);
  }

  function getAuth() {
    if (!window.firebase || !window.firebase.apps || window.firebase.apps.length === 0) {
      throw new Error('Firebase is not ready on this hosting site.');
    }

    const auth = window.firebase.auth();
    auth.languageCode = lang;
    return auth;
  }

  function resolveSafeContinueUrl(rawUrl) {
    if (!rawUrl) {
      return null;
    }

    try {
      const url = new URL(rawUrl, window.location.origin);
      return url.origin === window.location.origin ? url.href : null;
    } catch (error) {
      return null;
    }
  }

  function handleResetPassword(auth) {
    auth
      .verifyPasswordResetCode(actionCode)
      .then(() => {
        showState(
          'Reset your Ryvro password',
          'Enter a new password for your Ryvro account.',
          false
        );
        resetPanel.hidden = false;
        passwordInput.focus();
      })
      .catch(() => {
        fail(
          'The password reset link is invalid or has expired. Request a new reset link in Ryvro.'
        );
      });

    resetForm.addEventListener('submit', (event) => {
      event.preventDefault();
      auth
        .confirmPasswordReset(actionCode, passwordInput.value)
        .then(() => {
          finish('Your password was updated', 'You can now return to Ryvro and sign in.');
        })
        .catch((error) => {
          fail(error && error.message ? error.message : 'Ryvro could not save the new password.');
        });
    });
  }

  function handleVerifyEmail(auth) {
    auth
      .applyActionCode(actionCode)
      .then(() => {
        finish('Your email is verified', 'Your Ryvro account email has been verified.');
      })
      .catch(() => {
        fail(
          'The email verification link is invalid or has expired. Request a new verification link in Ryvro.'
        );
      });
  }

  function handleRecoverEmail(auth) {
    auth
      .checkActionCode(actionCode)
      .then(() => {
        return auth.applyActionCode(actionCode);
      })
      .then(() => {
        finish('Your email change was undone', 'Your Ryvro account email has been restored.');
      })
      .catch(() => {
        fail(
          'The email recovery link is invalid or has expired. Contact Ryvro support if you need help.'
        );
      });
  }

  window.addEventListener('load', () => {
    if (!mode || !actionCode) {
      fail('This page needs a valid Ryvro email action link.');
      return;
    }

    try {
      const auth = getAuth();

      const safeContinueUrl = resolveSafeContinueUrl(continueUrl);

      if (safeContinueUrl) {
        const backLink = links.querySelector('.button');
        backLink.setAttribute('href', safeContinueUrl);
        backLink.textContent = 'Return to Ryvro';
      }

      if (mode === 'resetPassword') {
        handleResetPassword(auth);
      } else if (mode === 'verifyEmail') {
        handleVerifyEmail(auth);
      } else if (mode === 'recoverEmail') {
        handleRecoverEmail(auth);
      } else {
        fail('This Ryvro email action is not supported.');
      }
    } catch (error) {
      fail(
        error && error.message ? error.message : 'Ryvro could not load the account action page.'
      );
    }
  });
})();
