import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import {
  LandingPage,
  RegisterPage,
  FaceRegisterPage,
  LoginPage,
  FaceVerifyPage,
  ProfilePage,
  UpdateFacePage,
  NotFoundPage,
} from '@/pages'

const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/register/face', element: <FaceRegisterPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/verify', element: <FaceVerifyPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/profile', element: <ProfilePage /> },
      { path: '/profile/update-face', element: <UpdateFacePage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
