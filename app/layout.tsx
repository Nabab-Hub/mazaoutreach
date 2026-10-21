import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/firebase/auth-context';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Agentic Client Outreach Platform | Freelance AI Outreach',
  description:
    'Autonomous AI platform that converts CSV leads into personalized emails, handles replies, and alerts the owner on interested hot leads.',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/logo.png', type: 'image/png' },
    ],
    apple: [
      { url: '/logo.png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="bg-[#090d16] text-slate-100 h-screen overflow-hidden flex antialiased">
        <AuthProvider>
          <div className="flex w-full h-full overflow-hidden">
            {/* Left Persistent Navigation (Fixed, Non-scrolling with page) */}
            <Sidebar />

            {/* Main Content Area (Independent scroll) */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#090d16]">
              <Navbar />
              <main className="flex-1 overflow-y-auto">{children}</main>
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
