import { Link } from 'react-router-dom';
import Footer from '../components/Footer.jsx';
import '../styles/home.css'; // footer styles
import '../styles/bag.css';

// Static cart — NeRilE is already in the bag; no quantity / delete interactions
const ITEMS = [
  {
    key: 'nerile',
    name: 'NeRilE',
    sub: 'The First Embrace',
    desc: '오드누아 오비 퍼퓸',
    option: '3.4 FL. OZ. 50ml',
    img: '/assets/f10b9.png',
    qty: 1,
    price: 128000,
  },
];

const won = (n) => `₩${n.toLocaleString('ko-KR')}`;

export default function Bag() {
  const subtotal = ITEMS.reduce((sum, item) => sum + item.price * item.qty, 0);
  const shipping = 0;

  return (
    <main className="page page-bag">
      <section className="bag-main">
        <h1 className="bag-title">Shopping Bag</h1>
        <p className="bag-count">
          장바구니 <span>{ITEMS.length}</span>
        </p>

        <div className="bag-layout">
          <ul className="bag-list">
            <li className="bag-head" aria-hidden="true">
              <span>상품 정보</span>
              <span>수량</span>
              <span>금액</span>
            </li>
            {ITEMS.map((item) => (
              <li key={item.key} className="bag-item">
                <div className="bag-product">
                  <div className="bag-thumb">
                    <img src={item.img} alt={item.name} />
                  </div>
                  <div className="bag-info">
                    <p className="bag-name">{item.name}</p>
                    <p className="bag-sub">{item.sub}</p>
                    <p className="bag-desc">{item.desc}</p>
                    <p className="bag-option">{item.option}</p>
                  </div>
                </div>
                <span className="bag-qty">{item.qty}</span>
                <span className="bag-price">{won(item.price * item.qty)}</span>
              </li>
            ))}
          </ul>

          <aside className="bag-summary">
            <p className="bag-summary-title">주문 요약</p>
            <dl>
              <div>
                <dt>상품 금액</dt>
                <dd>{won(subtotal)}</dd>
              </div>
              <div>
                <dt>배송비</dt>
                <dd>{shipping ? won(shipping) : '무료'}</dd>
              </div>
              <div className="bag-total">
                <dt>총 결제 금액</dt>
                <dd>{won(subtotal + shipping)}</dd>
              </div>
            </dl>
            <button type="button" className="bag-order">
              주문하기
            </button>
            <Link to="/product" className="bag-continue">
              쇼핑 계속하기
            </Link>
          </aside>
        </div>
      </section>
      <Footer />
    </main>
  );
}
