import type { Metadata } from 'next'
import '@coinbase/onchainkit/styles.css';
import './globals.css';
import { Providers } from './providers';
import type { ReactNode } from 'react';
import FarcasterWrapper from "@/components/FarcasterWrapper";

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
        <html lang="en">
          <body>
            <Providers>
      <FarcasterWrapper>
        {children}
      </FarcasterWrapper>
      </Providers>
          </body>
        </html>
      );
}

export const metadata: Metadata = {
        title: "FrameMind Insights",
        description: "Discover social insights on Farcaster! FrameMind analyzes your interactions, trends, and suggests growth tips. Free basic features; upgrade for deep AI insights. Connect your wallet now!",
        other: { "fc:frame": JSON.stringify({"version":"next","imageUrl":"https://usdozf7pplhxfvrl.public.blob.vercel-storage.com/thumbnail_1c8585c3-fbb8-42f5-91c3-268c21c152ba-rROkdbVdfCcO8qyFCxYheRr0LUUcQT","button":{"title":"Open with Ohara","action":{"type":"launch_frame","name":"FrameMind Insights","url":"https://laugh-house-760.app.ohara.ai","splashImageUrl":"https://usdozf7pplhxfvrl.public.blob.vercel-storage.com/farcaster/splash_images/splash_image1.svg","splashBackgroundColor":"#ffffff"}}}
        ) }
    };
