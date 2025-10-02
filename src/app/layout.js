import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Toaster } from 'sonner'
import AIChatWidget from '@/components/AIChatWidget'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Computer World - Professional Computer Repair Services in Surat',
  description: 'Doorstep computer repair services in Surat. Screen replacement, virus removal, data recovery, and more with 30-day warranty.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text transition-colors duration-300`}>
        <ThemeProvider>
          {children}
          <AIChatWidget />
          <Toaster 
            position="top-right"
            richColors
            closeButton
            expand={true}
            duration={4000}
            theme="system"
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
