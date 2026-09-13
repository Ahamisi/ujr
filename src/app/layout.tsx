import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/ui/toast'
import { TooltipProvider } from '@/components/ui/tooltip'

export const metadata: Metadata = {
  title: {
    default: 'UNILAG Journal of Engineering Research',
    template: '%s · UJER',
  },
  description:
    'Submission, peer review and publication for the UNILAG Journal of Engineering Research.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/*
          Light is the default. Dark is opt-in only — an OS preference does not
          flip a journal's editorial interface without being asked. Applied before
          first paint so a dark-mode user never sees a white flash. Wrapped
          because storage throws in private windows.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('ujer-theme');if(s==='dark')document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <ToastProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
