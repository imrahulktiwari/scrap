import { NextResponse } from "next/server";
import gplay from "google-play-scraper";
// @ts-ignore
import appStore from "app-store-scraper";

function extractPlayStoreId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try parsing as URL
  try {
    const url = new URL(trimmed);

    // Check if it's details page on play.google.com
    if (
      url.hostname === "play.google.com" ||
      url.hostname.endsWith(".play.google.com")
    ) {
      const id = url.searchParams.get("id");
      if (id) return id;
    }

    // Check for shared/short links (e.g., play.app.goo.gl)
    if (url.hostname === "play.app.goo.gl") {
      const linkParam = url.searchParams.get("link");
      if (linkParam) {
        const nestedUrl = new URL(linkParam);
        const id = nestedUrl.searchParams.get("id");
        if (id) return id;
      }
    }
  } catch (e) {
    // Not a valid URL, check if it looks like a package name
  }

  // Package name pattern: com.example.app (letters, numbers, underscores, dots)
  const cleanInput = trimmed.replace(/['"]/g, "");
  const packageRegex = /^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)+$/;
  if (packageRegex.test(cleanInput)) {
    return cleanInput;
  }

  return null;
}

function extractAppStoreId(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. Check if it's a pure number (e.g., "310633997")
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  // 2. Try parsing as URL
  try {
    const url = new URL(trimmed);
    if (
      url.hostname.includes("apps.apple.com") ||
      url.hostname.includes("itunes.apple.com")
    ) {
      // Extract id from path (usually ends with /id123456789 or /id123456789/...)
      const match = url.pathname.match(/\/id(\d+)/);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
      // Or from search params
      const idParam = url.searchParams.get("id");
      if (idParam && /^\d+$/.test(idParam)) {
        return parseInt(idParam, 10);
      }
    }
  } catch (e) {
    // Not a valid URL
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "URL, package ID or App Store ID is required" },
        { status: 400 },
      );
    }

    // 1. First check if it's an iOS App Store target
    const iosId = extractAppStoreId(url);
    if (iosId !== null) {
      // Use app-store-scraper
      const scraper = (appStore as any).app
        ? appStore
        : (appStore as any).default || appStore;

      if (typeof scraper.app !== "function") {
        console.error(
          "app-store-scraper structure: ",
          typeof appStore,
          appStore,
        );
        return NextResponse.json(
          { error: "App Store Scraper library is not loaded correctly" },
          { status: 500 },
        );
      }

      const app = await scraper.app({ id: iosId });

      const iosDevWebsite = app.developerWebsite || "";
      let iosDomain = "";
      try {
        if (iosDevWebsite) iosDomain = new URL(iosDevWebsite).hostname;
      } catch (_) {}

      return NextResponse.json({
        title: app.title,
        appId: app.appId || String(iosId),
        id: app.id,
        url: app.url || `https://apps.apple.com/app/id${iosId}`,
        developer: app.developer,
        website: iosDevWebsite,
        domain: iosDomain,
        developer_email: "", // App Store API does not provide dev support email
        privacyPolicy: "", // App Store API does not provide privacy policy URL directly in standard detail
        category: app.primaryGenre || (app.genres && app.genres[0]) || "",
        genre: app.primaryGenre || (app.genres && app.genres[0]) || "",
        genres: app.genres || [],
        icon: app.icon,
        score: app.score,
        scoreText: typeof app.score === "number" ? app.score.toFixed(2) : "",
        installs: "N/A", // App Store does not publish install counts
        summary: app.description ? app.description.slice(0, 150) + "..." : "",
        description: app.description || "",
        priceText:
          app.price === 0 || app.free
            ? "Free"
            : `${app.price} ${app.currency || "USD"}`,
        free: app.free,
        released: app.released
          ? new Date(app.released).toLocaleDateString()
          : "",
        updated: app.updated ? new Date(app.updated).toLocaleDateString() : "",
        platform: "ios",
      });
    }

    // 2. Fallback to Google Play Store target
    const playId = extractPlayStoreId(url);
    if (!playId) {
      return NextResponse.json(
        {
          error:
            "Could not extract a valid Google Play package ID (e.g. com.instagram.android) or App Store ID (e.g. 310633997) from your input.",
        },
        { status: 400 },
      );
    }

    const scraper = (gplay as any).app
      ? gplay
      : (gplay as any).default || gplay;

    if (typeof scraper.app !== "function") {
      console.error("google-play-scraper structure: ", typeof gplay, gplay);
      return NextResponse.json(
        { error: "Play Store Scraper library is not loaded correctly" },
        { status: 500 },
      );
    }

    const app = await scraper.app({ appId: playId });

    const androidDevWebsite = app.developerWebsite || "";
    let androidDomain = "";
    try {
      if (androidDevWebsite)
        androidDomain = new URL(androidDevWebsite).hostname;
    } catch (_) {}

    return NextResponse.json({
      title: app.title,
      appId: app.appId || playId,
      url: app.url || `https://play.google.com/store/apps/details?id=${playId}`,
      developer: app.developer,
      website: androidDevWebsite,
      domain: androidDomain,
      developer_email: app.developerEmail || "",
      privacyPolicy: app.privacyPolicy || "",
      category: app.genre,
      genre: app.genre,
      genres: app.genres || [app.genre],
      icon: app.icon,
      score: app.score,
      scoreText: app.scoreText || String(app.score || ""),
      installs: app.installs,
      summary: app.summary || "",
      description: app.description || "",
      priceText: app.priceText || (app.free ? "Free" : "Paid"),
      free: app.free,
      released: app.released || "",
      updated: app.updated ? new Date(app.updated).toLocaleDateString() : "",
      platform: "android",
    });
  } catch (error: any) {
    console.error("Scraping error:", error);
    const message = error.message || "";
    if (message.includes("not found") || message.includes("404")) {
      return NextResponse.json(
        {
          error:
            "App not found. Please check that the URL or application ID is correct and publicly available.",
        },
        { status: 404 },
      );
    }
    return NextResponse.json(
      {
        error:
          error.message ||
          "An unexpected error occurred while scraping the app details.",
      },
      { status: 500 },
    );
  }
}
