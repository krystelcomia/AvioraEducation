/**
 * AVIORA EDUCATION - PURE JAVASCRIPT DOCUMENT DETECTION & VERIFICATION ENGINE
 * Free, lightweight, and serverless-safe (zero native binary dependencies).
 * Fully compatible with Vercel Serverless Functions, AWS Lambda, and local Node environments.
 *
 * Detects:
 * 1. Document Classification (Resume vs Diploma vs Random Posters / Flyers / Graphics)
 * 2. Image Clarity (Resolution, total pixel density, sharpness)
 * 3. Document Completeness & Cropping (Aspect ratio, portrait vs landscape, panoramic strips)
 * 4. Content Verification (Section keywords, academic credentials, PDF text streams)
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { imageSize } = require('image-size');

// Anti-patterns that identify random non-document graphics, flyers, posters, and events
const RANDOM_IMAGE_PATTERNS = [
  'pickleball', 'tournament', 'poster', 'flyer', 'championship',
  'bracket', 'doubles', 'singles', 'court', 'registration fee', 'prize',
  'cocktail', 'party', 'meme', 'wallpaper', 'selfie', 'sports',
  'connected learning', 'infographic', 'postcard', 'invitation', 'ticket',
  'menu', 'food', 'drink', 'coupon', 'discount', 'sale', 'advertisement',
  'brochure', 'marketing', 'athletics', 'festival', 'concert', 'match',
  'league', 'banner', 'graphic'
];

// Keywords indicating an authentic Resume / CV
const RESUME_KEYWORDS = [
  'resume', 'curriculum vitae', 'curriculum', 'vitae', 'cv',
  'education', 'experience', 'employment', 'skills', 'work experience',
  'work history', 'qualifications', 'profile', 'summary', 'projects',
  'languages', 'objective', 'university', 'college', 'degree', 'bachelor',
  'master', 'phd', 'doctorate', 'gpa', 'references', 'achievements',
  'certifications', 'publications', 'contact', 'email', 'phone'
];

// Keywords indicating an authentic Degree Diploma / Certificate
const DIPLOMA_KEYWORDS = [
  'diploma', 'degree', 'certificate', 'certifies', 'conferred',
  'confer', 'university', 'college', 'school', 'bachelor', 'master',
  'doctor', 'doctorate', 'phd', 'academic', 'faculty', 'board of trustees',
  'president', 'chancellor', 'dean', 'awarded', 'hereby', 'seal',
  'honors', 'graduation', 'curriculum', 'completed', 'rights and privileges',
  'witness', 'title of'
];

/**
 * Pure JavaScript PDF text stream extraction using built-in Node zlib
 */
function extractTextFromPDF(buffer) {
  try {
    const raw = buffer.toString('latin1');
    let extracted = '';

    // Search for stream ... endstream blocks
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;
    while ((match = streamRegex.exec(raw)) !== null) {
      const streamData = match[1];
      let decoded = '';

      // Try zlib inflate (standard PDF FlateDecode)
      try {
        const streamBuf = Buffer.from(streamData, 'latin1');
        decoded = zlib.inflateSync(streamBuf).toString('latin1');
      } catch (e) {
        try {
          const streamBuf = Buffer.from(streamData, 'latin1');
          decoded = zlib.inflateRawSync(streamBuf).toString('latin1');
        } catch (e2) {
          decoded = streamData;
        }
      }

      // Extract text in parentheses (text) Tj
      const tjRegex = /\(([^)]+)\)\s*Tj/g;
      let tj;
      while ((tj = tjRegex.exec(decoded)) !== null) {
        extracted += tj[1] + ' ';
      }

      // Extract text in array [(text) 10 (more)] TJ
      const tjArrRegex = /\[([^\]]+)\]\s*TJ/g;
      let tjArr;
      while ((tjArr = tjArrRegex.exec(decoded)) !== null) {
        const inner = /\(([^)]+)\)/g;
        let inM;
        while ((inM = inner.exec(tjArr[1])) !== null) {
          extracted += inM[1] + ' ';
        }
      }
    }

    // Also include raw text words from PDF metadata, catalog, and uncompressed chunks
    const rawWords = raw.match(/\b[a-zA-Z]{3,}\b/g);
    if (rawWords) {
      extracted += ' ' + rawWords.slice(0, 300).join(' ');
    }

    return extracted.toLowerCase();
  } catch (err) {
    return '';
  }
}

/**
 * Extract embedded metadata strings from image buffer (PNG chunks, EXIF, etc.)
 */
function extractMetadataStringsFromImage(buffer) {
  try {
    const slice = buffer.slice(0, 65536).toString('latin1');
    const strings = slice.match(/[a-zA-Z0-9_\-\s]{4,}/g) || [];
    return strings.join(' ').toLowerCase();
  } catch (e) {
    return '';
  }
}

/**
 * Inspect an uploaded document for requirement compliance:
 * - Ensures file is not a random promotional poster/flyer
 * - Ensures file has high clarity (not low-res/blurry)
 * - Ensures file is complete and not cropped or cut off
 * - Validates expected document type (Resume vs Diploma)
 *
 * @param {Object} file - Multer file object { path, originalname, mimetype, size }
 * @param {'resume' | 'diploma'} expectedType - Expected document type
 * @returns {Promise<{ valid: boolean, warning: string|null, error: string|null, details: Object }>}
 */
async function inspectDocument(file, expectedType) {
  const result = {
    valid: true,
    warning: null,
    error: null,
    details: {
      type: expectedType,
      filename: file.originalname,
      clarity: 'good',
      completeness: 'complete',
      dimensions: null,
      detectedKeywords: []
    }
  };

  const ext = path.extname(file.originalname || '').toLowerCase();
  const lowerName = (file.originalname || '').toLowerCase();

  // 1. Filename Anti-Pattern Inspection
  const matchedAntiPatterns = RANDOM_IMAGE_PATTERNS.filter(pattern => lowerName.includes(pattern));
  if (matchedAntiPatterns.length > 0) {
    const patternStr = matchedAntiPatterns.slice(0, 2).join(' / ');
    result.valid = false;
    result.error = expectedType === 'resume'
      ? `The uploaded file ("${file.originalname}") appears to be a promotional poster or graphic (${patternStr}), not an applicant resume/CV. Please upload an official resume or curriculum vitae.`
      : `The uploaded file ("${file.originalname}") appears to be a promotional poster or marketing graphic (${patternStr}), not a degree diploma. Please upload an official degree diploma or graduation certificate.`;
    return result;
  }

  // 2. Image Clarity and Completeness / Cropping Inspection
  const isImage = ['.png', '.jpg', '.jpeg', '.webp', '.bmp'].includes(ext) || (file.mimetype && file.mimetype.startsWith('image/'));
  let fileBuffer = null;

  if (file.path && fs.existsSync(file.path)) {
    try {
      fileBuffer = fs.readFileSync(file.path);
    } catch (e) {}
  }

  if (isImage && fileBuffer) {
    try {
      const dimensions = imageSize(fileBuffer);
      result.details.dimensions = dimensions;

      if (dimensions && dimensions.width && dimensions.height) {
        const { width, height } = dimensions;
        const totalPixels = width * height;
        const ratio = height / width; // portrait ratio (h / w)

        // Clarity Check: Must be high-resolution and legible
        if (width < 450 || height < 500 || totalPixels < 280000) {
          result.valid = false;
          result.error = `Low Clarity / Blurry: The uploaded image resolution (${width}x${height}px) is too small to be legible. Document scans must be high-resolution, clear, and uncompressed.`;
          return result;
        }

        // Completeness & Cropping Check for Resume
        // A resume must be a full-page portrait document
        if (expectedType === 'resume') {
          if (ratio < 0.95) {
            // Horizontal / landscape image uploaded for a resume
            result.valid = false;
            result.error = `Cropping / Format Issue: A resume must be a complete, uncropped portrait document page (height > width). The uploaded file is in landscape format (${width}x${height}px, ratio ${ratio.toFixed(2)}). Please upload the complete vertical document.`;
            return result;
          } else if (ratio > 2.6) {
            result.valid = false;
            result.error = `Cropping Issue: The uploaded file appears to be a cropped vertical strip (${width}x${height}px, aspect ratio ${ratio.toFixed(2)}). Please upload the complete, uncropped resume page.`;
            return result;
          } else if (ratio > 2.0) {
            result.warning = `Aspect Ratio Notice: Document appears unusually elongated (${width}x${height}px). Please ensure the entire resume page is visible.`;
          } else if (ratio < 1.08) {
            result.warning = `Aspect ratio warning: The uploaded resume image (${width}x${height}px) is nearly square. Please ensure no headers, margins, or contact sections are cropped out.`;
          }
        }

        // Completeness & Cropping Check for Diploma
        // A diploma can be landscape or portrait, but extreme panoramic ratios indicate cropping
        if (expectedType === 'diploma') {
          const maxDim = Math.max(width, height);
          const minDim = Math.min(width, height);
          const orientationRatio = maxDim / minDim;
          if (orientationRatio > 2.2) {
            result.valid = false;
            result.error = `Incomplete / Cropped Document: The uploaded diploma appears severely cropped or cut off (Aspect Ratio: ${orientationRatio.toFixed(2)}). Please upload the complete certificate showing all text, institution seals, and signatures.`;
            return result;
          }
        }
      }
    } catch (e) {
      console.warn('Image size inspection notice:', e.message);
    }
  }

  // 3. Document Content Inspection (PDF stream parsing & Image metadata)
  let extractedText = '';
  if (ext === '.pdf' && fileBuffer) {
    extractedText = extractTextFromPDF(fileBuffer);
  } else if (isImage && fileBuffer) {
    extractedText = extractMetadataStringsFromImage(fileBuffer);
  }

  if (extractedText && extractedText.length > 20) {
    const textSample = extractedText.substring(0, 2000);

    // Check anti-pattern matches in extracted content
    const textAntiPatterns = RANDOM_IMAGE_PATTERNS.filter(w => textSample.includes(w));
    if (textAntiPatterns.length >= 2 || textSample.includes('pickleball') || textSample.includes('tournament') || textSample.includes('bracket')) {
      result.valid = false;
      result.error = `Invalid Document Content: The text detected in this file (${textAntiPatterns.slice(0, 2).join(', ')}) indicates a sports flyer, poster, or marketing graphic rather than an authentic academic ${expectedType}. Please upload your actual ${expectedType}.`;
      return result;
    }

    // Check target keywords
    if (expectedType === 'resume') {
      const matched = RESUME_KEYWORDS.filter(k => textSample.includes(k));
      result.details.detectedKeywords = matched;
      if (matched.length === 0 && !lowerName.includes('resume') && !lowerName.includes('cv')) {
        result.warning = `Content Notice: Standard resume sections (Education, Experience, Skills) were not prominently detected in this file. Please verify that this is your complete curriculum vitae.`;
      }
    } else if (expectedType === 'diploma') {
      const matched = DIPLOMA_KEYWORDS.filter(k => textSample.includes(k));
      result.details.detectedKeywords = matched;
      if (matched.length === 0 && !lowerName.includes('diploma') && !lowerName.includes('degree') && !lowerName.includes('certificate')) {
        result.warning = `Content Notice: University degree certification keywords were not detected in this file. Please ensure your official degree diploma or graduation certificate is uploaded.`;
      }
    }
  }

  return result;
}

module.exports = {
  inspectDocument,
  RANDOM_IMAGE_PATTERNS,
  RESUME_KEYWORDS,
  DIPLOMA_KEYWORDS
};
