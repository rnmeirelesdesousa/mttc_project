import { DashboardNav } from '@/components/features/DashboardNav';

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: {
    locale: string;
  };
}

export default function DashboardLayout({ children, params }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <DashboardNav locale={params.locale} />
      <main>{children}</main>
    </div>
  );
}

