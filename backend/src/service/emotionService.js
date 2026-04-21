const { pipeline } = require('@xenova/transformers');

let classifier;

function normalizeSentimentOutput(output) {
  if (!output) {
    return { sentiment: 'neutral', score: 0 };
  }

  if (Array.isArray(output)) {
    const first = output[0] || {};
    return {
      sentiment: String(first.label || 'neutral'),
      score: Number(first.score || 0)
    };
  }

  return {
    sentiment: String(output.label || 'neutral'),
    score: Number(output.score || 0)
  };
}

async function analyzeEmotions(comments) {
  // Cargamos el modelo (se descarga una sola vez al inicio)
  // Usamos un modelo ligero de clasificación de sentimientos/emociones
  if (!classifier) {
    classifier = await pipeline('text-classification', 'Xenova/bert-base-multilingual-uncased-sentiment');
  }

  const analyzed = await Promise.all(comments.map(async (c) => {
    // Solo analizamos si hay texto real
    if (!c?.text || c.text.length < 2) {
      return { ...c, sentiment: 'neutral', score: 0 };
    }
    
    const output = await classifier(c.text);
    const normalized = normalizeSentimentOutput(output);

    return {
      ...c,
      sentiment: normalized.sentiment,
      score: normalized.score
    };
  }));

  return analyzed;
}

module.exports = { analyzeEmotions };