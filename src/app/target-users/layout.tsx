import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default function TargetUsersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}