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
  "slug": "tiktok-ai-avatars-product-ads",
  "kind": "OPINION",
  "title": [
    "A real product.",
    "A generated presenter?"
  ],
  "subtitle": [
    "A convincing demonstration still needs evidence."
  ],
  "topic": "AI ADS & PUBLIC TRUST"
},
{
  "slug": "disable-youtube-ai-remix",
  "kind": "YOUTUBE GUIDE",
  "title": [
    "Your video.",
    "Their AI remix?"
  ],
  "subtitle": [
    "How to turn off visual remixing on YouTube."
  ],
  "topic": "YOUTUBE CONTROLS"
},
{
  "slug": "turn-off-youtube-automatic-dubbing",
  "kind": "YOUTUBE GUIDE",
  "title": [
    "Your video.",
    "Words you never approved."
  ],
  "subtitle": [
    "Take control of YouTube’s automatic dubbing."
  ],
  "topic": "YOUTUBE CONTROLS"
},
{
  "slug": "content-credentials-privacy",
  "kind": "PRIVACY GUIDE",
  "title": [
    "Your photo.",
    "What else travels with it?"
  ],
  "subtitle": [
    "Check identity, accounts, and editing history."
  ],
  "topic": "CONTENT CREDENTIALS & PRIVACY"
},
{
  "slug": "youtube-likeness-detection-privacy",
  "kind": "PRIVACY OPINION",
  "title": [
    "Protect your face.",
    "First, upload your face."
  ],
  "subtitle": [
    "What YouTube’s likeness protection asks of you."
  ],
  "topic": "IDENTITY & PRIVACY"
},
{
  "slug": "apple-app-store-commissions-free-alternatives",
  "kind": "BYTEWAVE OPINION",
  "title": [
    "No subscription.",
    "No cut."
  ],
  "subtitle": [
    "What happens when developers make the tools free?"
  ],
  "topic": "FREE SOFTWARE & APP STORE FEES"
},
{
  "slug": "facebook-camera-roll-unposted-photos",
  "kind": "BYTEWAVE OPINION",
  "title": [
    "You didn’t post it.",
    "Meta can analyze it."
  ],
  "subtitle": [
    "What camera roll suggestions ask you to allow."
  ],
  "topic": "PRIVACY & EVERYDAY AI"
},
{
  "slug": "when-ai-filters-change-what-happened",
  "kind": "BYTEWAVE OPINION",
  "title": [
    "Just a filter?",
    "What did it change?"
  ],
  "subtitle": [
    "When editing starts inventing parts of the picture."
  ],
  "topic": "PRIVACY & EVERYDAY AI"
},
{
  "slug": "google-photos-ai-memories-dont-need-fixing",
  "kind": "BYTEWAVE OPINION",
  "title": [
    "Your memories",
    "don’t need fixing."
  ],
  "subtitle": [
    "Keep the moment. Keep the original."
  ],
  "topic": "PRIVACY & EVERYDAY AI"
},
{
  "slug": "meta-ai-chats-feed-ads-personalization",
  "kind": "BYTEWAVE OPINION",
  "title": [
    "You asked AI.",
    "Why that ad?"
  ],
  "subtitle": [
    "How Meta AI interactions can shape recommendations."
  ],
  "topic": "PRIVACY & EVERYDAY AI"
},
{
  "slug": "facebook-ai-labels-filters-generated-images",
  "kind": "BYTEWAVE OPINION",
  "title": [
    "A filter? A fake?",
    "Tell us what changed."
  ],
  "subtitle": [
    "Facebook AI labels need to explain more."
  ],
  "topic": "AI & PUBLIC TRUST"
},
{
  "slug": "openai-sora-deepfakes-public-trust",
  "kind": "BYTEWAVE OPINION",
  "title": [
    "Convincing fakes.",
    "Who protects us?"
  ],
  "subtitle": [
    "OpenAI, Sora, and the people watching."
  ],
  "topic": "AI & PUBLIC TRUST"
},
{
  "slug": "anthropic-claude-public-trust",
  "kind": "BYTEWAVE OPINION",
  "title": [
    "Anthropic needs",
    "to earn our trust."
  ],
  "subtitle": [
    "Human dignity. Evidence. Accountability."
  ],
  "topic": "AI & PUBLIC TRUST"
},
{
  "slug": "meta-muse-privacy-security-incidents",
  "kind": "INCIDENT TRACKER",
  "title": [
    "Meta Muse.",
    "Keep the receipts."
  ],
  "subtitle": [
    "Privacy incidents, security flaws, and updates."
  ],
  "topic": "PRIVACY & PROVENANCE"
},
{
  "slug": "can-photos-videos-reveal-your-address",
  "kind": "PRIVACY GUIDE",
  "title": [
    "Your photo.",
    "Your address?"
  ],
  "subtitle": [
    "Check the picture, the sound, and the hidden data."
  ],
  "topic": "PRIVACY & PROVENANCE"
},
{
  "slug": "disconnect-meta-muse",
  "kind": "PRIVACY GUIDE",
  "title": [
    "Done with Muse?",
    "Revoke its access."
  ],
  "subtitle": [
    "Disconnect accounts. Review stored data."
  ],
  "topic": "PRIVACY & PROVENANCE"
},
{
  "slug": "check-ai-video-without-uploading",
  "kind": "AI MEDIA GUIDE",
  "title": [
    "Check the video.",
    "Keep the file local."
  ],
  "subtitle": [
    "Look for origin evidence without a file upload."
  ],
  "topic": "PRIVACY & PROVENANCE"
},
{
  "slug": "does-removing-metadata-remove-ai-labels",
  "kind": "PROVENANCE GUIDE",
  "title": [
    "Remove metadata.",
    "Lose the evidence?"
  ],
  "subtitle": [
    "Privacy and provenance can pull in different directions."
  ],
  "topic": "PRIVACY & PROVENANCE"
},
{
  "slug": "layout",
  "image": "layout/honeycomb/poster.jpg",
  "kind": "BYTEWAVE GUIDE",
  "title": [
    "Photos and videos.",
    "One layout."
  ],
  "subtitle": [
    "Stack clips, build grids, and try new shapes."
  ],
  "topic": "LAYOUT"
},
{
  "slug": "animated-captions",
  "kind": "BYTEWAVE GUIDE",
  "title": [
    "Add animated",
    "captions."
  ],
  "subtitle": [
    "Your words, on your video."
  ],
  "topic": "VIDEO EDITING"
},
{
  "slug": "caption-text-effects",
  "kind": "BYTEWAVE GUIDE",
  "title": [
    "Caption",
    "text effects."
  ],
  "subtitle": [
    "Orbital Letters, Supernova, Ember Ash, and more."
  ],
  "topic": "VIDEO EDITING"
},
{
  "slug": "animate-stickers",
  "kind": "BYTEWAVE GUIDE",
  "title": [
    "Make your",
    "stickers move."
  ],
  "subtitle": [
    "Position, size, rotation, and keyframes."
  ],
  "topic": "VIDEO EDITING"
},
  {
  "slug": "tools-newsrooms-check-ai-generated-media",
  "kind": "NEWSROOM GUIDE",
  "title": [
    "Was this made",
    "with AI?"
  ],
  "subtitle": [
    "Tools for checking photos and videos."
  ],
  "topic": "C2PA & PROVENANCE"
},
  {
    "slug": "no-ai-label-does-not-mean-real",
    "kind": "AI MEDIA",
    "title": [
      "No AI label.",
      "Still could be fake."
    ],
    "subtitle": [
      "A missing label is not proof."
    ],
    "topic": "AI MEDIA"
  },
  {
    "slug": "ai-training-creator-consent",
    "kind": "CREATOR OPINION",
    "title": [
      "You made it.",
      "Who gets to train on it?"
    ],
    "subtitle": [
      "Creators deserve a say."
    ],
    "topic": "CREATOR CONSENT"
  },
  {
    "slug": "remove-location-metadata",
    "kind": "BYTEWAVE TUTORIAL",
    "title": [
      "Know more.",
      "Share less."
    ],
    "subtitle": [
      "Check and remove editable metadata",
      "before sharing your video."
    ],
    "topic": "METADATA TUTORIAL"
  },
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
  const photo = Boolean(card.poster || card.image);
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
    if (card.labels) {
    artwork += lines([card.labels[0]], x + w / 4, y - 16, 17, '#c3c0d0', 400).replace(`x="${x + w / 4}"`, `text-anchor="middle" x="${x + w / 4}"`);
    artwork += lines([card.labels[1]], x + w * 3 / 4, y - 16, 17, '#aac4ff', 400).replace(`x="${x + w * 3 / 4}"`, `text-anchor="middle" x="${x + w * 3 / 4}"`);
    }
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
    const resized = await sharp(path.join(root, 'assets/videos', card.poster || card.image))
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
