import type { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs';
import { QueryProvider } from '@/components/providers/query-provider';
import { SchedulerProvider } from '@/components/providers/scheduler-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { PerformanceDashboard } from '@/components/performance/performance-dashboard';
import { SchedulerMonitor } from '@/components/scheduler/scheduler-monitor';
import "./globals.css";
import localFont from "next/font/local";
import { cn } from "@/lib/utils";

const lufga = localFont({
  src: [
    {
      path: './lufga/LufgaLight.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: './lufga/LufgaRegular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './lufga/LufgaMedium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: './lufga/LufgaBold.ttf',
      weight: '700',
      style: 'normal',
    }
  ],
  variable: "--font-lufga",
  display: 'swap',
  preload: true
});
export const metadata: Metadata = {
  title: "AutoYapp Pro",
  description: "AI-powered X (Twitter) engagement automation platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={cn(
            lufga.className,
            lufga.variable,
            "antialiased h-full w-full font-sans"
          )}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>
              <SchedulerProvider>
                {children}
                <Toaster />
                <PerformanceDashboard />
                <SchedulerMonitor />
              </SchedulerProvider>
            </QueryProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
