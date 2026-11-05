// The panscience mark, in one place. It was traced from the supplied logo pictures and redrawn as two clean vector
// shapes (straight edges at isometric angles, 31 points in all), so it stays sharp from a 16 pixel tab icon to the
// opening screen. The pictures showed only the left part of the mark, cut off at the right, so that is what is
// drawn; to use the full logo, replace PARTS below and it changes everywhere (page header, tab icon, sign-in,
// opening animation, the office walls and the task display).
//
// This file has no browser-only code, so mission control's server imports it too.
export const BRAND = { ink: '#1c1c1c', paper: '#f4f2ef', stone: '#8a867f' };

export const LOGO = {
  w: 968,
  h: 1318,
  parts: [
    'M916 377 259 756 259 1154 333 1189 766 940 766 1062 444 1248 442 1260 547 1318 622 1318 918 1148 918 678 424 963 407 966 407 845 916 552Z',
    'M968 205 613 0 556 0 39 298 0 362 0 487 575 156 679 214 0 606 0 962 24 1006 64 1040 144 1080 144 700 968 224Z',
  ],
};
export const LOGO_D = LOGO.parts.join('');
export const LOGO_RATIO = LOGO.w / LOGO.h;

// The mark as inline SVG that takes the colour of the text around it (currentColor).
export const logoSvg = (className = '', label = '') =>
  `<svg class="${className}" viewBox="0 0 ${LOGO.w} ${LOGO.h}" xmlns="http://www.w3.org/2000/svg" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}><path fill="currentColor" d="${LOGO_D}"/></svg>`;

// The tab icon: the dark mark on a warm light tile, so it shows on a dark or a light tab bar.
export function faviconHref() {
  const height = 46;
  const scale = height / LOGO.h;
  const x = (64 - LOGO.w * scale) / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${BRAND.paper}"/><path transform="translate(${x.toFixed(2)} 9) scale(${scale.toFixed(5)})" fill="${BRAND.ink}" d="${LOGO_D}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Draws the mark on a canvas, with its top left corner at (x, y). The width follows from the height.
export function drawLogo(ctx, x, y, height, fill = BRAND.ink) {
  ctx.save();
  ctx.translate(x, y);
  const scale = height / LOGO.h;
  ctx.scale(scale, scale);
  ctx.fillStyle = fill;
  ctx.fill(new Path2D(LOGO_D));
  ctx.restore();
  return height * LOGO_RATIO; // the width it took
}
