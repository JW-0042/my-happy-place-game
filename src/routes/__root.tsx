import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { CreatedWithGrokBanner } from "@/components/created-with-grok-banner";
import {
  FULL_TITLE,
  OG_DESCRIPTION,
  OG_IMAGE_PATH,
  PRODUCT_NAME,
  VERSION,
  VERSION_BASE,
} from "@/lib/windoors/config";
import appCss from "../styles.css?url";

const APP_NAME = FULL_TITLE;
const host = import.meta.env.VITE_PUBLIC_HOSTNAME as string | undefined;

/** Absolute OG image URL when hostname is known; otherwise site-relative path. */
const ogImageAbsolute = host
  ? `https://${host}${OG_IMAGE_PATH}`
  : OG_IMAGE_PATH;

const ogTitle = `${PRODUCT_NAME} ${VERSION_BASE} Caretaker`;
const twitterCard = host
  ? `https://og.grok.me/v1/card.png?host=${encodeURIComponent(host)}&title=${encodeURIComponent(APP_NAME)}`
  : ogImageAbsolute;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no",
      },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "theme-color", content: "#0b1220" },
      { title: APP_NAME },
      { name: "description", content: OG_DESCRIPTION },
      // Open Graph
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: PRODUCT_NAME },
      { property: "og:title", content: ogTitle },
      { property: "og:description", content: OG_DESCRIPTION },
      { property: "og:image", content: ogImageAbsolute },
      { property: "og:image:secure_url", content: ogImageAbsolute },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: `${ogTitle} — keep system health above zero` },
      ...(host ? [{ property: "og:url", content: `https://${host}/` }] : []),
      // Twitter / X
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: ogTitle },
      { name: "twitter:description", content: OG_DESCRIPTION },
      { name: "twitter:image", content: twitterCard },
      { name: "twitter:image:alt", content: `${ogTitle} preview` },
      // App-ish
      { name: "application-name", content: `${PRODUCT_NAME} ${VERSION}` },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "image_src", href: ogImageAbsolute },
    ],
  }),
  component: () => (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="overflow-hidden overscroll-none">
        <CreatedWithGrokBanner />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
