// Ambient type declarations for Next.js modules to satisfy TypeScript compiler
// when local node_modules/next declaration files are missing

declare module "next" {
  export type Metadata = {
    metadataBase?: URL | null;
    title?: string | { default?: string; template?: string; absolute?: string };
    description?: string | null;
    applicationName?: string | null;
    authors?: Array<{ name?: string; url?: string }>;
    generator?: string | null;
    keywords?: string[] | string | null;
    referrer?: string | null;
    themeColor?: any;
    colorScheme?: any;
    viewport?: any;
    creator?: string | null;
    publisher?: string | null;
    robots?: any;
    icons?: any;
    manifest?: string | URL | null;
    openGraph?: any;
    twitter?: any;
    verification?: any;
    appleWebApp?: any;
    formatDetection?: any;
    itunes?: any;
    abstract?: string | null;
    appLinks?: any;
    archives?: any;
    assets?: any;
    bookmarks?: any;
    category?: string | null;
    classification?: string | null;
    other?: Record<string, any>;
    alternates?: any;
  };

  export namespace MetadataRoute {
    export type Sitemap = Array<{
      url: string;
      lastModified?: string | Date;
      changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
      priority?: number;
    }>;
    export type Robots = {
      rules: {
        userAgent?: string | string[];
        allow?: string | string[];
        disallow?: string | string[];
        crawlDelay?: number;
      } | Array<{
        userAgent?: string | string[];
        allow?: string | string[];
        disallow?: string | string[];
        crawlDelay?: number;
      }>;
      sitemap?: string | string[];
      host?: string;
    };
  }

  export type ResolvingMetadata = Promise<Metadata>;
  export type NextPage<P = {}, IP = P> = any;
  export type GetServerSideProps<P = {}> = any;
  export type GetStaticProps<P = {}> = any;
  export default function next(options?: any): any;
}

declare module "next/font/google" {
  export interface FontOptions {
    subsets?: string[];
    weight?: string | string[];
    style?: string | string[];
    display?: string;
    variable?: string;
    preload?: boolean;
    fallback?: string[];
    adjustFontFallback?: boolean;
  }

  export type FontOutput = {
    className: string;
    style: { fontFamily: string; fontWeight?: number; fontStyle?: string };
    variable?: string;
  };

  export function Inter(options?: FontOptions): FontOutput;
  export function Roboto(options?: FontOptions): FontOutput;
  export function Montserrat(options?: FontOptions): FontOutput;
  export function Poppins(options?: FontOptions): FontOutput;
  export function Lato(options?: FontOptions): FontOutput;
  export function Open_Sans(options?: FontOptions): FontOutput;
  export function Oswald(options?: FontOptions): FontOutput;
  export function Raleway(options?: FontOptions): FontOutput;
  const fonts: Record<string, (options?: FontOptions) => FontOutput>;
  export default fonts;
}

declare module "next/link" {
  import React from "react";
  export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    href: any;
    as?: any;
    replace?: boolean;
    scroll?: boolean;
    shallow?: boolean;
    passHref?: boolean;
    prefetch?: boolean;
    locale?: string | false;
  }
  const Link: React.ForwardRefExoticComponent<LinkProps & React.RefAttributes<HTMLAnchorElement>>;
  export default Link;
}

declare module "next/image" {
  import React from "react";
  export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string | any;
    alt: string;
    width?: number | `${number}`;
    height?: number | `${number}`;
    fill?: boolean;
    loader?: any;
    quality?: number | `${number}`;
    priority?: boolean;
    loading?: "lazy" | "eager";
    placeholder?: "blur" | "empty";
    blurDataURL?: string;
    unoptimized?: boolean;
    onLoadingComplete?: any;
  }
  const Image: React.FC<ImageProps>;
  export default Image;
}

declare module "next/navigation" {
  export function useRouter(): {
    push(href: string, options?: any): void;
    replace(href: string, options?: any): void;
    refresh(): void;
    back(): void;
    forward(): void;
    prefetch(href: string): void;
  };
  export function usePathname(): string;
  export function useSearchParams(): URLSearchParams;
  export function useParams<T = Record<string, string | string[]>>(): T;
  export function redirect(url: string, type?: any): never;
  export function notFound(): never;
}

declare module "next/server" {
  export class NextResponse<Body = unknown> extends Response {
    static json<JsonBody>(data: JsonBody, init?: ResponseInit): NextResponse<JsonBody>;
    static redirect(url: string | URL, init?: number | ResponseInit): NextResponse<never>;
    static rewrite(destination: string | URL, init?: ResponseInit): NextResponse<never>;
    static next(init?: ResponseInit): NextResponse<never>;
    cookies: any;
  }
  export class NextRequest extends Request {
    cookies: any;
    nextUrl: URL;
    ip?: string;
    geo?: any;
  }
}

declare module "next/server.js" {
  export * from "next/server";
}

declare module "next/headers" {
  export function headers(): Promise<Headers> & Headers;
  export function cookies(): Promise<any> & any;
}

declare module "next/dynamic" {
  import React from "react";
  export default function dynamic<P = {}>(
    loader: () => Promise<React.ComponentType<P> | { default: React.ComponentType<P> }>,
    options?: {
      ssr?: boolean;
      loading?: (loadingProps: { error?: Error; isLoading?: boolean; pastDelay?: boolean; retry?: () => void }) => React.ReactNode;
    }
  ): React.ComponentType<P>;
}

declare module "next/script" {
  import React from "react";
  export interface ScriptProps extends React.ScriptHTMLAttributes<HTMLScriptElement> {
    strategy?: "afterInteractive" | "lazyOnload" | "beforeInteractive" | "worker";
    onLoad?: (e: any) => void;
    onReady?: () => void;
    onError?: (e: any) => void;
  }
  const Script: React.FC<ScriptProps>;
  export default Script;
}

declare module "next/dist/lib/metadata/types/metadata-interface.js" {
  export type Metadata = any;
  export type ResolvingMetadata = any;
  export type Viewport = any;
  export type ResolvingViewport = any;
}

declare module "next/dist/*" {
  const content: any;
  export default content;
  export const metadata: any;
}
