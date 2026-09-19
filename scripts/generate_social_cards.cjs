#!/usr/bin/env node
// Optional asset maintenance: requires Node.js, sharp, and DejaVu Sans fonts.
// Run: node scripts/generate_social_cards.cjs
// The deployed site uses the committed JPEGs and has no new runtime dependencies.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'assets/social');
const cards = [
  {
    slug: 'does-emoji-protect-child-face-facebook', kind: 'PRIVACY',
    title: ['Does an emoji protect', 'your child’s face?'],
    subtitle: ['But what did Meta get to see first?'],
    topic: 'CHILD PHOTO PRIVACY',
  },
  {
    slug: 'meta-muse-privacy-security', kind: 'PRIVACY OPINION',
    title: ['Meta Muse:', 'our advice is to skip it.'],
    subtitle: ['Keep your accounts and personal data', 'out of Muse. Here is why.'],
    topic: 'META MUSE',
  },
  {
    slug: 'how-to-check-ai-generated-photos-videos', kind: 'PERSPECTIVE',
    title: ['AI media needs', 'tools to check it.'],
    subtitle: ['Accessible evidence. Clear limits.', 'Privacy belongs in the design.'],
    topic: 'CONTENT CREDENTIALS',
  },
  {
    slug: 'check-c2pa-content-credentials', kind: 'BYTEWAVE TUTORIAL',
    title: ['Check Content', 'Credentials.'],
    subtitle: ['Open a photo or video provenance badge.', 'Learn what each result means.'],
    topic: 'C2PA',
  },

  {
    slug: 'motion-blur', kind: 'IPHONE TUTORIAL',
    title: ['Add motion blur', 'to your video.'],
    subtitle: ['Real footage. Side by side.', 'Learn the settings in ByteWave.'],
    poster: 'motion-blur-comparison-poster.jpg',
    labels: ['Original', 'Motion blur'],
  },
  {
    slug: 'frame-rate-conversion', kind: 'IPHONE TUTORIAL',
    title: ['Slow motion.', 'More frames.'],
    subtitle: ['Frame rate conversion in ByteWave.', 'Compare a hummingbird at 0.1×.'],
    poster: 'hummingbird-comparison-poster.jpg',
    labels: ['Ordinary · 0.1×', 'ByteWave FRC · 0.1×'],
  },
  {
    slug: 'temporal-noise-reduction', kind: 'IPHONE TUTORIAL',
    title: ['Temporal noise reduction.'],
    subtitle: ['Compare noise and detail in your video.'],
    poster: 'temporal-noise-comparison-poster.jpg', wide: true,
    labels: ['Original', 'Noise reduction'],
    credit: 'Apple example footage · Edited in ByteWave',
  },
  {
    slug: 'reduce-ai-videos-facebook-feed', kind: 'FACEBOOK GUIDE',
    title: ['Facebook feed', 'full of AI videos?'],
    subtitle: ['Ways to see less. What the controls can do.', 'And where their limits are.'],
    topic: 'FEED CONTROLS',
  },
  {
    slug: 'reduce-ai-content-tiktok-feed', kind: 'TIKTOK GUIDE',
    title: ['Less AI in', 'your TikTok feed.'],
    subtitle: ['Feedback, filters and feed settings.', 'A practical guide to the available controls.'],
    topic: 'FEED CONTROLS',
  },
  {
    slug: 'tired-of-ai-videos-social-media', kind: 'AI VIDEO GUIDE',
    title: ['Tired of AI videos', 'everywhere?'],
    subtitle: ['Who is making them. How they reach your feed.', 'And how editing your own footage differs.'],
    topic: 'AI VIDEO EXPLAINED',
  },
  {
    slug: 'free-capcut-alternative-2026', kind: 'VIDEO EDITING GUIDE',
    title: ['Looking for a free', 'CapCut alternative?'],
    subtitle: ['Explore ByteWave for iPhone and iPad.', 'Start with the footage you already have.'],
    topic: 'CAPCUT ALTERNATIVE',
  },
];

const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const lines = (text, x, y, size, fill = '#eeedf5', weight = 700, leading = 1.16) =>
  `<text x="${x}" y="${y}" font-family="DejaVu Sans" font-size="${size}" font-weight="${weight}" fill="${fill}">${text.map((line, i) => `<tspan x="${x}" dy="${i ? size * leading : 0}">${escape(line)}</tspan>`).join('')}</text>`;
const svg = content => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">${content}</svg>`);

async function render(card) {
  const photo = Boolean(card.poster);
  const accent = card.slug.includes('tiktok') || card.slug.includes('capcut') ? '#e2b8df' : '#9bbaff';
  const photoBox = card.wide ? { x: 54, y: 283, w: 1092, h: 259 } : { x: 663, y: 112, w: 483, h: 430 };
  let artwork = `<rect width="1200" height="630" fill="#08080e"/>
    <rect x="0" y="0" width="1200" height="7" fill="${accent}"/>
    <rect x="54" y="53" width="6" height="23" rx="3" fill="${accent}"/>
    ${lines([card.kind], 75, 72, 19, accent)}
    ${lines(['ByteWave'], 54, 589, 24)}
    ${lines(['bytewaveai.com'], 1146, 589, 18, '#aaa7bb', 400).replace('x="1146"', 'text-anchor="end" x="1146"')}`;

  if (photo) {
    artwork += lines(card.title, 54, card.wide ? 162 : 221, card.wide ? 54 : 52);
    artwork += lines(card.subtitle, 54, card.wide ? 214 : 371, 23, '#aaa7bb', 400, 1.5);
    const { x, y, w, h } = photoBox;
    artwork += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#10101a" stroke="#303044"/>`;
    artwork += lines([card.labels[0]], x + w / 4, y - 16, 17, '#c3c0d0', 400).replace(`x="${x + w / 4}"`, `text-anchor="middle" x="${x + w / 4}"`);
    artwork += lines([card.labels[1]], x + w * 3 / 4, y - 16, 17, '#aac4ff', 400).replace(`x="${x + w * 3 / 4}"`, `text-anchor="middle" x="${x + w * 3 / 4}"`);
    if (card.credit) artwork += lines([card.credit], 245, 588, 16, '#aaa7bb', 400);
  } else {
    artwork += lines(card.title, 54, 219, 68);
    artwork += lines(card.subtitle, 58, 388, 27, '#aaa7bb', 400, 1.5);
    artwork += `<line x1="54" y1="509" x2="1146" y2="509" stroke="#303044"/>
      ${lines([card.topic], 1146, 72, 16, '#aaa7bb', 400).replace('x="1146"', 'text-anchor="end" x="1146"')}`;
  }

  const layers = [];
  if (photo) {
    // Contain the complete comparison, preserving both halves and their aspect ratio.
    const resized = await sharp(path.join(root, 'assets/videos', card.poster))
      .resize(photoBox.w, photoBox.h, { fit: 'contain', background: '#10101a' })
      .toBuffer();
    layers.push({ input: resized, left: photoBox.x, top: photoBox.y });
  }
  await sharp(svg(artwork)).composite(layers).jpeg({ quality: 88, mozjpeg: true })
    .toFile(path.join(output, `${card.slug}.jpg`));
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  for (const card of cards) await render(card);
  console.log(`Created ${cards.length} share cards (1200 × 630).`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
