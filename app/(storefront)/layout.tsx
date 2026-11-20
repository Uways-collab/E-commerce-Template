import AnnouncementBar from "@/components/site/AnnouncementBar";
import Footer from "@/components/site/Footer";
import Header from "@/components/site/Header";
import FlashHost from "@/components/site/FlashHost";
import CartDrawer from "@/components/cart/CartDrawer";
import { CartProvider } from "@/components/cart/CartProvider";
import { getSettings } from "@/lib/settings";
import { listCategories } from "@/lib/repositories/catalog";
import { readCartCookie } from "@/lib/cart";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { formatMoney } from "@/lib/utils";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const [settings, categories, user, cartLines] = await Promise.all([
    getSettings(),
    Promise.resolve(listCategories({ activeOnly: true })),
    getSessionUser(),
    readCartCookie(),
  ]);

  const itemCount = cartLines.reduce((sum, line) => sum + line.q, 0);
  const money = (value: number) => formatMoney(value, settings.locale.currency, settings.locale.locale);

  return (
    <CartProvider initialItemCount={itemCount}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:border focus:border-ink focus:bg-canvas focus:px-4 focus:py-2 focus:text-[12px]"
      >
        Skip to content
      </a>
      {settings.announcement.enabled && (
        <AnnouncementBar
          messages={settings.announcement.messages.filter(Boolean)}
          linkLabel={settings.announcement.linkLabel}
          href={settings.announcement.href}
        />
      )}
      <Header
        brandName={settings.brand.name}
        logoUrl={settings.brand.logoUrl}
        nav={settings.navigation.main}
        secondaryNav={settings.navigation.secondary}
        accountName={user?.name ?? null}
        isAdmin={isAdmin(user)}
        supportEmail={settings.contact.email}
        supportPhone={settings.contact.phone}
      />
      <main id="main">{children}</main>
      <Footer settings={settings} categories={categories} />
      <CartDrawer freeShippingThresholdLabel={money(settings.commerce.freeShippingThresholdCents)} />
      <FlashHost />
    </CartProvider>
  );
}
