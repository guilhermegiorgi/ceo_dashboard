import DashboardLayout from '@/components/DashboardLayout';
import RequireAuth from '@/components/RequireAuth';

export default function DashboardSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <DashboardLayout>{children}</DashboardLayout>
    </RequireAuth>
  );
}

