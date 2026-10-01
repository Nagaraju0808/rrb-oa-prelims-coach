export function getTheme() {
  try { return localStorage.getItem('rrb_theme') || 'system' } catch { return 'system' }
}

export function applyTheme(t) {
  try { if (t === 'system') localStorage.removeItem('rrb_theme'); else localStorage.setItem('rrb_theme', t) } catch { /* ignore */ }
  const dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}
