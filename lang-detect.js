if (!localStorage.getItem('lang-pref')) {
  const lang = (navigator.language ?? 'en').toLowerCase();

  const routes = { fr: '/', ja: '/ja/', es: '/es/' };
  const prefix = Object.keys(routes).find(p => lang.startsWith(p));
  const target = prefix ? routes[prefix] : '/en/';

  localStorage.setItem('lang-pref', target);

  const here = target === '/'
    ? location.pathname === '/' || location.pathname === '/index.html'
    : location.pathname.startsWith(target);

  if (!here) {
    location.replace(target);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.lang-option').forEach(link => {
    link.addEventListener('click', () => localStorage.setItem('lang-pref', link.getAttribute('href')));
  });
});
