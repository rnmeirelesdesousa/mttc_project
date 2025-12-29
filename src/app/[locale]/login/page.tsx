import { LoginForm } from '@/components/features/LoginForm';

interface LoginPageProps {
  params: {
    locale: string;
  };
}

/**
 * Login Page
 * 
 * Provides authentication gateway for the application.
 * - Centered login card
 * - Form handling via Server Action
 * - Redirect logic after successful login
 */
export default async function LoginPage({ params }: LoginPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4">
      <div className="w-full max-w-md">
        <LoginForm locale={params.locale} />
      </div>
    </div>
  );
}

