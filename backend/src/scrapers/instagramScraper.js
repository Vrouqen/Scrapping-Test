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
    return { followers: null, following: null, posts: null };
  }

  // Bilingüe para inglés y español
  const followersMatch = ogDescription.match(/([\d.,]+)\s+(Followers|seguidores)/i);
  const followingMatch = ogDescription.match(/([\d.,]+)\s+(Following|seguidos)/i);
  const postsMatch = ogDescription.match(/([\d.,]+)\s+(Posts?|publicaciones)/i);

  return {
    followers: followersMatch ? followersMatch[1] : null,
    following: followingMatch ? followingMatch[1] : null,
    posts: postsMatch ? postsMatch[1] : null
  };
}

function parsePositiveIntEnv(name, fallbackValue) {
  const raw = process.env[name];
  if (!raw) {
    return fallbackValue;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallbackValue;
}

async function collectPostLinks(page, maxPosts, maxScrolls) {
  const links = new Set();
  let stagnantRounds = 0;

  for (let i = 0; i < maxScrolls && links.size < maxPosts && stagnantRounds < 3; i += 1) {
    const currentLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]'))
        .map((anchor) => anchor.getAttribute('href'))
        .filter(Boolean)
        .map((href) => href.startsWith('http') ? href : `https://www.instagram.com${href}`);
    });

    const before = links.size;
    for (const link of currentLinks) {
      if (links.size >= maxPosts) {
        break;
      }
      links.add(link);
    }

    if (links.size === before) {
      stagnantRounds += 1;
    } else {
      stagnantRounds = 0;
    }

    if (links.size >= maxPosts) {
      break;
    }

    await page.mouse.wheel(0, 2500);
    await page.waitForTimeout(900);
  }

  return Array.from(links);
}

// ==========================================
// FUNCIÓN 1: EXTRAER SOLO DATOS DEL PERFIL
// ==========================================
async function scrapeInstagramProfile({ username, url }) {
  const profileUrl = buildProfileUrl({ username, url });
  const headless = String(process.env.HEADLESS || 'true').toLowerCase() !== 'false';
  const sessionId = process.env.INSTAGRAM_SESSIONID;

  const browser = await chromium.launch({ headless });

  try {
    const contextOptions = {
      viewport: { width: 1366, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    };

    if (sessionId) {
      contextOptions.storageState = {
        cookies: [{
          name: 'sessionid',
          value: sessionId,
          domain: '.instagram.com',
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'None'
        }],
        origins: []
      };
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    
    try {
      await page.waitForSelector('a[href^="/p/"], a[href^="/reel/"]', { timeout: 10000 });
    } catch (e) {
      console.log('No se encontraron posts en la cuadrícula o tardaron mucho en cargar.');
    }

    const data = await page.evaluate(() => {
      const getMeta = (propertyName) => {
        const el = document.querySelector(`meta[property="${propertyName}"]`);
        return el ? el.getAttribute('content') : null;
      };

      const ogTitle = getMeta('og:title');
      const ogDescription = getMeta('og:description');
      const ogImage = getMeta('og:image');
      const canonicalUrl = document.querySelector('link[rel="canonical"]')?.href || null;

      const postLinks = Array.from(document.querySelectorAll('a[href^="/p/"], a[href^="/reel/"]'))
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

// ==========================================
// FUNCIÓN 2: SCRAPEO PROFUNDO DE PUBLICACIONES
// ==========================================
async function scrapeInstagramPosts({ username, url }) {
  const profileUrl = buildProfileUrl({ username, url });
  const headless = String(process.env.HEADLESS || 'true').toLowerCase() !== 'false';
  const sessionId = process.env.INSTAGRAM_SESSIONID;
  const maxPosts = parsePositiveIntEnv('MAX_POSTS_TO_SCRAPE', 5000);
  const maxScrolls = parsePositiveIntEnv('MAX_POSTS_SCROLL_ROUNDS', 200);

  const browser = await chromium.launch({ headless });

  try {
    const contextOptions = {
      viewport: { width: 1366, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    };

    if (sessionId) {
      contextOptions.storageState = {
        cookies: [{
          name: 'sessionid',
          value: sessionId,
          domain: '.instagram.com',
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'None'
        }],
        origins: []
      };
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });

    try {
      await page.waitForSelector('a[href*="/p/"], a[href*="/reel/"]', { timeout: 10000 });
    } catch (e) {
      await page.screenshot({ path: 'debug_posts.png', fullPage: true });
      throw new Error('NO_POSTS_FOUND');
    }

    const postLinks = await collectPostLinks(page, maxPosts, maxScrolls);

    if (!postLinks || postLinks.length === 0) {
      throw new Error('NO_POSTS_FOUND');
    }

    const detailedPosts = [];
    
    // Aquí el bot abre cada foto una por una
    for (const link of postLinks) {
      const postPage = await context.newPage();
      
      try {
        await postPage.goto(link, { waitUntil: 'domcontentloaded', timeout: 15000 });
        
        const postData = await postPage.evaluate(() => {
          const getMeta = (prop) => document.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') || '';
          const getNamedMeta = (name) => document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') || '';
          const timeTag = document.querySelector('time[datetime]')?.getAttribute('datetime') || '';
          const articlePublished = getMeta('article:published_time');
          const ogUpdated = getMeta('og:updated_time');
          const jsonLdDate = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
            .map((node) => node.textContent || '')
            .map((text) => {
              try {
                const parsed = JSON.parse(text);
                if (Array.isArray(parsed)) {
                  const candidate = parsed.find((item) => item?.datePublished);
                  return candidate?.datePublished || '';
                }

                return parsed?.datePublished || '';
              } catch (_error) {
                return '';
              }
            })
            .find(Boolean) || '';

          const publishedAt = timeTag || articlePublished || jsonLdDate || ogUpdated || getNamedMeta('date') || '';

          return {
            url: document.location.href,
            image: getMeta('og:image'),
            description: getMeta('og:description'),
            publishedAt
          };
        });

        const likesMatch = postData.description.match(/([\d.,]+)\s+(likes|Me gusta)/i);
        const commentsMatch = postData.description.match(/([\d.,]+)\s+(comments|comentarios)/i);

        detailedPosts.push({
          url: postData.url,
          imageUrl: postData.image,
          likes: likesMatch ? likesMatch[1] : "0",
          comments: commentsMatch ? commentsMatch[1] : "0",
          caption: postData.description,
          publishedAt: postData.publishedAt || null
        });
        
      } catch (postError) {
        console.log(`Error al extraer el post ${link}:`, postError.message);
      } finally {
        await postPage.close();
      }
    }

    return {
      requestedUrl: profileUrl,
      postsCount: detailedPosts.length,
      recentPosts: detailedPosts
    };
  } finally {
    await browser.close();
  }
}

module.exports = {
  scrapeInstagramProfile,
  scrapeInstagramPosts
};