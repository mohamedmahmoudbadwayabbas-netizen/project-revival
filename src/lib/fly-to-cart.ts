// Fly-to-cart animation utility.
// Clones the ACTUAL product image and flies + shrinks it into the cart icon.
// Target = element with id="cart-icon-target".

export function flyToCart(sourceImg: HTMLImageElement | HTMLElement | null) {
  if (typeof window === "undefined" || !sourceImg) return;

  const target = document.getElementById("cart-icon-target");
  if (!target) return;

  // لو اللي اتبعت مش <img> نفسها، دوّر على img جوّاها
  const imgEl = sourceImg instanceof HTMLImageElement ? sourceImg : sourceImg.querySelector("img");

  if (!imgEl) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const sRect = imgEl.getBoundingClientRect();
  const tRect = target.getBoundingClientRect();

  const tx = tRect.left + tRect.width / 2 - (sRect.left + sRect.width / 2);
  const ty = tRect.top + tRect.height / 2 - (sRect.top + sRect.height / 2);

  // نسخة طبق الأصل من صورة المنتج، بنفس مكانها وحجمها بالظبط
  const clone = imgEl.cloneNode(true) as HTMLImageElement;
  clone.style.cssText = `
    position: fixed;
    left: ${sRect.left}px;
    top: ${sRect.top}px;
    width: ${sRect.width}px;
    height: ${sRect.height}px;
    object-fit: cover;
    border-radius: 12px;
    z-index: 9999;
    pointer-events: none;
    will-change: transform, opacity;
    box-shadow: 0 8px 24px -6px rgba(0,0,0,0.35);
  `;
  document.body.appendChild(clone);

  const duration = reduce ? 150 : 650;
  const targetScale = Math.max(0.06, (tRect.width * 0.8) / sRect.width);

  const anim = clone.animate(
    [
      { transform: "translate(0,0) scale(1)", opacity: 1, offset: 0 },
      {
        transform: `translate(${tx * 0.55}px, ${ty * 0.35 - 40}px) scale(${0.55}) rotate(6deg)`,
        opacity: 1,
        offset: 0.55,
      },
      {
        transform: `translate(${tx}px, ${ty}px) scale(${targetScale}) rotate(-8deg)`,
        opacity: 0.15,
        offset: 1,
      },
    ],
    { duration, easing: "cubic-bezier(0.32, 0.72, 0.35, 1)", fill: "forwards" },
  );

  anim.onfinish = () => {
    clone.remove();
    // نطة خفيفة على أيقونة السلة عند الوصول
    target.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }],
      { duration: reduce ? 100 : 280, easing: "ease-out" },
    );
  };
}
