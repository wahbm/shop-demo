import { StrictMode, createContext, useContext, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Address, api, CartItem, money, Product, User } from './api';
import { AdminApp } from './admin';
import './styles.css';
import './address.css';

type AppContext = { user: User | null; authReady: boolean; refreshUser: () => Promise<void>; cartCount: number; refreshCart: () => Promise<void> };
type Region = { name: string; cities: { name: string; districts: string[] }[] };
type AddressFormState = { recipient: string; phone: string; province: string; city: string; district: string; detail: string; isDefault: boolean };

const regions: Region[] = [
  { name: '北京市', cities: [{ name: '北京市', districts: ['东城区', '西城区', '朝阳区', '海淀区', '丰台区', '通州区', '昌平区'] }] },
  { name: '天津市', cities: [{ name: '天津市', districts: ['和平区', '河东区', '河西区', '南开区', '河北区', '滨海新区'] }] },
  { name: '河北省', cities: [{ name: '石家庄市', districts: ['长安区', '桥西区', '新华区', '裕华区'] }, { name: '唐山市', districts: ['路南区', '路北区', '丰润区'] }, { name: '保定市', districts: ['竞秀区', '莲池区', '满城区'] }] },
  { name: '山西省', cities: [{ name: '太原市', districts: ['小店区', '迎泽区', '杏花岭区', '万柏林区'] }, { name: '大同市', districts: ['平城区', '云冈区'] }] },
  { name: '内蒙古自治区', cities: [{ name: '呼和浩特市', districts: ['新城区', '回民区', '玉泉区', '赛罕区'] }, { name: '包头市', districts: ['昆都仑区', '青山区', '东河区'] }] },
  { name: '辽宁省', cities: [{ name: '沈阳市', districts: ['和平区', '沈河区', '皇姑区', '铁西区'] }, { name: '大连市', districts: ['中山区', '西岗区', '沙河口区', '甘井子区'] }] },
  { name: '吉林省', cities: [{ name: '长春市', districts: ['南关区', '宽城区', '朝阳区', '绿园区'] }, { name: '吉林市', districts: ['船营区', '昌邑区', '龙潭区'] }] },
  { name: '黑龙江省', cities: [{ name: '哈尔滨市', districts: ['道里区', '南岗区', '道外区', '香坊区'] }, { name: '齐齐哈尔市', districts: ['龙沙区', '建华区', '铁锋区'] }] },
  { name: '上海市', cities: [{ name: '上海市', districts: ['黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '闵行区', '浦东新区'] }] },
  { name: '江苏省', cities: [{ name: '南京市', districts: ['玄武区', '秦淮区', '建邺区', '鼓楼区', '栖霞区'] }, { name: '苏州市', districts: ['姑苏区', '虎丘区', '吴中区', '相城区'] }, { name: '无锡市', districts: ['梁溪区', '滨湖区', '新吴区'] }] },
  { name: '浙江省', cities: [{ name: '杭州市', districts: ['上城区', '拱墅区', '西湖区', '滨江区', '余杭区'] }, { name: '宁波市', districts: ['海曙区', '江北区', '鄞州区'] }, { name: '温州市', districts: ['鹿城区', '龙湾区', '瓯海区'] }] },
  { name: '安徽省', cities: [{ name: '合肥市', districts: ['瑶海区', '庐阳区', '蜀山区', '包河区'] }, { name: '芜湖市', districts: ['镜湖区', '弋江区', '鸠江区'] }] },
  { name: '福建省', cities: [{ name: '福州市', districts: ['鼓楼区', '台江区', '仓山区', '晋安区'] }, { name: '厦门市', districts: ['思明区', '湖里区', '集美区', '海沧区'] }] },
  { name: '江西省', cities: [{ name: '南昌市', districts: ['东湖区', '西湖区', '青云谱区', '青山湖区'] }, { name: '赣州市', districts: ['章贡区', '南康区'] }] },
  { name: '山东省', cities: [{ name: '济南市', districts: ['历下区', '市中区', '槐荫区', '历城区'] }, { name: '青岛市', districts: ['市南区', '市北区', '黄岛区', '崂山区'] }] },
  { name: '河南省', cities: [{ name: '郑州市', districts: ['中原区', '二七区', '金水区', '管城回族区'] }, { name: '洛阳市', districts: ['老城区', '西工区', '涧西区'] }] },
  { name: '湖北省', cities: [{ name: '武汉市', districts: ['江岸区', '江汉区', '硚口区', '武昌区', '洪山区'] }, { name: '宜昌市', districts: ['西陵区', '伍家岗区', '点军区'] }] },
  { name: '湖南省', cities: [{ name: '长沙市', districts: ['芙蓉区', '天心区', '岳麓区', '开福区', '雨花区'] }, { name: '株洲市', districts: ['荷塘区', '芦淞区', '石峰区'] }] },
  { name: '广东省', cities: [{ name: '广州市', districts: ['越秀区', '海珠区', '天河区', '白云区', '番禺区'] }, { name: '深圳市', districts: ['罗湖区', '福田区', '南山区', '宝安区', '龙岗区'] }, { name: '佛山市', districts: ['禅城区', '南海区', '顺德区'] }] },
  { name: '广西壮族自治区', cities: [{ name: '南宁市', districts: ['兴宁区', '青秀区', '江南区', '西乡塘区'] }, { name: '桂林市', districts: ['秀峰区', '叠彩区', '象山区'] }] },
  { name: '海南省', cities: [{ name: '海口市', districts: ['秀英区', '龙华区', '琼山区', '美兰区'] }, { name: '三亚市', districts: ['吉阳区', '天涯区', '崖州区'] }] },
  { name: '重庆市', cities: [{ name: '重庆市', districts: ['渝中区', '江北区', '沙坪坝区', '九龙坡区', '南岸区', '渝北区'] }] },
  { name: '四川省', cities: [{ name: '成都市', districts: ['锦江区', '青羊区', '金牛区', '武侯区', '成华区'] }, { name: '绵阳市', districts: ['涪城区', '游仙区'] }] },
  { name: '贵州省', cities: [{ name: '贵阳市', districts: ['南明区', '云岩区', '花溪区', '观山湖区'] }, { name: '遵义市', districts: ['红花岗区', '汇川区'] }] },
  { name: '云南省', cities: [{ name: '昆明市', districts: ['五华区', '盘龙区', '官渡区', '西山区'] }, { name: '大理白族自治州', districts: ['大理市'] }] },
  { name: '西藏自治区', cities: [{ name: '拉萨市', districts: ['城关区', '堆龙德庆区'] }] },
  { name: '陕西省', cities: [{ name: '西安市', districts: ['新城区', '碑林区', '莲湖区', '雁塔区', '未央区'] }, { name: '咸阳市', districts: ['秦都区', '渭城区'] }] },
  { name: '甘肃省', cities: [{ name: '兰州市', districts: ['城关区', '七里河区', '西固区', '安宁区'] }, { name: '天水市', districts: ['秦州区', '麦积区'] }] },
  { name: '青海省', cities: [{ name: '西宁市', districts: ['城东区', '城中区', '城西区', '城北区'] }] },
  { name: '宁夏回族自治区', cities: [{ name: '银川市', districts: ['兴庆区', '西夏区', '金凤区'] }] },
  { name: '新疆维吾尔自治区', cities: [{ name: '乌鲁木齐市', districts: ['天山区', '沙依巴克区', '新市区', '水磨沟区'] }, { name: '喀什地区', districts: ['喀什市'] }] },
  { name: '台湾省', cities: [{ name: '台北市', districts: ['中正区', '大安区', '信义区'] }] },
  { name: '香港特别行政区', cities: [{ name: '香港特别行政区', districts: ['中西区', '湾仔区', '九龙城区', '沙田区'] }] },
  { name: '澳门特别行政区', cities: [{ name: '澳门特别行政区', districts: ['花地玛堂区', '大堂区', '风顺堂区'] }] },
];

const Context = createContext<AppContext>(null!);
const useApp = () => useContext(Context);
const emptyAddressForm = (): AddressFormState => ({ recipient: '', phone: '', province: '', city: '', district: '', detail: '', isDefault: true });

function Notice({ message }: { message: string }) { return <p className="notice" role="alert">{message}</p>; }

function Header() {
  const { user, refreshUser, cartCount } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const logout = async () => { await api('/auth/logout', { method: 'POST' }); await refreshUser(); navigate('/'); };

  return <header><div className="topbar">
    <Link className="brand" to="/">微光集市</Link>
    <nav aria-label="主导航">
      <Link to="/products">全部商品</Link>
      <div id="account-menu" className="account-menu" data-testid="account-menu">
        <button className="account-menu-trigger" type="button" aria-haspopup="true">账户中心 <span aria-hidden="true">⌄</span></button>
        <div className="account-menu-panel">
          <Link id="account-menu-orders" data-testid="account-menu-orders" to="/orders">我的订单</Link>
          <Link id="account-menu-addresses" data-testid="account-menu-addresses" to="/account/addresses">地址簿</Link>
        </div>
      </div>
    </nav>
    <form className="search" onSubmit={(event) => { event.preventDefault(); navigate(`/products?q=${encodeURIComponent(query)}`); }}>
      <label className="sr-only" htmlFor="search-input">搜索商品</label>
      <input id="search-input" name="query" data-testid="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索你想要的好物" />
      <button id="search-submit" data-testid="search-submit">搜索</button>
    </form>
    <Link id="cart-link" className="cart-link" data-testid="cart-link" to="/cart">购物车 <b>{cartCount}</b></Link>
    {user ? <div className="user-actions"><span id="user-phone" data-testid="user-phone">{user.phone}</span><button id="logout-button" className="link-button" onClick={logout}>退出登录</button></div> : <Link id="login-link" data-testid="login-link" to="/login">登录 / 注册</Link>}
  </div></header>;
}

function Layout({ children }: { children: React.ReactNode }) { return <><Header /><main>{children}</main><footer>微光集市 · 稳定的本地自动化测试演示商城</footer></>; }
function useProducts(query = '') { const [products, setProducts] = useState<Product[]>([]); useEffect(() => { api<{ products: Product[] }>(`/products${query}`).then((result) => setProducts(result.products)); }, [query]); return products; }
function ProductCard({ product }: { product: Product }) { return <article id={`product-card-${product.id}`} className="product-card" data-testid={`product-card-${product.id}`}><Link to={`/products/${product.id}`}><div className="product-emoji">{product.emoji}</div><span className="category">{product.categoryName}</span><h3>{product.name}</h3><p>{product.description}</p><strong>{money(product.price)}</strong></Link></article>; }

function Home() {
  const products = useProducts();
  const [categories, setCategories] = useState<any[]>([]);
  useEffect(() => { api<{ categories: any[] }>('/categories').then((result) => setCategories(result.categories)); }, []);
  return <><section className="hero"><div><span>LOCAL SHOP DEMO</span><h1>把自动化测试，做得稳定又好看。</h1><p>完整购物链路、固定数据、无外部依赖。</p><Link className="primary" to="/products">开始挑选</Link></div><div className="hero-orb">✦</div></section><section><div className="section-title"><h2>分类探索</h2><Link to="/products">查看全部</Link></div><div className="category-grid">{categories.map((category) => <Link key={category.id} id={`category-${category.id}`} data-testid={`category-${category.id}`} to={`/products?categoryId=${category.id}`}>{category.name}</Link>)}</div></section><section><div className="section-title"><h2>精选好物</h2><span>24 件固定种子商品</span></div><div className="product-grid">{products.slice(0, 8).map((product) => <ProductCard product={product} key={product.id} />)}</div></section></>;
}

function Products() {
  const [params] = useSearchParams();
  const query = params.get('q') || '';
  const categoryId = params.get('categoryId') || '';
  const products = useProducts(`?q=${encodeURIComponent(query)}${categoryId ? `&categoryId=${categoryId}` : ''}`);
  return <section><div className="page-heading"><p>商品目录</p><h1>{query ? `“${query}” 的搜索结果` : '发现日常好物'}</h1></div>{products.length ? <div className="product-grid">{products.map((product) => <ProductCard product={product} key={product.id} />)}</div> : <div id="empty-search" className="empty" data-testid="empty-search">没有找到匹配商品，换个关键词试试。</div>}</section>;
}

function Auth({ mode }: { mode: 'login' | 'register' }) {
  const { refreshUser } = useApp();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [form, setForm] = useState({ phone: '', password: '', confirmPassword: '', captcha: '', name: '' });
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setError(''); try { await api(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(form) }); await refreshUser(); navigate('/'); } catch (err: any) { setError(err.message); } };
  return <div className="auth-wrap"><form className="auth-card" onSubmit={submit}><p className="eyebrow">微光集市</p><h1>{mode === 'login' ? '欢迎回来' : '创建新账号'}</h1><p>{mode === 'login' ? '使用演示账号体验完整下单流程。' : '注册后即可开始你的购物练习。'}</p>{mode === 'register' && <label>昵称<input id="register-name" name="name" data-testid="register-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="例如：小光" /></label>}<label>手机号码<input id="phone-input" name="phone" data-testid="phone-input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="11 位手机号码" /></label><label>密码<input id="password-input" name="password" data-testid="password-input" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="至少 6 位" /></label>{mode === 'register' && <label>确认密码<input id="confirm-password-input" name="confirmPassword" data-testid="confirm-password-input" type="password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} /></label>}<label>验证码 <span className="captcha">固定验证码：1234</span><input id="captcha-input" name="captcha" data-testid="captcha-input" value={form.captcha} onChange={(event) => setForm({ ...form, captcha: event.target.value })} placeholder="请输入 1234" /></label>{error && <Notice message={error} />}<button id={mode === 'login' ? 'login-submit' : 'register-submit'} className="primary wide" data-testid={mode === 'login' ? 'login-submit' : 'register-submit'}>{mode === 'login' ? '登 录' : '同意协议并注册'}</button><p>{mode === 'login' ? <>还没有账号？<Link to="/register">立即注册</Link></> : <>已有账号？<Link to="/login">去登录</Link></>}</p><small>演示账号：13800000000 / Demo1234</small></form></div>;
}

function ProductDetail() {
  const id = Number(useLocation().pathname.split('/').pop());
  const [product, setProduct] = useState<Product | null>(null);
  const { user, refreshCart } = useApp();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [quantity, setQuantity] = useState(1);
  useEffect(() => { api<Product>(`/products/${id}`).then(setProduct).catch((error) => setMessage(error.message)); }, [id]);
  if (!product) return <div className="empty">{message || '正在加载商品…'}</div>;
  const add = async () => { if (!user) return navigate('/login'); try { await api('/cart', { method: 'POST', body: JSON.stringify({ productId: product.id, quantity }) }); await refreshCart(); setMessage('已加入购物车'); } catch (error: any) { setMessage(error.message); } };
  return <section className="detail"><div className="detail-emoji">{product.emoji}</div><div><span className="category">{product.categoryName}</span><h1>{product.name}</h1><p className="detail-desc">{product.description}</p><strong className="price">{money(product.price)}</strong><p>剩余库存：<b id="product-stock" data-testid="product-stock">{product.stock}</b></p><label>购买数量 <input id="quantity-input" name="quantity" data-testid="quantity-input" type="number" min="1" max={product.stock} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label><button id="add-to-cart" className="primary" data-testid="add-to-cart" onClick={add}>加入购物车</button>{message && <Notice message={message} />}</div></section>;
}

function RequireAuth({ children }: { children: React.ReactNode }) { const { user, authReady } = useApp(); const location = useLocation(); if (!authReady) return <div className="empty">正在加载账户信息…</div>; return user ? <>{children}</> : <Navigate to="/login" state={{ from: location.pathname }} replace />; }

function Cart() {
  const { refreshCart } = useApp();
  const [items, setItems] = useState<CartItem[]>([]);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const load = () => api<{ items: CartItem[] }>('/cart').then((result) => setItems(result.items)).catch((error) => setMessage(error.message));
  useEffect(() => { load(); }, []);
  const update = async (item: CartItem, quantity: number) => { try { await api(`/cart/${item.productId}`, { method: 'PATCH', body: JSON.stringify({ quantity }) }); await load(); await refreshCart(); } catch (error: any) { setMessage(error.message); } };
  const remove = async (id: number) => { await api(`/cart/${id}`, { method: 'DELETE' }); await load(); await refreshCart(); };
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return <section><div className="page-heading"><p>购物车</p><h1>准备结算的好物</h1></div>{message && <Notice message={message} />}{!items.length ? <div id="empty-cart" className="empty" data-testid="empty-cart">购物车还是空的。<Link to="/products">去逛逛</Link></div> : <><div className="cart-list">{items.map((item) => <article id={`cart-item-${item.productId}`} className="cart-item" key={item.productId} data-testid={`cart-item-${item.productId}`}><span className="cart-emoji">{item.emoji}</span><div><h3>{item.name} {!item.is_active && <small className="cart-unavailable">已下架</small>}</h3><strong>{money(item.price)}</strong></div><label>数量<input id={`cart-quantity-${item.productId}`} name={`cart-quantity-${item.productId}`} data-testid={`cart-quantity-${item.productId}`} type="number" min="1" max={item.stock} value={item.quantity} disabled={!item.is_active} onChange={(event) => update(item, Number(event.target.value))} /></label><button className="text-danger" onClick={() => remove(item.productId)}>删除</button></article>)}</div><div className="total-bar"><span>合计 <b id="cart-total" data-testid="cart-total">{money(total)}</b></span><button id="checkout-button" className="primary" data-testid="checkout-button" onClick={() => navigate('/checkout')}>去结算</button></div></>}</section>;
}

function addressPayload(form: AddressFormState) {
  return { ...form, detail: [form.province, form.city, form.district, form.detail.trim()].join(' ') };
}

function addressFormFromAddress(address: Address): AddressFormState {
  const province = regions.find((region) => address.detail.startsWith(region.name));
  const city = province?.cities.find((item) => address.detail.startsWith(`${province.name} ${item.name}`));
  const district = city?.districts.find((item) => address.detail.startsWith(`${province!.name} ${city.name} ${item}`));
  const prefix = province && city && district ? `${province.name} ${city.name} ${district}` : '';
  return { recipient: address.recipient, phone: address.phone, province: province?.name || '', city: city?.name || '', district: district || '', detail: prefix ? address.detail.slice(prefix.length).trim() : address.detail, isDefault: Boolean(address.is_default) };
}

function AddressFields({ form, setForm }: { form: AddressFormState; setForm: React.Dispatch<React.SetStateAction<AddressFormState>> }) {
  const cities = regions.find((region) => region.name === form.province)?.cities || [];
  const districts = cities.find((city) => city.name === form.city)?.districts || [];
  return <><label>收货人<input id="address-recipient" name="recipient" data-testid="address-recipient" value={form.recipient} onChange={(event) => setForm({ ...form, recipient: event.target.value })} /></label><label>手机号码<input id="address-phone" name="phone" data-testid="address-phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label><label>收货地区<div className="region-selects"><select id="address-province" name="province" data-testid="address-province" aria-label="省份" required value={form.province} onChange={(event) => setForm({ ...form, province: event.target.value, city: '', district: '' })}><option value="" disabled>请选择省份</option>{regions.map((region) => <option key={region.name} value={region.name}>{region.name}</option>)}</select><select id="address-city" name="city" data-testid="address-city" aria-label="城市" required disabled={!form.province} value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value, district: '' })}><option value="" disabled>请选择城市</option>{cities.map((city) => <option key={city.name} value={city.name}>{city.name}</option>)}</select><select id="address-district" name="district" data-testid="address-district" aria-label="区县" required disabled={!form.city} value={form.district} onChange={(event) => setForm({ ...form, district: event.target.value })}><option value="" disabled>请选择区县</option>{districts.map((district) => <option key={district} value={district}>{district}</option>)}</select></div></label><label>详细地址<textarea id="address-detail" name="detail" data-testid="address-detail" placeholder="街道、门牌号、楼栋和房间号" value={form.detail} onChange={(event) => setForm({ ...form, detail: event.target.value })} /></label><label className="checkbox"><input name="isDefault" type="checkbox" checked={form.isDefault} onChange={(event) => setForm({ ...form, isDefault: event.target.checked })} />设为默认地址</label></>;
}

function AddressPicker({ onSelect }: { onSelect: (id: number) => void }) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState<AddressFormState>(emptyAddressForm);
  const [error, setError] = useState('');
  const load = () => api<{ addresses: Address[] }>('/addresses').then((result) => setAddresses(result.addresses));
  useEffect(() => { load(); }, []);
  const save = async (event: React.FormEvent) => { event.preventDefault(); try { await api('/addresses', { method: 'POST', body: JSON.stringify(addressPayload(form)) }); setForm(emptyAddressForm()); setError(''); await load(); } catch (err: any) { setError(err.message); } };
  return <div className="addresses"><div className="address-list">{addresses.map((address) => <button key={address.id} id={`address-${address.id}`} data-testid={`address-${address.id}`} className="address selectable" onClick={() => onSelect(address.id)}><b>{address.recipient} · {address.phone}</b><span>{address.detail}</span>{address.is_default ? <small>默认地址</small> : null}</button>)} {!addresses.length && <div className="empty">还没有地址，请先新增。</div>}</div><form className="address-form" onSubmit={save}><h2>新增收货地址</h2><AddressFields form={form} setForm={setForm} />{error && <Notice message={error} />}<button id="add-address" data-testid="add-address" className="primary">保存地址</button></form></div>;
}

function AccountLayout({ active, children }: { active: 'orders' | 'addresses'; children: React.ReactNode }) {
  return <section className="account-page"><aside className="account-sidebar"><h2>账户中心</h2><Link className={active === 'orders' ? 'active' : ''} to="/orders">我的订单</Link><Link className={active === 'addresses' ? 'active' : ''} to="/account/addresses">地址簿</Link></aside><div className="account-content">{children}</div></section>;
}

function AddressPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState<AddressFormState>(emptyAddressForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [error, setError] = useState('');
  const load = () => api<{ addresses: Address[] }>('/addresses').then((result) => setAddresses(result.addresses));
  useEffect(() => { load(); }, []);
  const openCreate = () => { setEditingId(null); setForm(emptyAddressForm()); setError(''); setEditorOpen(true); };
  const openEdit = (address: Address) => { setEditingId(address.id); setForm(addressFormFromAddress(address)); setError(''); setEditorOpen(true); };
  const save = async (event: React.FormEvent) => { event.preventDefault(); try { await api(editingId ? `/addresses/${editingId}` : '/addresses', { method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(addressPayload(form)) }); await load(); setEditorOpen(false); setEditingId(null); setForm(emptyAddressForm()); } catch (err: any) { setError(err.message); } };
  const remove = async (id: number) => { try { await api(`/addresses/${id}`, { method: 'DELETE' }); await load(); } catch (err: any) { setError(err.message); } };
  const makeDefault = async (address: Address) => { try { await api(`/addresses/${address.id}`, { method: 'PATCH', body: JSON.stringify({ ...address, isDefault: true }) }); await load(); } catch (err: any) { setError(err.message); } };
  return <AccountLayout active="addresses"><div className="account-heading"><div><p>账户设置</p><h1>地址管理</h1></div><button id="new-address-button" data-testid="new-address-button" className="text-link" onClick={openCreate}>添加新地址</button></div>{error && <Notice message={error} />}<div className="address-table-wrap"><table className="address-table"><thead><tr><th>收货人</th><th>收货地址</th><th>联系电话</th><th>操作</th></tr></thead><tbody>{addresses.map((address) => <tr key={address.id} id={`address-row-${address.id}`} data-testid={`address-row-${address.id}`}><td>{address.recipient}{address.is_default ? <small className="default-badge">默认</small> : null}</td><td>{address.detail}</td><td>{address.phone}</td><td className="address-actions"><button id={`edit-address-${address.id}`} data-testid={`edit-address-${address.id}`} onClick={() => openEdit(address)}>编辑</button>{!address.is_default && <button id={`set-default-address-${address.id}`} data-testid={`set-default-address-${address.id}`} onClick={() => makeDefault(address)}>设为默认</button>}<button id={`delete-address-${address.id}`} data-testid={`delete-address-${address.id}`} className="text-danger" onClick={() => remove(address.id)}>删除</button></td></tr>)}</tbody></table>{!addresses.length && <div className="empty">还没有地址，点击右上角添加新地址。</div>}<p className="address-count">已保存 <b>{addresses.length}</b> 条地址。</p></div>{editorOpen && <form className="address-editor" onSubmit={save}><div className="editor-heading"><h2>{editingId ? '编辑收货地址' : '新增收货地址'}</h2><button id="cancel-address-edit" type="button" onClick={() => setEditorOpen(false)}>取消</button></div><AddressFields form={form} setForm={setForm} /><button id="save-address" data-testid="save-address" className="primary">{editingId ? '保存修改' : '保存地址'}</button></form>}</AccountLayout>;
}

function Checkout() {
  const navigate = useNavigate();
  const [addressId, setAddressId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const checkout = async () => { try { const result = await api<{ order: { id: number; orderNo: string } }>('/checkout', { method: 'POST', body: JSON.stringify({ addressId }) }); navigate(`/orders?created=${result.order.orderNo}`); } catch (error: any) { setMessage(error.message); } };
  return <section><div className="page-heading"><p>确认订单</p><h1>选择收货地址</h1></div><p>点击一张地址卡片后，使用本地模拟支付完成下单。</p><AddressPicker onSelect={setAddressId} />{message && <Notice message={message} />}<div className="total-bar"><span>{addressId ? '已选择收货地址' : '请选择地址'}</span><button id="pay-button" className="primary" data-testid="pay-button" disabled={!addressId} onClick={checkout}>模拟支付并下单</button></div></section>;
}

function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [params] = useSearchParams();
  useEffect(() => { api<{ orders: any[] }>('/orders').then((result) => setOrders(result.orders)); }, []);
  return <AccountLayout active="orders"><div className="page-heading"><p>交易中心</p><h1>我的订单</h1></div>{params.get('created') && <Notice message={`订单 ${params.get('created')} 已支付成功`} />}<div className="order-list">{orders.map((order) => <article id={`order-${order.order_no}`} className="order" key={order.id} data-testid={`order-${order.order_no}`}><div><span>{order.order_no}</span><h3>{order.status}</h3></div><strong>{money(order.total)}</strong><small>{new Date(order.created_at).toLocaleString('zh-CN')}</small></article>)}</div></AccountLayout>;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const refreshUser = async () => { try { const result = await api<{ user: User | null }>('/auth/me'); setUser(result.user); } finally { setAuthReady(true); } };
  const refreshCart = async () => { try { const result = await api<{ items: CartItem[] }>('/cart'); setCartCount(result.items.reduce((sum, item) => sum + item.quantity, 0)); } catch { setCartCount(0); } };
  useEffect(() => { refreshUser(); }, []);
  useEffect(() => { refreshCart(); }, [user?.id]);
  return <Context.Provider value={{ user, authReady, refreshUser, cartCount, refreshCart }}><Layout><Routes><Route path="/" element={<Home />} /><Route path="/login" element={<Auth mode="login" />} /><Route path="/register" element={<Auth mode="register" />} /><Route path="/products" element={<Products />} /><Route path="/products/:id" element={<ProductDetail />} /><Route path="/cart" element={<RequireAuth><Cart /></RequireAuth>} /><Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} /><Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} /><Route path="/account/addresses" element={<RequireAuth><AddressPage /></RequireAuth>} /></Routes></Layout></Context.Provider>;
}

createRoot(document.getElementById('root')!).render(<StrictMode>{window.location.pathname.startsWith('/admin') ? <AdminApp /> : <BrowserRouter><App /></BrowserRouter>}</StrictMode>);
