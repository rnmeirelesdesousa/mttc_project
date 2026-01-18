import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Header } from '@/components/features/Header';

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: {
    locale: string;
  };
}

// Force dynamic rendering to prevent Header caching during testing
export const dynamic = 'force-dynamic';

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(params.locale as 'en' | 'pt')) {
    notFound();
  }

  // Enable static rendering for the locale
  setRequestLocale(params.locale);

  // Providing all messages to the client side
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <Header locale={params.locale} />
      {children}
    </NextIntlClientProvider>
  );
}

