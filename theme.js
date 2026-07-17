// GuestGuard Inspector Training — shared theme toggle (all pages)
// Requires #themeToggle and #logoImg in the DOM. Persists choice in localStorage('guestguard-theme').
(function initTheme() {
  const themeToggle = document.getElementById('themeToggle');
  const logoImg = document.getElementById('logoImg');
  const body = document.body;
  
  // Logo URLs
  const logos = {
    dark: 'https://guestguard-platform.vercel.app/_next/image?url=%2Fgg_logo_small.png&w=640&q=75&dpl=dpl_DveWjYKd9Bi3M3CYp1G8uPrAWQZY',
    light: 'https://pub-2e903fa5ea964ab3b77967e7159432bc.r2.dev/inspector-training/gg_logo_lightmode.webp'
  };
  
  // Load saved theme preference (default to dark)
  const savedTheme = localStorage.getItem('guestguard-theme') || 'dark';
  
  function setTheme(theme) {
    if (theme === 'light') {
      body.classList.add('light-mode');
      if (logoImg) logoImg.src = logos.light;
    } else {
      body.classList.remove('light-mode');
      if (logoImg) logoImg.src = logos.dark;
    }
    localStorage.setItem('guestguard-theme', theme);
  }
  
  // Apply saved theme immediately (before page renders)
  setTheme(savedTheme);
  
  // Toggle theme on click
  if (themeToggle) themeToggle.addEventListener('click', () => {
    const currentTheme = body.classList.contains('light-mode') ? 'light' : 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  });
})();
