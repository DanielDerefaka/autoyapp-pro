import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default function FeedsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  )
}