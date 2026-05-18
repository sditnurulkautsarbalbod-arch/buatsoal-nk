import { 
  createBrowserRouter, 
  RouterProvider, 
  Navigate 
} from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import LoginPage from '@/pages/auth/Login';
import Dashboard from '@/pages/dashboard';
import EditorPage from '@/pages/editor';
import BankSoalPage from '@/pages/bank-soal';
import SettingsPage from '@/pages/settings';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <DashboardLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'editor',
        element: <EditorPage />, 
      },
      {
        path: 'bank-soal',
        element: <BankSoalPage />,
      },
      {
        path: 'pengaturan',
        element: <SettingsPage />,
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}

