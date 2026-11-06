import { Link } from "@tanstack/react-router";
import { useCart } from "@/lib/cart-context";
import { IconArrowBack, IconCart, IconLeaf, NawatMark } from "./icons";

function toArabicDigits(value: number): string {
  return value.toLocaleString("ar-EG");
}

export function StoreLogoCompact() {
  return (
    <span className="nw-store-logo">
      <span className="nw-store-logo__tile" aria-hidden="true">
        <IconLeaf size={20} color="#fff" strokeWidth={1.8} />
      </span>
      <b>الوادي الأخضر</b>
    </span>
  );
}

function CartButton() {
  const { totalCount } = useCart();
  return (
    <Link
      to="/cart"
      className="nw-cart-button"
      aria-label={totalCount ? `السلة، ${totalCount} عناصر` : "السلة"}
    >
      <IconCart size={20} aria-hidden="true" />
      <span className="nw-cart-button__label">السلة</span>
      {totalCount > 0 && (
        <span className="nw-cart-button__count">{toArabicDigits(totalCount)}</span>
      )}
    </Link>
  );
}

function BackToStore() {
  return (
    <Link to="/" className="nw-back">
      <IconArrowBack size={18} aria-hidden="true" />
      <span>الرجوع للمتجر</span>
    </Link>
  );
}

/** الشريط العلوي: صف واحد على الديسكتوب، وصفان على الموبايل كما في التصميم. */
export function NawatTopBar() {
  return (
    <header className="nw-topbar">
      <div className="nw-topbar__main">
        <Link
          to="/assistant"
          className="nw-brand"
          aria-label="نواة، مساعد التسوّق من الوادي الأخضر"
        >
          <NawatMark size={40} className="nw-brand__mark" />
          <span className="nw-brand__text">
            <b>نواة</b>
            <small>مساعد التسوّق من الوادي الأخضر</small>
          </span>
        </Link>
        <span className="nw-spacer" />
        <div className="nw-topbar__store nw-only-desktop">
          <StoreLogoCompact />
          <span className="nw-divider-v" aria-hidden="true" />
          <BackToStore />
        </div>
        <CartButton />
      </div>
      <div className="nw-topbar__store-row nw-only-mobile">
        <StoreLogoCompact />
        <span className="nw-spacer" />
        <BackToStore />
      </div>
    </header>
  );
}
