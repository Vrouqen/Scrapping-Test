const { chromium } = require('playwright');
const MAX_PUBLICATIONS = 10;
const { analyzeEmotions } = require('../service/emotionService');

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

async function expandComments(page, maxClicks = 12) {
  const clickPatterns = [
    'view all comments', 'view more comments', 'load more comments',
    'ver todos los comentarios', 'ver mas comentarios', 'mostrar mas comentarios',
    'ver respuestas', 'view replies', 'more replies', 'mas respuestas', 'ver .* respuestas'
  ];

  for (let i = 0; i < maxClicks; i += 1) {
    const clicked = await page.evaluate((patterns) => {
      // Buscamos cualquier span o div que tenga el texto de "Ver respuestas"
      const elements = Array.from(document.querySelectorAll('span, div[role="button"], button'));
      const target = elements.find((element) => {
        // Evitamos elementos gigantes, solo queremos el botoncito
        if (element.children.length > 2) return false; 
        const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text) return false;

        return patterns.some((pattern) => new RegExp(pattern, 'i').test(text));
      });

      if (!target) return false;

      // Hacemos clic en el elemento o en su contenedor cliqueable más cercano
      const clickable = target.closest('[role="button"], button, a') || target;
      clickable.click();
      return true;
    }, clickPatterns);

    if (!clicked) break;
    await page.waitForTimeout(1200); // Damos tiempo a que carguen las respuestas
  }
}

async function extractCommentsFromPost(page) {
  await expandComments(page);

  return page.evaluate(() => {
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const cleanUsername = (value) => normalize(value).replace(/^@/, '');
    const comments = [];
    const seen = new Set();

    // 1. Buscamos al autor del post (suelen estar en h2 o header)
    const authorLink = document.querySelector('article header a[href^="/"], h2 a[role="link"]');
    const postAuthorUsername = cleanUsername(authorLink?.textContent || '');

    // 2. Buscamos TODOS los botones de "Responder" (es nuestro ancla para saber que ahí hay un comentario)
    const actionElements = Array.from(document.querySelectorAll('span[dir="auto"], div[role="button"]'))
      .filter(el => /^(Responder|Reply)$/i.test(normalize(el.textContent)));

    for (const el of actionElements) {
      // Subimos en el DOM (hasta 6 niveles) buscando el contenedor principal de este comentario
      let container = el.parentElement;
      let found = false;
      for (let i = 0; i < 6; i++) {
        if (!container) break;
        if (container.querySelector('a[href^="/"]')) { // Si tiene un enlace de perfil, es el contenedor correcto
          found = true;
          break;
        }
        container = container.parentElement;
      }

      if (!found || !container) continue;

      // Extraemos el nombre de usuario
      const userLink = container.querySelector('a[href^="/"]');
      const username = cleanUsername(userLink.textContent);

      // Ignoramos si es el autor del post o si no hay usuario
      if (!username || (postAuthorUsername && username.toLowerCase() === postAuthorUsername.toLowerCase())) {
        continue;
      }

      // Extraemos el texto real del comentario
      // Agarramos todos los spans con texto y filtramos la basura (usuario, tiempo, botones)
      const textNodes = Array.from(container.querySelectorAll('span[dir="auto"]'))
        .map(n => normalize(n.textContent))
        .filter(text => {
          if (!text) return false;
          if (text === username) return false; // Quitar el nombre
          if (/^(\d+\s*(sem|h|min|s|d|w|m|y)[a-z]*|Just now|Hace)$/i.test(text)) return false; // Quitar tiempo (ej: "11 sem")
          if (/^(Responder|Reply|Me gusta|Like|Ver traducción|Translate)$/i.test(text)) return false; // Quitar UI
          return true;
        });

      const commentText = textNodes.join(' ').trim();

      if (commentText) {
        const key = `${username.toLowerCase()}|${commentText.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          comments.push({ username, text: commentText });
        }
      }
    }

    return {
      postAuthorUsername: postAuthorUsername || null,
      comments
    };
  });
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
        canonicalUrl
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
  const maxPosts = Math.min(parsePositiveIntEnv('MAX_POSTS_TO_SCRAPE', MAX_PUBLICATIONS), MAX_PUBLICATIONS);
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
      recentPosts: detailedPosts.slice(0, MAX_PUBLICATIONS)
    };
  } finally {
    await browser.close();
  }
}

// ==========================================
// FUNCIÓN 3: COMENTARIOS DE LAS ULTIMAS 10 PUBLICACIONES
// ==========================================
async function scrapeInstagramRecentComments({ username, url }) {
  const profileUrl = buildProfileUrl({ username, url });
  const maxScrolls = parsePositiveIntEnv('MAX_POSTS_SCROLL_ROUNDS', 200);
  const { browser, context } = await createInsaBrowser();

  const emotionalSummary = {
    positive: 0,
    neutral: 0,
    negative: 0
  };

  try {

    const page = await context.newPage();

    await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });

    try {
      await page.waitForSelector('a[href*="/p/"], a[href*="/reel/"]', { timeout: 10000 });
    } catch (e) {
      throw new Error('NO_POSTS_FOUND');
    }

    const postLinks = await collectPostLinks(page, MAX_PUBLICATIONS, maxScrolls);

    if (!postLinks || postLinks.length === 0) {
      throw new Error('NO_POSTS_FOUND');
    }

    const postsWithComments = [];
    let totalComments = 0;

    for (const link of postLinks.slice(0, MAX_PUBLICATIONS)) {
      const postPage = await context.newPage();

      try {
        await postPage.goto(link, { waitUntil: 'domcontentloaded', timeout: 15000 });

        const postData = await postPage.evaluate(() => {
          const getMeta = (prop) => document.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') || '';
          const headerLink = document.querySelector('article header a[href^="/"]');

          return {
            url: document.location.href,
            imageUrl: getMeta('og:image'),
            postAuthorUsername: headerLink?.textContent?.trim().replace(/^@/, '') || ''
          };
        });

        const commentData = await extractCommentsFromPost(postPage);
        const filteredComments = commentData.comments.filter((comment) => {
          if (!commentData.postAuthorUsername) {
            return true;
          }

          return comment.username.toLowerCase() !== commentData.postAuthorUsername.toLowerCase();
        });

        totalComments += filteredComments.length;

        postsWithComments.push({
          url: postData.url,
          imageUrl: postData.imageUrl,
          postAuthorUsername: commentData.postAuthorUsername || postData.postAuthorUsername || null,
          commentsCount: filteredComments.length,
          comments: filteredComments
        });
      } catch (postError) {
        console.log(`Error al extraer comentarios del post ${link}:`, postError.message);
        postsWithComments.push({
          url: link,
          imageUrl: null,
          postAuthorUsername: null,
          commentsCount: 0,
          comments: [],
          error: postError.message
        });
      } finally {
        await postPage.close();
      }
    }

    // Procesamos todos los comentarios extraídos para darles valor
    for (const post of postsWithComments) {
      if (post.comments.length > 0) {
        post.comments = await analyzeEmotions(post.comments);
        
        // LÓGICA PARA EL SUMMARY
        post.comments.forEach(c => {
          // El modelo 'multilingual-sentiment' devuelve estrellas (1 star, 2 stars, etc.)
          // O etiquetas POSITIVE/NEGATIVE dependiendo del modelo exacto.
          const label = String(c?.sentiment || 'neutral').toLowerCase();
          if (label.includes('4') || label.includes('5') || label.includes('pos')) {
            emotionalSummary.positive++;
          } else if (label.includes('1') || label.includes('2') || label.includes('neg')) {
            emotionalSummary.negative++;
          } else {
            emotionalSummary.neutral++;
          }
        });
      }
    }

    return {
      requestedUrl: profileUrl,
      totalComments,
      summary: emotionalSummary, 
      recentPosts: postsWithComments // Estos ya llevan el sentiment individual
    };
  } finally {
    await browser.close();
  }
}

module.exports = {
  scrapeInstagramProfile,
  scrapeInstagramPosts,
  scrapeInstagramRecentComments
};