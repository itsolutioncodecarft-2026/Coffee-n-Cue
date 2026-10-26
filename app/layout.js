import './globals.css'
import { ToastProvider } from '@/components/ui/Toast'

export const metadata = {
  title: 'Coffee N Cue — Admin',
  description: 'Cafe billing and management system',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-gray-50 antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
