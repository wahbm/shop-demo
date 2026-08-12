export type Product = { id: number; category_id: number; categoryName: string; name: string; description: string; price: number; stock: number; emoji: string; is_active: number };
export type User = { id: number; phone: string; name: string };
export type CartItem = { productId: number; quantity: number; name: string; price: number; stock: number; emoji: string; is_active: number };
export type Address = { id: number; recipient: string; phone: string; detail: string; is_default: number };

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${import.meta.env.BASE_URL}api${path}`, { credentials: 'include', headers: { 'content-type': 'application/json', ...(options.headers || {}) }, ...options });
  const contentType = response.headers.get('content-type') || '';
  const body = (contentType.includes('application/json')
    ? await response.json()
    : { message: (await response.text()).trim() || '请求失败，请稍后再试' }) as T & { message?: string };
  if (!response.ok) throw new Error(body.message || '请求失败，请稍后再试');
  return body;
}
export const money = (value: number) => `¥${value.toFixed(2)}`;
