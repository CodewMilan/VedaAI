import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4, Bricolage_Grotesque } from "next/font/google";
import { Toaster } from "sonner";
import { UserProvider } from "@/lib/auth/use-user";
import { getSupabaseServer } from "@/lib/supabase/server";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "VedaAI · AI Assessment Creator",
  description:
    "Generate beautifully formatted, exam-ready question papers in minutes — powered by AI.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#e56820",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Hydrate the UserProvider with the server-side session if Supabase is configured.
  // Failures here are silently swallowed so the app keeps rendering when keys are missing.
  let initialUser = null;
  try {
    const supabase = getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    initialUser = user;
  } catch {
    /* Supabase not configured or unreachable — fall back to client-side load */
  }

  return (
    <html lang="en" className={`${inter.variable} ${serif.variable} ${bricolage.variable}`}>
      <body className="min-h-screen font-display">
        <UserProvider initialUser={initialUser}>{children}</UserProvider>
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            classNames: {
              toast:
                "rounded-xl border-border shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80",
            },
          }}
        />
      </body>
    </html>
  );
}
