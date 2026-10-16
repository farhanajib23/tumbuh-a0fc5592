import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const THEME_KEY = 'tumbuh-theme';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.classList.contains('dark')); }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem(THEME_KEY, next ? 'dark' : 'light'); } catch { /* storage unavailable */ }
  }
  return <Button variant="ghost" size="icon" onClick={toggle} aria-label={dark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'} title={dark ? 'Mode terang' : 'Mode gelap'}>{dark ? <Sun /> : <Moon />}</Button>;
}
