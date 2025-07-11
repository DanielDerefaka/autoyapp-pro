import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default function AutopilotLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}