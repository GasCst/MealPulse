import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * This file is web-only and used to configure the root HTML for every web page during static rendering.
 * The contents of this function only run in Node.js environments and do not have access to the DOM or browser APIs.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="it">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1.00001, viewport-fit=cover, user-scalable=no"
        />

        <title>MealPulse AI: AI Calorie Counter & Macro Tracker</title>

        {/* PWA & Apple iOS Standalone Fullscreen Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MealPulse" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#13201A" />
        <meta name="format-detection" content="telephone=no" />

        {/* Apple Touch Icon & PWA Manifest */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />

        {/* Disable default body bounce and native overscroll on iOS web */}
        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: pwaNativeStyle }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const pwaNativeStyle = `
html, body {
  background-color: #0B1410;
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  overscroll-behavior-y: none;
}
#root {
  display: flex;
  height: 100%;
}
`;
