/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppRouter } from './routes/AppRouter';
import { Toaster } from 'sonner';
import { useSettingsStore } from './store/useSettingsStore';
import { useEffect } from 'react';

export default function App() {
  const { theme } = useSettingsStore();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <>
      <AppRouter />
      <Toaster position="top-right" richColors />
    </>
  );
}
