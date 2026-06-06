import { z } from 'zod';

export const COVER_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#64748b', '#475569', '#1e293b', '#0f172a',
];

/** Max length for a typed/pasted image link (data: uploads are exempt). */
export const MAX_IMAGE_URL_LENGTH = 2048;

/** Max size for an uploaded image file. */
export const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_IMAGE_FILE_SIZE_LABEL = '5 MB';

/**
 * Image source validation, modeled on OMDB posters
 * (e.g. https://m.media-amazon.com/images/...): allow only https:// links or
 * data:image/ uploads. Blocks http:// (mixed content), javascript:, file:, etc.
 */
export const imageUrlSchema = z.string().superRefine((value, ctx) => {
  if (value === '') return; // empty = no image
  const isData = /^data:image\//i.test(value);
  const isHttps = /^https:\/\//i.test(value);
  if (!isData && !isHttps) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A imagem deve usar um link https:// ou ser enviada por upload.',
    });
    return;
  }
  if (!isData && value.length > MAX_IMAGE_URL_LENGTH) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Link muito longo (máx ${MAX_IMAGE_URL_LENGTH} caracteres).`,
    });
  }
});

/** Returns an error message if the uploaded file is invalid, or null if OK. */
export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return 'O arquivo selecionado não é uma imagem.';
  }
  if (file.size > MAX_IMAGE_FILE_SIZE) {
    return `A imagem é muito grande (máx ${MAX_IMAGE_FILE_SIZE_LABEL}).`;
  }
  return null;
}
