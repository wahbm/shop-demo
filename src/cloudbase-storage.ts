import cloudbase from '@cloudbase/js-sdk';
import { getErrorMessage } from './error-message';

export type ProductCover = {
  bucketId: string;
  path: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  visibility: 'public';
};

const DEFAULT_ENV_ID = 'ww-d9g604vycbc0aa139';
const DEFAULT_BUCKET_ID = 'public-assets';
const DEFAULT_MAX_FILE_BYTES = 20 * 1024 * 1024;
const PRODUCT_COVER_SCOPE = 'product-covers';
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const configuredMaxFileBytes = Number(import.meta.env.VITE_CLOUDBASE_MAX_FILE_BYTES || DEFAULT_MAX_FILE_BYTES);
const config = {
  envId: import.meta.env.VITE_CLOUDBASE_ENV_ID || DEFAULT_ENV_ID,
  projectId: import.meta.env.VITE_CLOUDBASE_PROJECT_ID || '',
  bucketId: import.meta.env.VITE_CLOUDBASE_PUBLIC_BUCKET || DEFAULT_BUCKET_ID,
  maxFileBytes: Number.isFinite(configuredMaxFileBytes) && configuredMaxFileBytes > 0 ? configuredMaxFileBytes : DEFAULT_MAX_FILE_BYTES,
};

let app: ReturnType<typeof cloudbase.init> | null = null;
let storageAuthPromise: Promise<void> | null = null;

function storageError(message: unknown, code: string) {
  const error = new Error(getErrorMessage(message, '商品封面上传失败，请稍后重试')) as Error & { code?: string };
  error.code = code;
  return error;
}

function safeProjectId() {
  if (!config.projectId || !/^[a-zA-Z0-9_-]+$/.test(config.projectId)) {
    throw storageError('请先配置 VITE_CLOUDBASE_PROJECT_ID，再上传商品封面', 'CONFIG_MISSING');
  }
  return config.projectId;
}

function getBucket() {
  if (!app) app = cloudbase.init({ env: config.envId });
  return app.storage.from(config.bucketId);
}

async function ensureStorageAuth() {
  if (!app) app = cloudbase.init({ env: config.envId });
  if (app.auth().hasLoginState()) return;
  if (!storageAuthPromise) {
    storageAuthPromise = (async () => {
      const { error } = await app!.auth().signInAnonymously();
      if (error) {
        const code = String((error as { code?: unknown }).code || '');
        if (code === 'login_type_disabled') {
          throw storageError('请在 CloudBase 控制台开启“匿名登录”后再上传商品封面', 'STORAGE_AUTH_REQUIRED');
        }
        throw storageError(error, 'STORAGE_AUTH_REQUIRED');
      }
    })().catch((error) => {
      storageAuthPromise = null;
      throw error;
    });
  }
  await storageAuthPromise;
}

function extensionForFile(file: File) {
  const extension = ALLOWED_IMAGE_TYPES[file.type];
  if (!extension) throw storageError('仅支持 JPG、PNG、WEBP 或 GIF 图片', 'INVALID_FILE');
  if (file.size > config.maxFileBytes) throw storageError('商品封面不能超过 20 MB', 'FILE_TOO_LARGE');
  return extension;
}

export function validateProductCover(file: File) {
  if (!file) throw storageError('请选择商品封面图片', 'INVALID_FILE');
  const extension = extensionForFile(file);
  const nameExtension = file.name.split('.').pop()?.toLowerCase();
  const allowedExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
  if (!nameExtension || !allowedExtensions.has(nameExtension)) {
    throw storageError('图片文件扩展名不受支持', 'INVALID_FILE');
  }
  return extension;
}

export async function uploadProductCover(file: File): Promise<ProductCover> {
  const extension = validateProductCover(file);
  const projectId = safeProjectId();
  await ensureStorageAuth();
  const uuid = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const path = `projects/${projectId}/${PRODUCT_COVER_SCOPE}/${uuid}.${extension}`;
  const result = await getBucket().upload(path, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
    metadata: { originalName: file.name, scope: PRODUCT_COVER_SCOPE },
  });
  if (result.error || !result.data) {
    const statusCode = String((result.error as { statusCode?: unknown } | null)?.statusCode || '');
    if (statusCode === 'MISSING_CREDENTIALS') {
      throw storageError('请在 CloudBase 控制台开启“匿名登录”后再上传商品封面', 'STORAGE_AUTH_REQUIRED');
    }
    throw storageError(result.error, 'STORAGE_UNAVAILABLE');
  }
  return {
    bucketId: config.bucketId,
    path,
    originalName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    visibility: 'public',
  };
}

export function getProductCoverUrl(cover: Pick<ProductCover, 'bucketId' | 'path'> | null | undefined) {
  if (!cover?.bucketId || !cover.path) return null;
  if (!app) app = cloudbase.init({ env: config.envId });
  return app.storage.from(cover.bucketId).getPublicUrl(cover.path).data.publicUrl;
}
