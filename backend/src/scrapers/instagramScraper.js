const { chromium } = require('playwright');
const POSTS_PREVIEW_LIMIT = 10;
const MAX_PUBLICATIONS = 1000; // Para capturar muchas publicaciones para análisis histórico
const HISTORICAL_YEARS = 3;
const MIN_POSTS_FOR_HISTORICAL = 3;

async function createInsaBrowser() {
  const headless = String(process.env.HEADLESS || 'true').toLowerCase() !== 'false';
  const sessionId = process.env.INSTAGRAM_SESSIONID;
  const browser = await chromium.launch({ headless });

  const contextOptions = {
    viewport: { width: 1366, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  };

  if (sessionId) {
    contextOptions.storageState = {
      cookies: [{
        name: 'sessionid', value: sessionId,
        domain: '.instagram.com', path: '/',
        httpOnly: true, secure: true, sameSite: 'None'
      }]
    };
  }

  const context = await browser.newContext(contextOptions);
  return { browser, context };
}

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

  // Bilingüe para inglés y español, soporta formatos compactos (k, m, mil, millones)
  const followersMatch = ogDescription.match(/([\d.,]+(?:\s*(?:k|m|mil|millones?))?)\s+(Followers|seguidores)/i);
  const followingMatch = ogDescription.match(/([\d.,]+(?:\s*(?:k|m|mil|millones?))?)\s+(Following|seguidos)/i);
  const postsMatch = ogDescription.match(/([\d.,]+(?:\s*(?:k|m|mil|millones?))?)\s+(Posts?|publicaciones)/i);

  return {
    followers: followersMatch ? parseEngagementNumber(followersMatch[1]) : null,
    following: followingMatch ? parseEngagementNumber(followingMatch[1]) : null,
    posts: postsMatch ? parseEngagementNumber(postsMatch[1]) : null
  };
}

function parseProfileMetricsFromBodyText(bodyText) {
  const text = String(bodyText || '').replace(/\u00a0/g, ' ').trim();
  if (!text) {
    return { followers: null, following: null, posts: null };
  }

  const metricValuePattern = '[\\d.,]+(?:\\s*(?:k|m|mil|millones?))?';

  const postsFollowersFollowing = new RegExp(
    `(${metricValuePattern})\\s+(posts?|publicaciones)\\s+(${metricValuePattern})\\s+(followers|seguidores)\\s+(${metricValuePattern})\\s+(following|seguidos)`,
    'i'
  );

  const followersFollowingPosts = new RegExp(
    `(${metricValuePattern})\\s+(followers|seguidores)\\s+(${metricValuePattern})\\s+(following|seguidos)\\s+(${metricValuePattern})\\s+(posts?|publicaciones)`,
    'i'
  );

  const firstMatch = text.match(postsFollowersFollowing);
  if (firstMatch) {
    return {
      followers: parseEngagementNumber(firstMatch[3]),
      following: parseEngagementNumber(firstMatch[5]),
      posts: parseEngagementNumber(firstMatch[1])
    };
  }

  const secondMatch = text.match(followersFollowingPosts);
  if (secondMatch) {
    return {
      followers: parseEngagementNumber(secondMatch[1]),
      following: parseEngagementNumber(secondMatch[3]),
      posts: parseEngagementNumber(secondMatch[5])
    };
  }

  return { followers: null, following: null, posts: null };
}

function parsePositiveIntEnv(name, fallbackValue) {
  const raw = process.env[name];
  if (!raw) {
    return fallbackValue;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallbackValue;
}

function toSafeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseEngagementNumber(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    return 0;
  }

  const compactMatch = normalized
    .replace(/\s+/g, ' ')
    .match(/^([\d\s.,]+?)\s*(k|m|mil|millones?)$/i);
  if (compactMatch) {
    const base = parseLocalizedNumber(compactMatch[1]);
    const suffix = compactMatch[2];
    const multiplier = suffix.startsWith('m') ? 1000000 : 1000;
    return Number.isFinite(base) ? Math.round(base * multiplier) : 0;
  }

  const digitsOnly = normalized.replace(/[^\d]/g, '');
  if (!digitsOnly) {
    return 0;
  }

  return Number.parseInt(digitsOnly, 10);
}

function parseLocalizedNumber(rawValue) {
  const value = String(rawValue || '').trim().replace(/\s+/g, '');
  if (!value) {
    return 0;
  }

  const hasDot = value.includes('.');
  const hasComma = value.includes(',');

  if (!hasDot && !hasComma) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (hasDot && hasComma) {
    const lastDot = value.lastIndexOf('.');
    const lastComma = value.lastIndexOf(',');
    const decimalSeparator = lastDot > lastComma ? '.' : ',';

    const normalized = decimalSeparator === '.'
      ? value.replace(/,/g, '')
      : value.replace(/\./g, '').replace(',', '.');

    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const separator = hasComma ? ',' : '.';
  const [integerPart, decimalPart] = value.split(separator);

  // Si hay 3 dígitos después del separador, asumimos separador de miles.
  if (decimalPart && decimalPart.length === 3) {
    const parsed = Number.parseFloat(`${integerPart}${decimalPart}`);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const normalized = hasComma ? value.replace(',', '.') : value;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
  const { browser, context } = await createInsaBrowser();
  try {
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


      return {
        pageTitle: document.title || null,
        ogTitle,
        ogDescription,
        profileImage: ogImage,
        canonicalUrl,
        bodyText: document.body?.innerText || ''
      };
    });

    const bodyMetrics = parseProfileMetricsFromBodyText(data.bodyText);
    const ogMetrics = parseOgDescription(data.ogDescription);

    const parsedMetrics = {
      followers: bodyMetrics.followers ?? ogMetrics.followers,
      following: bodyMetrics.following ?? ogMetrics.following,
      posts: bodyMetrics.posts ?? ogMetrics.posts
    };

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
  const maxPosts = POSTS_PREVIEW_LIMIT;
  const maxScrolls = parsePositiveIntEnv('MAX_POSTS_SCROLL_ROUNDS', 200);
  const { browser, context } = await createInsaBrowser();
  try {
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

    if (postLinks.length < MIN_POSTS_FOR_HISTORICAL) {
      throw new Error('INSUFFICIENT_POSTS');
    }

    const detailedPosts = [];
    
    // Aquí el bot abre cada foto una por una
    for (const link of postLinks) {
      const postPage = await context.newPage();
      
      try {
        await postPage.goto(link, { waitUntil: 'domcontentloaded', timeout: 10000 });
        
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

        const likesMatch = postData.description.match(/([\d.,]+(?:\s*(?:k|m|mil|millones?))?)\s+(likes|Me gusta)/i);
        const commentsMatch = postData.description.match(/([\d.,]+(?:\s*(?:k|m|mil|millones?))?)\s+(comments|comentarios)/i);

        const parsedLikes = parseEngagementNumber(likesMatch ? likesMatch[1] : '0');
        const parsedComments = parseEngagementNumber(commentsMatch ? commentsMatch[1] : '0');

        detailedPosts.push({
          url: postData.url,
          imageUrl: postData.image,
          likes: parsedLikes,
          comments: parsedComments,
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
      recentPosts: detailedPosts.slice(0, POSTS_PREVIEW_LIMIT)
    };
  } finally {
    await browser.close();
  }
}

// ==========================================
// FUNCIÓN 3: ESTADÍSTICAS HISTÓRICAS DEL PERFIL
// ==========================================
async function scrapeInstagramHistoricalStats({ username, url }) {
  const profileUrl = buildProfileUrl({ username, url });
  const maxScrolls = parsePositiveIntEnv('MAX_POSTS_SCROLL_ROUNDS', 200);
  const { browser, context } = await createInsaBrowser();

  try {
    const page = await context.newPage();

        await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 300000 });

        try {
          await page.waitForSelector('a[href*="/p/"], a[href*="/reel/"]', { timeout: 300000 });
    } catch (e) {
      throw new Error('NO_POSTS_FOUND');
    }

    // Recolectar TODOS los posts (sin límite de 10)
    const postLinks = await collectPostLinks(page, MAX_PUBLICATIONS, maxScrolls);

    if (!postLinks || postLinks.length === 0) {
      throw new Error('NO_POSTS_FOUND');
    }

    const postsStats = [];
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - HISTORICAL_YEARS);

    // Procesar cada post para extraer estadísticas
    for (const link of postLinks) {
      const postPage = await context.newPage();

      try {
        await postPage.goto(link, { waitUntil: 'domcontentloaded', timeout: 300000 });

        const postData = await postPage.evaluate(() => {
          const getMeta = (prop) => document.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') || '';
          const getNamedMeta = (name) => document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') || '';
          
          const timeTag = document.querySelector('time[datetime]')?.getAttribute('datetime') || '';
          const articlePublished = getMeta('article:published_time');
          const ogUpdated = getMeta('og:updated_time');
          
          // Intentar extraer JSON-LD para fecha
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

          // Extraer likes y comentarios de la descripción
          const description = getMeta('og:description');
          
          return {
            url: document.location.href,
            image: getMeta('og:image'),
            description: description,
            publishedAt: publishedAt
          };
        });

        // Parsear números de likes y comentarios
        const likesMatch = postData.description.match(/([\d.,]+(?:\s*(?:k|m|mil|millones?))?)\s+(likes|Me gusta)/i);
        const commentsMatch = postData.description.match(/([\d.,]+(?:\s*(?:k|m|mil|millones?))?)\s+(comments|comentarios)/i);

        const likes = parseEngagementNumber(likesMatch ? likesMatch[1] : '0');
        const comments = parseEngagementNumber(commentsMatch ? commentsMatch[1] : '0');
        
        const publishedDate = new Date(postData.publishedAt);

        if (Number.isNaN(publishedDate.getTime())) {
          continue;
        }

        if (publishedDate < threeYearsAgo) {
          break;
        }

        postsStats.push({
          url: postData.url,
          imageUrl: postData.image || null,
          comments: comments,
          likes: likes,
          publishedAt: postData.publishedAt || null,
          publishedDate: publishedDate.toISOString().split('T')[0]
        });
      } catch (postError) {
        console.log(`Error al extraer estadísticas del post ${link}:`, postError.message);
      } finally {
        await postPage.close();
      }
    }

    // Calcular estadísticas
    const stats = calculateStats(postsStats);

    return {
      requestedUrl: profileUrl,
      totalPostsAnalyzed: postsStats.length,
      stats: stats,
      posts: postsStats.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    };
  } finally {
    await browser.close();
  }
}

// Función auxiliar para calcular estadísticas
function calculateStats(posts) {
  if (posts.length === 0) {
    return {
      averageLikes: 0,
      averageComments: 0,
      totalLikes: 0,
      totalComments: 0,
      postWithMostLikes: null,
      postWithMostComments: null,
      monthlyStats: {}
    };
  }

  // Estadísticas básicas
  const totalLikes = posts.reduce((sum, p) => sum + toSafeNumber(p.likes), 0);
  const totalComments = posts.reduce((sum, p) => sum + toSafeNumber(p.comments), 0);
  const averageLikes = Math.round(totalLikes / posts.length);
  const averageComments = Math.round(totalComments / posts.length);

  // Post con más likes
  const postWithMostLikes = posts.reduce((max, p) => (
    toSafeNumber(p.likes) > toSafeNumber(max.likes) ? p : max
  ), posts[0]);

  // Post con más comentarios
  const postWithMostComments = posts.reduce((max, p) => (
    toSafeNumber(p.comments) > toSafeNumber(max.comments) ? p : max
  ), posts[0]);

  // Estadísticas mensuales
  const monthlyStats = {};
  posts.forEach(post => {
    const date = new Date(post.publishedAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyStats[monthKey]) {
      monthlyStats[monthKey] = {
        postCount: 0,
        totalLikes: 0,
        totalComments: 0,
        averageLikes: 0,
        averageComments: 0
      };
    }

    monthlyStats[monthKey].postCount += 1;
    monthlyStats[monthKey].totalLikes += toSafeNumber(post.likes);
    monthlyStats[monthKey].totalComments += toSafeNumber(post.comments);
  });

  // Calcular promedios mensuales
  Object.keys(monthlyStats).forEach(month => {
    const monthData = monthlyStats[month];
    monthData.averageLikes = Math.round(monthData.totalLikes / monthData.postCount);
    monthData.averageComments = Math.round(monthData.totalComments / monthData.postCount);
  });

  return {
    totalPosts: posts.length,
    totalLikes: totalLikes,
    totalComments: totalComments,
    averageLikes: averageLikes,
    averageComments: averageComments,
    postWithMostLikes: {
      url: postWithMostLikes.url,
      imageUrl: postWithMostLikes.imageUrl || null,
      likes: toSafeNumber(postWithMostLikes.likes),
      comments: toSafeNumber(postWithMostLikes.comments),
      publishedAt: postWithMostLikes.publishedAt
    },
    postWithMostComments: {
      url: postWithMostComments.url,
      imageUrl: postWithMostComments.imageUrl || null,
      comments: toSafeNumber(postWithMostComments.comments),
      publishedAt: postWithMostComments.publishedAt
    },
    monthlyStats: monthlyStats
  };
}

module.exports = {
  scrapeInstagramProfile,
  scrapeInstagramPosts,
  scrapeInstagramHistoricalStats
};