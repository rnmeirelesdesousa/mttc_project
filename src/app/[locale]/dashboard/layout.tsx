import { DashboardNav } from '@/components/features/DashboardNav';
import { DashboardSidebar } from '@/components/features/DashboardSidebar';
import { getCurrentUserRole } from '@/lib/auth';

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: {
    locale: string;
  };
}

export default async function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const role = await getCurrentUserRole();
  const isAdmin = role === 'admin';

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav locale={params.locale} />
      <div className="flex">
        <DashboardSidebar locale={params.locale} isAdmin={isAdmin} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

