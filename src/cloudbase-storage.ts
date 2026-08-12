import { getErrorMessage } from './error-message';

export type ProductCover = {
  bucketId: 'public-assets';
  path: string;
  projectId: string;
  scope: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  visibility: 'public';
  contentUrl?: string;
  downloadUrl?: string;
};

const DEFAULT_PROXY_URL = 'https://8.130.116.192/v1';
const DEFAULT_MAX_FILE_BYTES = 20 * 1024 * 1024;
const PRODUCT_COVER_SCOPE = 'product-covers';
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const configuredMaxFileBytes = Number(import.meta.env.VITE_STORAGE_MAX_FILE_BYTES || DEFAULT_MAX_FILE_BYTES);
const config = {
  proxyUrl: String(import.meta.env.VITE_STORAGE_PROXY_URL || DEFAULT_PROXY_URL).replace(/\/$/, ''),
  projectId: String(import.meta.env.VITE_STORAGE_PROXY_PROJECT_ID || ''),
  maxFileBytes: Number.isFinite(configuredMaxFileBytes) && configuredMaxFileBytes > 0 ? configuredMaxFileBytes : DEFAULT_MAX_FILE_BYTES,
};

function storageError(message: unknown, code: string) {
  const error = new Error(getErrorMessage(message, '商品封面上传失败，请稍后重试')) as Error & { code?: string };
  error.code = code;
  return error;
}

function safeProjectId() {
  if (!config.projectId || !/^[a-zA-Z0-9_-]+$/.test(config.projectId)) {
    throw storageError('请先配置 VITE_STORAGE_PROXY_PROJECT_ID，再上传商品封面', 'CONFIG_MISSING');
  }
  return config.projectId;
}

function safeScope(scope: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(scope)) throw storageError('文件分类无效', 'INVALID_REQUEST');
  return scope;
}

function fileLocation(file: Pick<ProductCover, 'path'> & Partial<Pick<ProductCover, 'projectId' | 'scope'>>) {
  const match = file.path.match(/^projects\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)\/(.+)$/);
  const projectId = file.projectId || match?.[1];
  const scope = file.scope || match?.[2];
  const objectName = match?.[3];
  if (!projectId || !scope || !objectName || !/^[a-zA-Z0-9_-]+$/.test(projectId) || !/^[a-zA-Z0-9_-]+$/.test(scope)) {
    throw storageError('商品封面路径无效，请重新上传', 'INVALID_FILE');
  }
  return { projectId, scope, objectName };
}

function proxyFileUrl(file: Pick<ProductCover, 'path'> & Partial<Pick<ProductCover, 'projectId' | 'scope'>>, suffix = '') {
  const location = fileLocation(file);
  return `${config.proxyUrl}/files/${encodeURIComponent(location.projectId)}/${encodeURIComponent(location.scope)}/${location.objectName.split('/').map(encodeURIComponent).join('/')}${suffix}`;
}

function normalizeProxyUrl(value: string) {
  if (!value) return value;
  try {
    const url = new URL(value);
    const proxy = new URL(config.proxyUrl);
    if (url.hostname === proxy.hostname && url.port === proxy.port) url.protocol = proxy.protocol;
    return url.toString();
  } catch {
    return value;
  }
}

function normalizeStorageRef(ref: ProductCover): ProductCover {
  return { ...ref, contentUrl: normalizeProxyUrl(ref.contentUrl || proxyFileUrl(ref, '/content')), downloadUrl: normalizeProxyUrl(ref.downloadUrl || proxyFileUrl(ref, '/content?download=1')) };
}

function parseProxyResponse<T>(body: unknown, fallback: string): T {
  if (!body || typeof body !== 'object') throw storageError(fallback, 'STORAGE_UNAVAILABLE');
  const data = (body as { data?: unknown }).data;
  if (!data) {
    const error = (body as { error?: unknown }).error;
    throw storageError(error || fallback, typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : 'STORAGE_UNAVAILABLE');
  }
  return data as T;
}

async function proxyRequest<T>(path: string, options: RequestInit, fallback: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${config.proxyUrl}${path}`, options);
  } catch (error) {
    throw storageError(error, 'STORAGE_UNAVAILABLE');
  }
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const error = typeof body === 'object' && body !== null ? (body as { error?: unknown }).error : body;
    const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : 'STORAGE_UNAVAILABLE';
    throw storageError(error || fallback, code);
  }
  return parseProxyResponse<T>(body, fallback);
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
  if (!nameExtension || !new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']).has(nameExtension)) {
    throw storageError('图片文件扩展名不受支持', 'INVALID_FILE');
  }
  return extension;
}

export async function uploadPublicFile(file: File, scope: string, metadata: Record<string, string> = {}) {
  const projectId = safeProjectId();
  const form = new FormData();
  form.set('projectId', projectId);
  form.set('scope', safeScope(scope));
  form.set('file', file);
  Object.entries(metadata).forEach(([key, value]) => form.set(key, value));
  return normalizeStorageRef(await proxyRequest<ProductCover>('/files', { method: 'POST', body: form }, '文件上传失败，请稍后重试'));
}

export async function uploadProductCover(file: File): Promise<ProductCover> {
  validateProductCover(file);
  return uploadPublicFile(file, PRODUCT_COVER_SCOPE, { originalName: file.name, scope: PRODUCT_COVER_SCOPE });
}

export function getProductCoverUrl(cover: Pick<ProductCover, 'contentUrl' | 'projectId' | 'scope' | 'path'> | null | undefined) {
  if (!cover) return null;
  return normalizeProxyUrl(cover.contentUrl || proxyFileUrl(cover, '/content'));
}

export function getDownloadUrl(file: Pick<ProductCover, 'path'> & Partial<Pick<ProductCover, 'downloadUrl' | 'projectId' | 'scope'>>) {
  return normalizeProxyUrl(file.downloadUrl || proxyFileUrl(file, '/content?download=1'));
}

export async function downloadPublicFile(file: Pick<ProductCover, 'path'> & Partial<Pick<ProductCover, 'projectId' | 'scope'>>, options: { range?: string } = {}) {
  let response: Response;
  try {
    response = await fetch(proxyFileUrl(file, '/content'), { headers: options.range ? { Range: options.range } : undefined });
  } catch (error) {
    throw storageError(error, 'STORAGE_UNAVAILABLE');
  }
  if (!response.ok) throw storageError(await response.text(), response.status === 404 ? 'NOT_FOUND' : 'STORAGE_UNAVAILABLE');
  return response;
}

export async function updatePublicFile(file: ProductCover, nextFile: File, metadata: Record<string, string> = {}) {
  validateProductCover(nextFile);
  const form = new FormData();
  form.set('file', nextFile);
  Object.entries(metadata).forEach(([key, value]) => form.set(key, value));
  return normalizeStorageRef(await proxyRequest<ProductCover>(`/files/${encodeURIComponent(file.projectId)}/${encodeURIComponent(file.scope)}/${fileLocation(file).objectName.split('/').map(encodeURIComponent).join('/')}`, { method: 'PUT', body: form }, '文件更新失败，请稍后重试'));
}

export async function removePublicFile(file: Pick<ProductCover, 'projectId' | 'scope' | 'path'>) {
  const response = await fetch(proxyFileUrl(file), { method: 'DELETE' });
  if (!response.ok) throw storageError(await response.text(), 'STORAGE_UNAVAILABLE');
}

export function productCoverFromStoredFields(fields: { bucketId: string | null; path: string | null; originalName: string | null; mimeType: string | null; sizeBytes: number | null }): ProductCover | null {
  if (fields.bucketId !== 'public-assets' || !fields.path || !fields.originalName || !fields.mimeType || !fields.sizeBytes) return null;
  const location = fileLocation({ path: fields.path });
  return { bucketId: 'public-assets', path: fields.path, projectId: location.projectId, scope: location.scope, originalName: fields.originalName, mimeType: fields.mimeType, sizeBytes: Number(fields.sizeBytes), visibility: 'public' };
}
