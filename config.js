// Project October config.
// Leave `firebase` as null to run on this phone only (no sync).
// To sync two phones: paste the Firebase web config, and SHA-256 hashes of the two Google emails
// (lowercase email → sha256 hex). Hashes, not emails, because this file is public on GitHub Pages.
window.OCTOBER_CONFIG = {
  firebase: null,
  // firebase: {
  //   apiKey: '...',
  //   authDomain: '...firebaseapp.com',
  //   projectId: '...',
  //   appId: '...'
  // },
  people: {
    a: '', // "him": coral by default
    b: ''  // "her": teal by default
  },
  coupleId: 'october-2026'
};
