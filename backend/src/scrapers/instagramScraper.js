const { chromium } = require('playwright');

function sanitizeUsername(username) {
  return String(username || '')
    .trim()
    .replace(/^@/, '')
    .replace(/[^a-zA-Z0-9._]/g, '');
}

function buildProfileUrl({ username, url }) {
  if (url) {
    return String(url).trim();
  }

  const safeUsername = sanitizeUsername(username);

  if (!safeUsername) {
    throw new Error('username invalido');
  }

  return `https://www.instagram.com/${safeUsername}/`;
}

function parseOgDescription(ogDescription) {
  if (!ogDescription) {
    return {
      followers: null,
      following: null,
      posts: null
    };
  }

  const followersMatch = ogDescription.match(/([\d.,]+)\s+Followers/i);
  const followingMatch = ogDescription.match(/([\d.,]+)\s+Following/i);
  const postsMatch = ogDescription.match(/([\d.,]+)\s+Posts?/i);

  return {
    followers: followersMatch ? followersMatch[1] : null,
    following: followingMatch ? followingMatch[1] : null,
    posts: postsMatch ? postsMatch[1] : null
  };
}

async function scrapeInstagramProfile({ username, url }) {
  const profileUrl = buildProfileUrl({ username, url });
  const headless = String(process.env.HEADLESS || 'true').toLowerCase() !== 'false';
  const sessionId = process.env.INSTAGRAM_SESSIONID;

  const browser = await chromium.launch({ headless });

  try {
    const contextOptions = {
      viewport: { width: 1366, height: 900 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    };

    if (sessionId) {
      contextOptions.storageState = {
        cookies: [
          {
            name: 'sessionid',
            value: sessionId,
            domain: '.instagram.com',
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'None'
          }
        ],
        origins: []
      };
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2500);

    const data = await page.evaluate(() => {
      const getMeta = (propertyName) => {
        const el = document.querySelector(`meta[property="${propertyName}"]`);
        return el ? el.getAttribute('content') : null;
      };

      const ogTitle = getMeta('og:title');
      const ogDescription = getMeta('og:description');
      const ogImage = getMeta('og:image');
      const canonicalUrl = document.querySelector('link[rel="canonical"]')?.href || null;

      const postLinks = Array.from(document.querySelectorAll('a[href^="/p/"]'))
        .map((anchor) => anchor.getAttribute('href'))
        .filter(Boolean)
        .slice(0, 12)
        .map((href) => `https://www.instagram.com${href}`);

      return {
        pageTitle: document.title || null,
        ogTitle,
        ogDescription,
        profileImage: ogImage,
        canonicalUrl,
        recentPosts: postLinks
      };
    });

    const parsedMetrics = parseOgDescription(data.ogDescription);

    return {
      requestedUrl: profileUrl,
      scrapedAt: new Date().toISOString(),
      metrics: parsedMetrics,
      profile: {
        pageTitle: data.pageTitle,
        ogTitle: data.ogTitle,
        ogDescription: data.ogDescription,
        profileImage: data.profileImage,
        canonicalUrl: data.canonicalUrl
      },
      recentPosts: data.recentPosts
    };
  } finally {
    await browser.close();
  }
}

module.exports = {
  scrapeInstagramProfile
};
