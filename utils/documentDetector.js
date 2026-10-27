/**
 * AVIORA EDUCATION - DOCUMENT DETECTION & VERIFICATION ENGINE
 * Free tool for automatically detecting whether uploaded requirements are valid,
 * clear, complete (not cropped or cut off), and matching the required document types (Resume vs Diploma).
 */

const fs = require('fs');
const path = require('path');
const { imageSize } = require('image-size');
const { createWorker } = require('tesseract.js');
const { PDFParse } = require('pdf-parse');

// Shared Tesseract Worker instance for fast, reusable OCR processing
let tesseractWorker = null;
let isInitializingWorker = false;

async function getWorker() {
  if (tesseractWorker) return tesseractWorker;
  if (isInitializingWorker) {
    while (isInitializingWorker) {
      await new Promise(r => setTimeout(r, 100));
    }
    if (tesseractWorker) return tesseractWorker;
  }
  isInitializingWorker = true;
  try {
    tesseractWorker = await createWorker('eng');
    return tesseractWorker;
  } catch (err) {
    console.warn('Could not initialize Tesseract worker:', err.message);
    return null;
  } finally {
    isInitializingWorker = false;
  }
}

// Anti-patterns that identify random non-document graphics, flyers, and sports posters
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
 * Detect text from PDF buffer
 */
async function extractTextFromPDF(buffer) {
  try {
    const parser = new PDFParse(new Uint8Array(buffer));
    await parser.load();
    const result = await parser.getText();
    return (result && result.text) ? result.text.toLowerCase() : '';
  } catch (err) {
    console.warn('PDF text extraction notice:', err.message);
    return '';
  }
}

/**
 * Detect text from Image file via Tesseract OCR
 */
async function extractTextFromImage(filePath) {
  try {
    const worker = await getWorker();
    if (!worker) return '';
    const ret = await worker.recognize(filePath);
    return (ret && ret.data && ret.data.text) ? ret.data.text.toLowerCase() : '';
  } catch (err) {
    console.warn('Image OCR notice:', err.message);
    return '';
  }
}

/**
 * Analyze an uploaded document for:
 * 1. Document classification (Resume vs Diploma vs Random Image)
 * 2. Clarity (Resolution & sharpness)
 * 3. Completeness & Cropping (Aspect ratio and orientation)
 *
 * @param {Object} file - Multer file object or { path, originalname, mimetype, size }
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

  // 1. Check filename for obvious random image / poster anti-patterns
  const matchedAntiPatterns = RANDOM_IMAGE_PATTERNS.filter(pattern => lowerName.includes(pattern));
  if (matchedAntiPatterns.length > 0) {
    const patternStr = matchedAntiPatterns.slice(0, 2).join(' / ');
    result.valid = false;
    result.error = expectedType === 'resume'
      ? `The uploaded file ("${file.originalname}") appears to be a promotional poster or graphic (${patternStr}), not an applicant resume/CV. Please upload an official resume or curriculum vitae.`
      : `The uploaded file ("${file.originalname}") appears to be a promotional poster or marketing graphic (${patternStr}), not a degree diploma. Please upload an official degree diploma or graduation certificate.`;
    return result;
  }

  // 2. Image clarity and completeness (dimensions, aspect ratio, cropping)
  const isImage = ['.png', '.jpg', '.jpeg', '.webp', '.bmp'].includes(ext) || (file.mimetype && file.mimetype.startsWith('image/'));
  let dimensions = null;

  if (isImage && file.path && fs.existsSync(file.path)) {
    try {
      const buffer = fs.readFileSync(file.path);
      dimensions = imageSize(buffer);
      result.details.dimensions = dimensions;

      if (dimensions && dimensions.width && dimensions.height) {
        const { width, height } = dimensions;
        const totalPixels = width * height;
        const ratio = height / width; // portrait ratio (h/w)

        // Clarity Check: Must be sufficiently high resolution to be legible
        if (width < 450 || height < 500 || totalPixels < 280000) {
          result.valid = false;
          result.error = `Low Clarity / Blurry: The uploaded image resolution (${width}x${height}px) is too small to be legible. Document scans must be high-resolution, clear, and uncompressed.`;
          return result;
        }

        // Completeness & Cropping Check for Resume
        // A resume must be a full-page, vertical portrait document (Letter/A4 standard ratio ~ 1.25 to 1.5)
        if (expectedType === 'resume') {
          if (ratio < 0.95) {
            // Horizontal / landscape image uploaded for a resume
            result.valid = false;
            result.error = `Cropping / Format Issue: A resume must be a complete, uncropped portrait document page (height > width). The uploaded file is in landscape format (${width}x${height}px, ratio ${ratio.toFixed(2)}). Please upload the complete vertical document.`;
            return result;
          } else if (ratio < 1.08) {
            result.warning = `Aspect ratio warning: The uploaded resume image (${width}x${height}px) is nearly square. Please ensure no headers, margins, or contact sections are cropped out.`;
          } else if (ratio > 2.6) {
            result.valid = false;
            result.error = `Cropping Issue: The uploaded file appears to be a cropped vertical strip (${width}x${height}px, aspect ratio ${ratio.toFixed(2)}). Please upload the complete, uncropped resume page.`;
            return result;
          } else if (ratio > 2.0) {
            result.warning = `Aspect Ratio Notice: Document appears unusually elongated (${width}x${height}px). Please ensure the entire resume page is visible.`;
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

  // 3. Document Content Verification via OCR (for Images) or PDF Text Parsing
  let extractedText = '';
  if (ext === '.pdf' && file.path && fs.existsSync(file.path)) {
    try {
      const buffer = fs.readFileSync(file.path);
      extractedText = await extractTextFromPDF(buffer);
    } catch (e) {}
  } else if (isImage && file.path && fs.existsSync(file.path)) {
    try {
      extractedText = await extractTextFromImage(file.path);
    } catch (e) {}
  }

  // If text was extracted, verify content alignment with expected document type
  if (extractedText && extractedText.length > 20) {
    const textSample = extractedText.substring(0, 1500);

    // Check anti-pattern matches in extracted text
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
  } else if (isImage && (!extractedText || extractedText.trim().length < 20) && !result.warning) {
    result.warning = `Legibility Notice: Minimal text was detected via OCR in this image. Please verify that this is a clear, legible scan of your ${expectedType === 'resume' ? 'Resume / CV' : 'Degree Diploma'}.`;
  }

  return result;
}

module.exports = {
  inspectDocument,
  RANDOM_IMAGE_PATTERNS,
  RESUME_KEYWORDS,
  DIPLOMA_KEYWORDS
};
