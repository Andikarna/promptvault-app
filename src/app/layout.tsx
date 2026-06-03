import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import Providers from '@/components/Providers';
import CommandPalette from '@/components/CommandPalette';
import ToastContainer from '@/components/ToastContainer';
import HeaderActions from '@/components/HeaderActions'; // Client component for theme toggle and status
import Sidebar from '@/components/Sidebar';
import { isSheetsMode } from '@/lib/db/db';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
});

export const metadata: Metadata = {
  title: 'PromptVault AI - Premium Prompt Management',
  description: 'Organize, search, version, and enhance your AI prompts with Google Sheets synchronization.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const dbMode = isSheetsMode ? 'Sheets' : 'Local';

  return (
    <html lang="en" className="dark">
      <body
        className={`${plusJakartaSans.variable} ${inter.variable} antialiased bg-background text-foreground bg-grid-pattern min-h-screen`}
      >
        <Providers>
          <div className="flex flex-col md:flex-row min-h-screen">
            <Sidebar dbMode={dbMode} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Header actions (Theme toggle, status alerts) */}
              <HeaderActions dbMode={dbMode} />
              
              {/* Page content */}
              <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto animate-fade-in">
                {children}
              </main>
            </div>
          </div>
          
          {/* Overlays */}
          <CommandPalette />
          <ToastContainer />
        </Providers>
      </body>
    </html>
  );
}
