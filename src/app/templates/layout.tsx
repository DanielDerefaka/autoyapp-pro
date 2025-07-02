import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default function TemplatesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}