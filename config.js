// Project October config.
// Leave `firebase` as null to run on this phone only (no sync).
// To sync two phones: paste the Firebase web config, and SHA-256 hashes of the two Google emails
// (lowercase email → sha256 hex). Hashes, not emails, because this file is public on GitHub Pages.
window.OCTOBER_CONFIG = {
  firebase: {
    apiKey: 'AIzaSyD-bZKAtSPPTTybgWfbGc_ZzTWUriEkeYU',
    authDomain: 'october-cc739.firebaseapp.com',
    projectId: 'october-cc739',
    storageBucket: 'october-cc739.firebasestorage.app',
    messagingSenderId: '795542222825',
    appId: '1:795542222825:web:2579cc4b88922168687d78'
  },
  people: {
    a: '5dbc1194c40720921a947902ee744e925b85f31e4226588b9b45654473d5bb10', // "him": coral by default
    b: '84338b649bf35587b2c948d363485928890285a364e5a7b04d0aab517d599cd3'  // "her": teal by default
  },
  coupleId: 'october-2026'
};
