// Optional "Continue with Google" sign-in through Supabase Auth.
// The app works the same without signing in; when signed in, the header
// shows the person's name and profile picture from user_metadata.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tufyhrugtpfhaxvgpliw.supabase.co';
// Publishable keys are meant to be shipped in browser code.
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_KyT4XyF2ku3cjdRl73xVPw_bkBn3hlE';

const GOOGLE_LOGO = `
<svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true" focusable="false">
  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
</svg>`;

function profileFrom(user) {
  const meta = user.user_metadata ?? {};
  return {
    name: meta.full_name || meta.name || user.email || 'Signed in',
    picture: meta.avatar_url || meta.picture || '',
  };
}

export function initAuth() {
  const root = document.getElementById('account');
  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true },
  });

  function showError(message) {
    const error = document.createElement('p');
    error.className = 'account-error';
    error.setAttribute('role', 'alert');
    error.textContent = message;
    root.append(error);
  }

  function renderSignedOut() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn google-btn';
    button.innerHTML = `${GOOGLE_LOGO}<span>Continue with Google</span>`;
    button.addEventListener('click', async () => {
      button.disabled = true;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        // Come back to this same page after Google sign-in.
        options: { redirectTo: window.location.origin + window.location.pathname },
      });
      if (error) {
        button.disabled = false;
        showError(`Couldn't start Google sign-in: ${error.message}`);
      }
    });
    root.replaceChildren(button);
  }

  function renderSignedIn(user) {
    const { name, picture } = profileFrom(user);
    const profile = document.createElement('div');
    profile.className = 'account-profile';

    const initial = document.createElement('span');
    initial.className = 'account-avatar account-initial';
    initial.setAttribute('aria-hidden', 'true');
    initial.textContent = name.trim().charAt(0).toUpperCase();

    if (picture) {
      const img = document.createElement('img');
      img.className = 'account-avatar';
      img.src = picture;
      img.alt = '';
      img.width = 32;
      img.height = 32;
      // Google profile photos can refuse requests that send a referrer.
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => img.replaceWith(initial));
      profile.append(img);
    } else {
      profile.append(initial);
    }

    const label = document.createElement('span');
    label.className = 'account-name';
    label.textContent = name;
    label.title = name;

    const signOut = document.createElement('button');
    signOut.type = 'button';
    signOut.className = 'btn btn-small';
    signOut.textContent = 'Sign out';
    signOut.setAttribute('aria-label', `Sign out ${name}`);
    signOut.addEventListener('click', async () => {
      signOut.disabled = true;
      await supabase.auth.signOut();
    });

    profile.append(label, signOut);
    root.replaceChildren(profile);
  }

  function render(session) {
    if (session?.user) renderSignedIn(session.user);
    else renderSignedOut();
  }

  supabase.auth.onAuthStateChange((_event, session) => render(session));

  // Show a readable message if Google or Supabase sent back an error.
  const params = new URLSearchParams(window.location.search + window.location.hash.replace('#', '&'));
  const urlError = params.get('error_description');

  supabase.auth.getSession().then(({ data, error }) => {
    render(data.session);
    if (urlError || error) showError(`Sign-in failed: ${urlError || error.message}`);
    if (urlError) window.history.replaceState(null, '', window.location.pathname);
  });
}
