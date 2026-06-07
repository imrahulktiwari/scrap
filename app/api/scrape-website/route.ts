import { NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

// Stopwords to ignore in targeted SEO keywords
const STOPWORDS = new Set([
  "the", "and", "is", "in", "of", "to", "a", "for", "with", "on", "at", "by", "from",
  "an", "as", "be", "by", "for", "from", "has", "he", "in", "is", "it", "its", "of",
  "on", "that", "the", "to", "was", "were", "will", "with", "or", "are", "this", "our",
  "we", "you", "your", "us", "they", "them", "i", "me", "my", "myself", "we", "our",
  "ours", "ourselves", "you", "your", "yours", "yourself", "yourselves", "he", "him",
  "his", "himself", "she", "her", "hers", "herself", "it", "its", "itself", "they",
  "them", "their", "theirs", "themselves", "what", "which", "who", "whom", "this",
  "that", "these", "those", "am", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "having", "do", "does", "did", "doing", "would", "should",
  "could", "ought", "i'm", "you're", "he's", "she's", "it's", "we're", "they're",
  "i've", "you've", "we've", "they've", "i'd", "you'd", "he'd", "she'd", "we'd",
  "they'd", "i'll", "you'll", "he'll", "she'll", "we'll", "they'll", "isn't",
  "aren't", "wasn't", "weren't", "hasn't", "haven't", "hadn't", "doesn't",
  "don't", "didn't", "won't", "wouldn't", "shan't", "shouldn't", "can't",
  "cannot", "couldn't", "mustn't", "let's", "that's", "who's", "what's",
  "here's", "there's", "when's", "where's", "why's", "how's", "a", "an", "the",
  "and", "but", "if", "or", "because", "as", "until", "while", "of", "at", "by",
  "for", "with", "about", "against", "between", "into", "through", "during",
  "before", "after", "above", "below", "to", "from", "up", "down", "in", "out",
  "on", "off", "over", "under", "again", "further", "then", "once", "here",
  "there", "when", "where", "why", "how", "all", "any", "both", "each", "few",
  "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own",
  "same", "so", "than", "too", "very"
]);

// Popular Tech Cities / Countries
const POPULAR_HQ_LOCATIONS = [
  "San Francisco", "New York", "London", "Berlin", "Paris", "Tokyo", "Singapore",
  "Toronto", "Austin", "Boston", "Seattle", "Chicago", "Denver", "Atlanta", "Sydney",
  "Melbourne", "Dublin", "Munich", "Amsterdam", "Stockholm", "Bangalore", "Mumbai",
  "Delhi", "Beijing", "Shanghai", "Seoul", "Tel Aviv", "Cape Town", "São Paulo",
  "United States", "United Kingdom", "Germany", "France", "Japan", "India", "Canada",
  "Australia", "Ireland", "Netherlands", "Sweden", "Brazil", "Israel"
];

// Helper to clean and validate URL
function validateAndFormatUrl(inputUrl: string): string | null {
  if (!inputUrl) return null;
  let cleanUrl = inputUrl.trim();
  
  // Basic validation that looks for space-free string
  if (/\s/.test(cleanUrl)) return null;

  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = "https://" + cleanUrl;
  }
  try {
    const parsed = new URL(cleanUrl);
    if (!parsed.hostname || !parsed.hostname.includes(".")) {
      return null;
    }
    return parsed.href;
  } catch (e) {
    return null;
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();
  
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json(
      { success: false, error: "Invalid URL" },
      { status: 400 }
    );
  }

  const { url } = body;
  const targetUrl = validateAndFormatUrl(url);

  if (!targetUrl) {
    return NextResponse.json(
      { success: false, error: "Invalid URL" },
      { status: 400 }
    );
  }

  let htmlData = "";
  try {
    const response = await axios.get(targetUrl, {
      timeout: 10000, // 10 second timeout
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      }
    });
    
    htmlData = response.data;
  } catch (error: any) {
    console.error(`Fetch failed for URL ${targetUrl}:`, error.message);
    return NextResponse.json(
      { success: false, error: "Failed to fetch website" },
      { status: 500 }
    );
  }

  let $;
  try {
    $ = cheerio.load(htmlData);
  } catch (error) {
    console.error("Cheerio load failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to parse HTML" },
      { status: 500 }
    );
  }

  const baseUrl = targetUrl;
  const bodyText = $("body").text() || "";
  const bodyTextLower = bodyText.toLowerCase();

  // 1. BASIC INFO
  const page_title = $("title").first().text().trim() || "";
  
  const meta_description = 
    $('meta[name="description"]').attr('content')?.trim() || 
    $('meta[name="Description"]').attr('content')?.trim() || 
    $('meta[property="og:description"]').attr('content')?.trim() || 
    "";
    
  let canonical_url = $('link[rel="canonical"]').attr('href')?.trim() || "";
  if (canonical_url && !/^https?:\/\//i.test(canonical_url)) {
    try {
      canonical_url = new URL(canonical_url, baseUrl).href;
    } catch (e) {}
  }
  
  let favicon_url = 
    $('link[rel="icon"]').attr('href')?.trim() || 
    $('link[rel="shortcut icon"]').attr('href')?.trim() || 
    $('link[rel="apple-touch-icon"]').attr('href')?.trim() || 
    "";
  if (favicon_url) {
    try {
      favicon_url = new URL(favicon_url, baseUrl).href;
    } catch (e) {}
  } else {
    try {
      favicon_url = new URL("/favicon.ico", baseUrl).href;
    } catch (e) {}
  }
  
  const language = $("html").attr("lang")?.trim() || "";

  // 2. BUSINESS INFO
  let company_name = 
    $('meta[property="og:site_name"]').attr('content')?.trim() || 
    $('meta[name="og:site_name"]').attr('content')?.trim() || 
    "";
  if (!company_name) {
    const parts = page_title.split(/[-|–—•]/);
    company_name = parts[0]?.trim() || page_title;
  }

  let tagline = $("h1").first().text().trim() || "";
  if (!tagline) {
    tagline = 
      $('meta[property="og:title"]').attr('content')?.trim() || 
      $('meta[name="og:title"]').attr('content')?.trim() || 
      "";
  }

  let about_summary = 
    $('meta[name="description"]').attr('content')?.trim() || 
    $('meta[name="Description"]').attr('content')?.trim() || 
    "";
  if (!about_summary) {
    $("p").each((_, el) => {
      const txt = $(el).text().trim().replace(/\s+/g, ' ');
      if (txt.length > 40 && txt.length < 300) {
        about_summary = txt;
        return false; // Break
      }
    });
  }

  // Industry matching
  const industries: Record<string, string[]> = {
    "SaaS": ["saas", "software as a service", "subscription software", "cloud software", "platform as a service", "b2b software", "workflow automation", "app integration", "software platform", "cloud-based"],
    "E-commerce": ["e-commerce", "ecommerce", "shopify", "online store", "shopping cart", "online retail", "buy online", "checkout", "storefront", "merchant", "shop online"],
    "Fintech": ["fintech", "finance", "payment gateway", "credit card", "banking", "lending", "crypto", "blockchain", "investment", "wealth management", "billing", "invoice", "payments"],
    "Healthtech": ["healthtech", "health", "healthcare", "medical", "telemedicine", "patient care", "clinical", "biotech", "digital health", "wellness app", "doctor", "fitness app"],
    "Edtech": ["edtech", "education", "e-learning", "learning management", "online course", "classroom", "student", "teacher", "curriculum", "academy", "learn", "courses"],
    "Marketing": ["marketing", "advertising", "seo", "ad campaign", "brand awareness", "conversion rate", "lead generation", "email marketing", "social media management", "growth marketing"],
    "Legal": ["legal", "law firm", "lawyer", "attorney", "compliance", "contract management", "legaltech", "regulatory", "attorneys", "lawyers"],
    "Real Estate": ["real estate", "property management", "mortgage", "home buying", "apartment rental", "listing", "realtor", "brokerage", "properties", "apartments"],
    "Travel": ["travel", "flight booking", "hotel reservation", "tourism", "vacation", "trip planner", "itinerary", "hospitality", "booking", "tours"],
    "Logistics": ["logistics", "supply chain", "shipping", "delivery", "freight", "warehouse", "tracking", "fleet management", "transportation"],
    "HR & Recruitment": ["hr", "human resources", "recruitment", "hiring", "applicant tracking", "payroll", "onboarding", "talent management", "employee engagement", "recruit"],
    "Developer Tools": ["developer tools", "devtool", "api", "git", "github", "coding", "software engineering", "compiler", "debugging", "sdk", "cli", "database", "hosting", "npm", "open source"],
    "Agency": ["agency", "consulting", "design studio", "dev shop", "creative agency", "digital transformation", "it services", "professional services", "custom software"],
    "Media & Publishing": ["media", "publishing", "magazine", "news", "journalism", "blog", "podcast", "broadcasting", "content creation", "articles"],
    "Retail": ["retail", "brick and mortar", "pos", "point of sale", "inventory", "merchandising", "supermarket", "store location"],
    "Food & Beverage": ["food", "beverage", "restaurant", "catering", "delivery", "cafe", "recipe", "grocery", "dine", "eat"],
    "Non-profit": ["non-profit", "nonprofit", "charity", "donation", "foundation", "philanthropy", "volunteer", "social impact", "donate"],
    "Gaming": ["gaming", "game development", "esports", "mobile game", "console", "steam", "playstation", "xbox", "multiplayer", "unity3d", "unreal engine"],
    "Cybersecurity": ["cybersecurity", "security", "encryption", "firewall", "antivirus", "malware", "threat detection", "zero trust", "identity management", "phishing", "auth", "sso"]
  };

  const industrySearchText = (
    page_title + " " +
    meta_description + " " +
    ($('meta[name="keywords"]').attr('content') || "") + " " +
    $("h1").text() + " " +
    bodyText.slice(0, 3000)
  ).toLowerCase();

  let industry_type = "Other";
  let maxIndustryScore = 0;
  for (const [ind, keywords] of Object.entries(industries)) {
    let score = 0;
    for (const kw of keywords) {
      const escapedKw = kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp("\\b" + escapedKw + "\\b", "gi");
      const matches = industrySearchText.match(regex);
      if (matches) {
        score += matches.length;
      }
    }
    if (score > maxIndustryScore) {
      maxIndustryScore = score;
      industry_type = ind;
    }
  }

  // Business Type Heuristics
  let business_type = "Unknown";
  const isB2B2C = /\bb2b2c\b/i.test(industrySearchText);
  const isMarketplace = /\bmarketplace\b|\bpeer-to-peer\b|\bbuy and sell\b|\bconnecting buyers\b/i.test(industrySearchText);
  const isEnterprise = /\benterprise grade\b|\bfortune 500\b|\bsingle sign-on\b|\bsso\b|\bsaml\b|\bdedicated support\b|\benterprise level\b/i.test(industrySearchText);

  const b2bKeywords = ["b2b", "business to business", "saas", "sales pipeline", "crm", "workflow automation", "team collaboration", "request a demo", "talk to sales", "organizations", "enterprise pricing"];
  const b2cKeywords = ["b2c", "consumer", "shop", "buy now", "for kids", "personal use", "individual plan", "add to cart", "free shipping", "app store", "play store", "download our app"];

  let b2bScore = 0;
  let b2cScore = 0;
  b2bKeywords.forEach(kw => {
    if (industrySearchText.includes(kw)) b2bScore++;
  });
  b2cKeywords.forEach(kw => {
    if (industrySearchText.includes(kw)) b2cScore++;
  });

  if (isB2B2C) {
    business_type = "B2B2C";
  } else if (isMarketplace) {
    business_type = "Marketplace";
  } else if (isEnterprise) {
    business_type = "Enterprise";
  } else if (b2bScore > b2cScore && b2bScore > 0) {
    business_type = "B2B";
  } else if (b2cScore > b2bScore && b2cScore > 0) {
    business_type = "B2C";
  } else if (b2bScore > 0 && b2cScore > 0) {
    business_type = "B2B2C";
  }

  // App Categories matching
  const categoryList = ["Project Management", "CRM", "Analytics", "Communication", "Finance", "Productivity", "Design", "HR", "Sales", "Support"];
  const app_categories: string[] = [];
  const categorySearchText = (
    ($('meta[name="keywords"]').attr('content') || "") + " " +
    $("header").text() + " " +
    $("footer").text() + " " +
    bodyText.slice(0, 5000)
  ).toLowerCase();

  for (const cat of categoryList) {
    const escapedCat = cat.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp("\\b" + escapedCat + "\\b", "i");
    if (regex.test(categorySearchText)) {
      app_categories.push(cat);
      if (app_categories.length >= 5) break;
    }
  }

  // Founded Year Scans
  let founded_year = "";
  const footerText = $("footer").text() || $(".footer").text() || $("#footer").text() || "";
  const aboutText = $("section[class*='about']").text() || $("div[id*='about']").text() || $(".about").text() || "";
  const foundedSearch = (footerText + " " + aboutText).trim();

  const explicitRegex = /(?:founded|established|est\.|since|started in)\s*(?:in\s*)?(\b(19\d{2}|20\d{2})\b)/i;
  const explicitMatch = foundedSearch.match(explicitRegex);
  if (explicitMatch && explicitMatch[1]) {
    founded_year = explicitMatch[1];
  } else {
    const rangeRegex = /(?:copyright|©)\s*(\b(19\d{2}|20\d{2})\b)\s*-\s*(\b(19\d{2}|20\d{2})\b)/i;
    const rangeMatch = foundedSearch.match(rangeRegex);
    if (rangeMatch && rangeMatch[1]) {
      founded_year = rangeMatch[1];
    } else {
      const copyrightRegex = /(?:copyright|©)\s*(\b(19\d{2}|20\d{2})\b)/i;
      const copyrightMatch = foundedSearch.match(copyrightRegex);
      if (copyrightMatch && copyrightMatch[1]) {
        founded_year = copyrightMatch[1];
      }
    }
  }

  // Company Size
  let company_size = "";
  const sizeText = bodyText.slice(0, 6000);
  const sizeRegexes = [
    /\b(\d+(?:-\d+|\+)?)\s*(?:employees|people|team members|staff|associates)\b/i,
    /\bteam\s+of\s+(\d+(?:\+)?)\b/i,
    /\b(\d+,\d+|\d+)\s+employees\b/i
  ];
  for (const regex of sizeRegexes) {
    const match = sizeText.match(regex);
    if (match && match[0]) {
      company_size = match[0].trim();
      break;
    }
  }

  // 3. CONTACT DETAILS
  const emails = new Set<string>();
  
  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr('href') || "";
    const email = href.replace(/^mailto:/i, '').split('?')[0].trim();
    if (email) emails.add(email);
  });
  
  const emailRegex = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
  const bodyEmails = bodyText.match(emailRegex);
  if (bodyEmails) {
    bodyEmails.forEach(e => emails.add(e.trim()));
  }

  const contact_email = emails.size > 0 ? Array.from(emails)[0] : "";

  let support_email = "";
  const supportPatterns = ["support@", "help@", "care@"];
  for (const email of Array.from(emails)) {
    const lower = email.toLowerCase();
    if (supportPatterns.some(pat => lower.startsWith(pat))) {
      support_email = email;
      break;
    }
  }

  const phones = new Set<string>();
  $('a[href^="tel:"]').each((_, el) => {
    const href = $(el).attr('href') || "";
    const phone = href.replace(/^tel:/i, '').split('?')[0].trim();
    if (phone) phones.add(phone);
  });

  const phoneRegex = /\b\+?\(?\d{1,4}\)?[-.\s]?\(?\d{1,3}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}(?:[-.\s]?\d{1,9})?\b/g;
  const contactSearchArea = (footerText + " " + $(".contact").text() + " " + $("#contact").text()).trim();
  const bodyPhones = contactSearchArea.match(phoneRegex);
  if (bodyPhones) {
    bodyPhones.forEach(p => {
      const cleanPhone = p.replace(/[-.\s()]/g, '');
      if (cleanPhone.length >= 7 && cleanPhone.length <= 15) {
        phones.add(p.trim());
      }
    });
  }
  const contact_phone = phones.size > 0 ? Array.from(phones)[0] : "";

  // Contact Address
  let contact_address = "";
  if (footerText) {
    const lines = footerText.split('\n');
    const addressRegex = /\b\d+\s+[A-Za-z0-9\s.,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Way|Drive|Dr|Lane|Ln|Court|Ct|Plaza|Pl|Suite|Ste|Floor|Fl)\b/i;
    for (const line of lines) {
      const cleanLine = line.trim().replace(/\s+/g, ' ');
      if (addressRegex.test(cleanLine)) {
        contact_address = cleanLine;
        break;
      }
    }
    if (!contact_address) {
      const cityStateZipRegex = /\b[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}(-\d{4})?\b/;
      for (const line of lines) {
        const cleanLine = line.trim().replace(/\s+/g, ' ');
        if (cityStateZipRegex.test(cleanLine)) {
          contact_address = cleanLine;
          break;
        }
      }
    }
  }

  // Contact Page URL
  let contact_page_url = "";
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')?.trim() || "";
    if (/\/contact/i.test(href) || /contact-us/i.test(href)) {
      try {
        contact_page_url = new URL(href, baseUrl).href;
      } catch (e) {
        contact_page_url = href;
      }
      return false; // Break
    }
  });

  // HQ Location
  let hq_location = "";
  if (contact_address) {
    const parts = contact_address.split(',');
    if (parts.length >= 2) {
      hq_location = parts.slice(-2).join(',').trim();
    }
  }
  if (!hq_location) {
    const locationSearchText = (footerText + " " + meta_description + " " + page_title).toLowerCase();
    for (const loc of POPULAR_HQ_LOCATIONS) {
      if (locationSearchText.includes(loc.toLowerCase())) {
        hq_location = loc;
        break;
      }
    }
  }

  // 4. SOCIAL LINKS
  const social_links: Record<string, string> = {
    linkedin: "",
    twitter: "",
    facebook: "",
    instagram: "",
    youtube: "",
    github: "",
    tiktok: "",
    pinterest: ""
  };

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')?.trim() || "";
    try {
      const parsedSocial = new URL(href, baseUrl).href;
      if (parsedSocial.includes("linkedin.com") && !social_links.linkedin) social_links.linkedin = parsedSocial;
      if ((parsedSocial.includes("twitter.com") || parsedSocial.includes("x.com")) && !social_links.twitter) social_links.twitter = parsedSocial;
      if (parsedSocial.includes("facebook.com") && !social_links.facebook) social_links.facebook = parsedSocial;
      if (parsedSocial.includes("instagram.com") && !social_links.instagram) social_links.instagram = parsedSocial;
      if (parsedSocial.includes("youtube.com") && !social_links.youtube) social_links.youtube = parsedSocial;
      if (parsedSocial.includes("github.com") && !social_links.github) social_links.github = parsedSocial;
      if (parsedSocial.includes("tiktok.com") && !social_links.tiktok) social_links.tiktok = parsedSocial;
      if (parsedSocial.includes("pinterest.com") && !social_links.pinterest) social_links.pinterest = parsedSocial;
    } catch (e) {}
  });

  // 5. SEO DATA
  const h1_tags: string[] = [];
  $("h1").each((_, el) => {
    const txt = $(el).text().trim().replace(/\s+/g, ' ');
    if (txt && h1_tags.length < 5) h1_tags.push(txt);
  });

  const h2_tags: string[] = [];
  $("h2").each((_, el) => {
    const txt = $(el).text().trim().replace(/\s+/g, ' ');
    if (txt && h2_tags.length < 10) h2_tags.push(txt);
  });

  const meta_keywords = $('meta[name="keywords"]').attr('content')?.trim() || "";

  // Targeted SEO Keywords logic
  const keywordWeights: Record<string, number> = {};
  
  function addKeywords(text: string, weight: number) {
    if (!text) return;
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/);
      
    for (let word of words) {
      word = word.trim();
      if (word.length > 2 && !STOPWORDS.has(word) && !/^\d+$/.test(word)) {
        keywordWeights[word] = (keywordWeights[word] || 0) + weight;
      }
    }
  }

  if (meta_keywords) {
    meta_keywords.split(',').forEach(kw => {
      const cleanKw = kw.trim().toLowerCase();
      if (cleanKw && !STOPWORDS.has(cleanKw)) {
        keywordWeights[cleanKw] = (keywordWeights[cleanKw] || 0) + 10;
      }
    });
  }

  addKeywords(page_title, 5);
  addKeywords(meta_description, 3);
  
  $("h1").each((_, el) => addKeywords($(el).text(), 4));
  $("h2").each((_, el) => addKeywords($(el).text(), 2));

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')?.trim() || "";
    const anchorText = $(el).text().trim();
    let isInternal = false;
    if (href.startsWith('/') || href.startsWith('.') || !/^https?:\/\//i.test(href)) {
      isInternal = true;
    } else {
      try {
        const linkUrl = new URL(href, baseUrl);
        const baseParsed = new URL(baseUrl);
        if (linkUrl.hostname === baseParsed.hostname) {
          isInternal = true;
        }
      } catch (e) {}
    }
    
    if (isInternal && anchorText) {
      addKeywords(anchorText, 1);
    }
  });

  const targeted_seo_keywords = Object.entries(keywordWeights)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0])
    .slice(0, 20);

  const open_graph = {
    og_title: 
      $('meta[property="og:title"]').attr('content')?.trim() || 
      $('meta[name="og:title"]').attr('content')?.trim() || 
      "",
    og_description: 
      $('meta[property="og:description"]').attr('content')?.trim() || 
      $('meta[name="og:description"]').attr('content')?.trim() || 
      "",
    og_image: 
      $('meta[property="og:image"]').attr('content')?.trim() || 
      $('meta[name="og:image"]').attr('content')?.trim() || 
      ""
  };

  // 6. PRICING SIGNALS
  let pricing_page_found = false;
  let pricing_page_url = "";

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')?.trim() || "";
    if (/\/pricing/i.test(href) || /pricing-plans/i.test(href) || /subscription/i.test(href) || /plans/i.test(href)) {
      pricing_page_found = true;
      try {
        pricing_page_url = new URL(href, baseUrl).href;
      } catch (e) {
        pricing_page_url = href;
      }
      return false; // Break
    }
  });

  const free_trial = /\b(free trial|try (for )?free|start (your )?free|get started free|risk free trial)\b/i.test(bodyTextLower);
  const free_plan = /\b(free plan|free forever|free tier|free version|free package|completely free plan)\b/i.test(bodyTextLower);

  let starting_price = "";
  const priceRegex = /([$£€₹¥]\s*\d+(?:\.\d{2})?)\s*(?:\/\s*|per\s*|a\s*)?(?:mo|month|year|yr|user|seat)/i;
  const priceMatch = bodyTextLower.match(priceRegex);
  if (priceMatch && priceMatch[1]) {
    starting_price = priceMatch[1] + "/mo";
  }

  let pricing_model = "Unknown";
  if (free_plan && starting_price) {
    pricing_model = "Freemium";
  } else if (bodyTextLower.includes("pay as you go") || bodyTextLower.includes("usage-based") || bodyTextLower.includes("per credit")) {
    pricing_model = "Usage-based";
  } else if (starting_price || bodyTextLower.includes("subscribe") || bodyTextLower.includes("subscription")) {
    pricing_model = "Subscription";
  } else if (bodyTextLower.includes("one-time payment") || bodyTextLower.includes("lifetime access") || bodyTextLower.includes("one-time fee")) {
    pricing_model = "One-time";
  } else if (bodyTextLower.includes("contact sales") || bodyTextLower.includes("contact for pricing") || bodyTextLower.includes("request a quote")) {
    pricing_model = "Contact for pricing";
  } else if (bodyTextLower.includes("100% free") || bodyTextLower.includes("always free") || bodyTextLower.includes("free open source")) {
    pricing_model = "Free";
  }

  // 7. FEATURES
  interface FeatureItem {
    title: string;
    description: string;
  }
  const features: FeatureItem[] = [];
  const seenTitles = new Set<string>();

  $("h2, h3, h4").each((_, el) => {
    const headingText = $(el).text().trim().replace(/\s+/g, ' ');
    if (headingText.length < 3 || headingText.length > 60) return;
    
    const skipHeaders = /^(pricing|faq|frequently asked questions|about|contact|features|integrations|get started|testimonials|reviews|login|sign up|subscribe|our customers|partners|ready to|what they say|footer|navigation)$/i;
    if (skipHeaders.test(headingText)) return;
    
    let pText = "";
    let sibling = $(el).next();
    while (sibling.length > 0) {
      if (sibling.is('p')) {
        pText = sibling.text().trim();
        break;
      }
      const nestedP = sibling.find('p').first();
      if (nestedP.length > 0) {
        pText = nestedP.text().trim();
        break;
      }
      sibling = sibling.next();
    }
    
    if (!pText) {
      pText = $(el).parent().find('p').first().text().trim();
    }
    
    pText = pText.replace(/\s+/g, ' ');
    
    if (pText.length > 30 && pText.length < 250 && !seenTitles.has(headingText)) {
      seenTitles.add(headingText);
      features.push({
        title: headingText,
        description: pText
      });
    }
    
    if (features.length >= 10) return false; // Break Cheerio
  });

  // 8. INTEGRATIONS
  const knownTools = [
    "Slack", "HubSpot", "Salesforce", "Zapier", "Stripe", "Google Analytics",
    "Intercom", "Notion", "Jira", "Shopify", "Mailchimp", "Twilio", "AWS",
    "Google Workspace", "Microsoft 365", "Zoom", "QuickBooks", "Xero"
  ];
  const integrations: string[] = [];
  const integrationsSearchText = (bodyText + " " + $('a[href]').text()).toLowerCase();

  for (const tool of knownTools) {
    const escapedTool = tool.toLowerCase().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp("\\b" + escapedTool + "\\b", "i");
    if (regex.test(integrationsSearchText)) {
      integrations.push(tool);
    }
  }

  // 9. TECH STACK DETECTION
  const htmlSource = $.html() || "";
  const tech_stack: string[] = [];

  if (htmlSource.includes("__next") || htmlSource.includes("_next/static")) {
    tech_stack.push("Next.js");
  }
  if (htmlSource.includes("wp-content") || htmlSource.includes("wp-includes")) {
    tech_stack.push("WordPress");
  }
  if (htmlSource.includes("Shopify.theme")) {
    tech_stack.push("Shopify");
  }
  if (htmlSource.includes("gatsby")) {
    tech_stack.push("Gatsby");
  }
  if (htmlSource.includes("nuxt")) {
    tech_stack.push("Nuxt.js");
  }
  if (htmlSource.includes("angular")) {
    tech_stack.push("Angular");
  }
  if (htmlSource.includes("vue")) {
    tech_stack.push("Vue.js");
  }
  if (htmlSource.includes("webflow")) {
    tech_stack.push("Webflow");
  }
  if (htmlSource.includes("squarespace")) {
    tech_stack.push("Squarespace");
  }
  if (htmlSource.includes("wix.com")) {
    tech_stack.push("Wix");
  }

  const crawlTime = Date.now() - startTime;

  return NextResponse.json({
    success: true,
    url: targetUrl,
    crawl_time_ms: crawlTime,
    basic_info: {
      page_title,
      meta_description,
      canonical_url,
      favicon_url,
      language
    },
    business_info: {
      company_name,
      tagline,
      about_summary,
      industry_type,
      business_type,
      app_categories,
      founded_year,
      company_size
    },
    contact_details: {
      contact_email,
      support_email,
      contact_phone,
      contact_address,
      contact_page_url,
      hq_location
    },
    social_links: {
      linkedin: social_links.linkedin,
      twitter: social_links.twitter,
      facebook: social_links.facebook,
      instagram: social_links.instagram,
      youtube: social_links.youtube,
      github: social_links.github,
      tiktok: social_links.tiktok,
      pinterest: social_links.pinterest
    },
    seo_data: {
      meta_keywords,
      targeted_seo_keywords,
      h1_tags,
      h2_tags,
      open_graph
    },
    pricing: {
      pricing_page_found,
      pricing_page_url,
      free_trial,
      free_plan,
      starting_price,
      pricing_model
    },
    features,
    integrations,
    tech_stack
  });
}
