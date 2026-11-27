import { gsap } from "../../../../core/ui/gsap";

const TOKEN_SIZE = 46;
const HALF_TOKEN = TOKEN_SIZE / 2;

function resolveOriginRect(sourceEl: HTMLElement): { rect: DOMRect; imageUrl?: string } {
  const card = sourceEl.closest(".gsap-menu-card, [role='dialog']");
  const img = card?.querySelector<HTMLImageElement>("img");
  if (img && img.complete && img.naturalWidth > 0) {
    const imgRect = img.getBoundingClientRect();
    if (imgRect.width > 0 && imgRect.height > 0) {
      return { rect: imgRect, imageUrl: img.currentSrc || img.src };
    }
  }
  return { rect: sourceEl.getBoundingClientRect() };
}

function resolveTargetCenter(): { x: number; y: number } {
  const pill = document.querySelector<HTMLElement>("[data-ird-cart-drop-target='true']");
  if (pill) {
    const rect = pill.getBoundingClientRect();
    const dock = pill.closest<HTMLElement>("[data-ird-cart-dock='true']");
    let activeOffsetY = 0;
    if (dock) {
      const tf = getComputedStyle(dock).transform;
      if (tf && tf !== "none") {
        activeOffsetY = new DOMMatrix(tf).m42 || 0;
      }
    }
    if (rect.width > 0 && rect.height > 0) {
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2 - activeOffsetY,
      };
    }
  }

  const headerBag = document.querySelector<HTMLElement>("[data-ird-cart-fallback-target='true']");
  if (headerBag) {
    const rect = headerBag.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
  }

  return {
    x: window.innerWidth / 2,
    y: window.innerHeight - 102,
  };
}

function createFlyingToken(imageUrl?: string): HTMLDivElement {
  const token = document.createElement("div");
  token.setAttribute("aria-hidden", "true");
  token.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    `width:${TOKEN_SIZE}px`,
    `height:${TOKEN_SIZE}px`,
    "border-radius:14px",
    "overflow:hidden",
    "pointer-events:none",
    "z-index:65",
    "border:2px solid #FFFBF6",
    "background:#C44D27",
    "box-shadow:0 12px 26px -6px rgba(61,28,17,0.45)",
    "will-change:transform,opacity",
    "display:flex",
    "align-items:center",
    "justify-content:center",
  ].join(";");

  if (imageUrl) {
    const img = document.createElement("img");
    img.src = imageUrl;
    img.alt = "";
    img.decoding = "async";
    img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
    token.appendChild(img);
  } else {
    const dot = document.createElement("span");
    dot.style.cssText =
      "width:16px;height:16px;border-radius:9999px;background:#FFFBF6;display:block;";
    token.appendChild(dot);
  }

  return token;
}

/**
 * Animates a GPU-composited dish token along a smooth parabolic gravity arc
 * from the tapped card/button into the floating IRD cart bar.
 */
export function triggerCartDropAnimation(sourceEl?: HTMLElement | null, fallbackImageUrl?: string | null) {
  if (typeof window === "undefined" || !sourceEl) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // Batch source DOM geometry reads synchronously before React closes modals or updates cart layout
  const { rect: originRect, imageUrl: domImageUrl } = resolveOriginRect(sourceEl);
  if (originRect.width === 0 && originRect.height === 0) return;

  const startX = originRect.left + originRect.width / 2;
  const startY = originRect.top + originRect.height / 2;
  const imgSrc = domImageUrl || fallbackImageUrl || undefined;

  window.requestAnimationFrame(() => {
    const end = resolveTargetCenter();
    const dx = end.x - startX;
    const token = createFlyingToken(imgSrc);
    document.body.appendChild(token);

    const startLeft = startX - HALF_TOKEN;
    const startTop = startY - HALF_TOKEN;
    const endLeft = end.x - HALF_TOKEN;
    const endTop = end.y - HALF_TOKEN;
    const liftY = Math.min(startTop, endTop) - 24;
    const tilt = dx >= 0 ? 12 : -12;

    gsap.set(token, {
      x: startLeft,
      y: startTop,
      scale: 0.92,
      rotation: 0,
      opacity: 1,
      force3D: true,
    });

    const tl = gsap.timeline({
      defaults: { force3D: true },
      onComplete: () => {
        token.remove();
      },
    });

    // Independent horizontal glide + vertical gravity parabola keeps 60fps compositor transforms only
    tl.to(
      token,
      {
        x: endLeft,
        duration: 0.52,
        ease: "sine.inOut",
      },
      0
    )
      .to(
        token,
        {
          y: liftY,
          scale: 1.08,
          rotation: -tilt * 0.65,
          duration: 0.14,
          ease: "power2.out",
        },
        0
      )
      .to(
        token,
        {
          y: endTop,
          scale: 0.4,
          rotation: tilt,
          duration: 0.38,
          ease: "power2.in",
        },
        0.14
      )
      .to(
        token,
        {
          opacity: 0,
          duration: 0.1,
          ease: "power1.in",
        },
        0.43
      )
      .call(
        () => {
          const cartBar = document.querySelector<HTMLElement>("[data-ird-cart-bar='true']");
          if (!cartBar) return;
          gsap.fromTo(
            cartBar,
            { scaleX: 1.025, scaleY: 0.94, y: 2 },
            {
              scaleX: 1,
              scaleY: 1,
              y: 0,
              duration: 0.28,
              ease: "back.out(2.4)",
              overwrite: "auto",
              force3D: true,
              clearProps: "transform",
            }
          );
        },
        [],
        0.46
      );
  });
}
