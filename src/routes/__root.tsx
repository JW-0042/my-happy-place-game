import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { CreatedWithGrokBanner } from "@/components/created-with-grok-banner";
import {
  FULL_TITLE,
  OG_DESCRIPTION,
  OG_IMAGE_ALT,
  OG_IMAGE_PATH,
  OG_TITLE,
  PRODUCT_NAME,
  VERSION,
} from "@/lib/windoors/config";
import appCss from "../styles.css?url";

const APP_NAME = FULL_TITLE;
const host = import.meta.env.VITE_PUBLIC_HOSTNAME as string | undefined;

/** Absolute OG image URL when hostname is known; otherwise site-relative path. */
const ogImageAbsolute = host
  ? `https://${host}${OG_IMAGE_PATH}`
  : OG_IMAGE_PATH;

const pageUrl = host ? `https://${host}/` : undefined;

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
      { property: "og:locale", content: "en_US" },
      { property: "og:site_name", content: PRODUCT_NAME },
      { property: "og:title", content: OG_TITLE },
      { property: "og:description", content: OG_DESCRIPTION },
      { property: "og:image", content: ogImageAbsolute },
      { property: "og:image:secure_url", content: ogImageAbsolute },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: OG_IMAGE_ALT },
      ...(pageUrl ? [{ property: "og:url", content: pageUrl }] : []),
      // Twitter / X — same custom 1200×630 art (not the generic Grok card)
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: OG_TITLE },
      { name: "twitter:description", content: OG_DESCRIPTION },
      { name: "twitter:image", content: ogImageAbsolute },
      { name: "twitter:image:alt", content: OG_IMAGE_ALT },
      { name: "twitter:creator", content: "@thimothybsirius" },
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
