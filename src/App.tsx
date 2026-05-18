/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppRouter } from './routes/AppRouter';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <>
      <AppRouter />
      <Toaster position="top-right" richColors />
    </>
  );
}
