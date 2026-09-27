import type { PortraitComparisonResult } from '@/lib/ai/deepseek';
import { APP_CONFIG } from '@/lib/config';

/**
 * Editorial art direction for side-by-side portrait comparison poster.
 * Follows front-ref-imgs/ref-face-compare.png layout:
 * - 2:3 vertical luxury editorial layout
 * - Person A on left (image_urls[0]), Person B on right (image_urls[1])
 * - Winner card highlighted with gold frame, crown emblem, and WINNER ribbon
 * - Stylized serif 'VS' in gold/bronze metallic gradient in the center
 * - 3 circular micro-crops under each portrait
 * - 5 horizontal metric comparison bars (FACIAL SYMMETRY, FACIAL HARMONY, EYES, JAWLINE, PHOTOGENIC APPEAL)
 * - Bottom overall scores and high-contrast charcoal/black WINNER badge with +ADVANTAGE pill
 * - Footer with VERDICT summary and brand credit
 */
export const COMPARE_POSTER_TEMPLATE = `Create ONE finished luxury editorial side-by-side portrait comparison poster, vertical 2:3. Output the poster itself, not a photograph of a poster, website screenshot, device mockup or dashboard.

IDENTITY AND INPUT IMAGES
You are provided with two images in image_urls:
- image_urls[0] is PERSON A (Left)
- image_urls[1] is PERSON B (Right)
Preserve the subjects' visible faces, age appearance, facial structure, skin texture, hairstyle and clothing from their respective input images. Do not replace either person with an invented model or beautify their anatomy. Every small detail image must depict that same person's visible features.

ART DIRECTION AND BRAND PALETTE
Follow the visual discipline of the luxury editorial comparison reference:
- Canvas: Warm off-white / light ivory fine paper background (#fbf8f4 / #faf7f3), delicate warm-gray hairline inner frame border inset ~1.2% with softly rounded corners.
- Typography: High-contrast Didone serif for person headings, 'VS', numbers and winner badges; crisp modern sans-serif for labels, sublabels, and descriptive text.
- Winner Styling: The winner card (as declared in REPORT_DATA) is framed in a glowing warm gold border (#d4af37 / #c59b27), with a small gold crown icon above the name, and a rich gold ribbon badge reading 'WINNER'. The winner's progress bars and percentage numbers use warm gold.
- Runner-up Styling: The runner-up card has a refined, quiet warm-gray / silver hairline border (#d6cec7), with neutral silver-gray progress bars (#a8a29e) and gray percentage numbers (#575254).
- Central VS: Large, elegant Didone italic serif 'VS' in warm metallic gold/bronze gradient, vertically centered between the two portrait cards.

EXACT PAGE GEOMETRY (Vertical 2:3 Canvas)
1. Top Battle Area (y=3% to 48%):
   - Two equal-sized portrait cards side-by-side:
     - Left: PERSON A card. Header 'PERSON A' in elegant Didone serif capitals. If Person A is winner, show gold crown and 'WINNER' gold ribbon banner. Portrait image shows Person A with subtle, fine white dotted symmetry/crosshair guides on the face. Directly beneath the portrait, three small circular micro-crops show close-ups of eyes, cheek/jaw contour, and lips.
     - Center: Prominent artistic serif 'VS' emblem in warm gold/bronze gradient between the two cards.
     - Right: PERSON B card. Header 'PERSON B' in elegant Didone serif capitals. If Person B is winner, show gold crown and 'WINNER' gold ribbon banner; if runner-up, show clean quiet silver frame. Portrait image shows Person B with subtle fine white dotted facial guides. Directly beneath the portrait, three small circular micro-crops show close-ups of eyes, cheek/jaw contour, and lips.
2. Middle Comparison Dimension Rows (y=49% to 75%):
   - A clean, centered comparison card with five horizontal metric rows:
     Row 1: FACIAL SYMMETRY (sublabel: 'Balance & Proportion')
     Row 2: FACIAL HARMONY (sublabel: 'Overall Proportional Balance')
     Row 3: EYES (sublabel: 'Shape, Symmetry & Spacing')
     Row 4: JAWLINE (sublabel: 'Definition & Facial Contour')
     Row 5: PHOTOGENIC APPEAL (sublabel: 'Natural Attractiveness')
   - Structure of each row:
     - Person A side (left): Exact percentage from REPORT_DATA in bold serif (e.g. '91%'), followed by a horizontal progress bar.
     - Center: Clean anatomical outline icon beside the uppercase metric name, with tiny light sublabel underneath.
     - Person B side (right): Horizontal progress bar, followed by exact percentage from REPORT_DATA in bold serif (e.g. '88%').
     - The winner's side uses glowing warm gold bars; the other side uses refined silver-gray bars.
3. Bottom Overall Score & Winner Banner (y=76% to 92%):
   - Left (Person A): Label 'OVERALL SCORE' in small uppercase serif, dominant large Didone score (e.g. '9.12'), with small '/ 10' beneath.
   - Center (Winner Plaque): High-contrast luxury black/charcoal rounded plaque (#1f1d1e) with a fine gold border:
     - Small gold trophy emblem surrounded by laurel wreath.
     - 'WINNER' in bold gold serif capitals.
     - 'AI ATTRACTIVENESS COMPARISON' in small gold tracked capitals.
     - Fine gold horizontal separator.
     - '+[X] ADVANTAGE' pill in gold lettering (e.g. '+0.32 ADVANTAGE').
   - Right (Person B): Label 'OVERALL SCORE' in small uppercase serif, dominant large Didone score (e.g. '8.80'), with small '/ 10' beneath.
4. Footer (y=93% to 98%):
   - Left: Small star or laurel emblem followed by 'VERDICT' and the short 1-line summary verdict.
   - Right: Discreet brand credit 'Analysis by AIAttractivenessTest.ai'.

DATA RULES
REPORT_DATA is the sole source of all scores, percentages, winner declaration, advantage and verdict. Never change numbers, invert the winner, or invent claims. Render only the completed poster, edge to edge.`;

export function buildComparePosterPrompt(comparison: PortraitComparisonResult): string {
  const winner = comparison.winner;
  const isWinnerA = winner === 'Photo A';
  const isWinnerB = winner === 'Photo B';

  // Normalize scores to 2 decimal places
  const rawScoreA = comparison.photoA.numericScore ?? parseFloat(comparison.photoA.score) ?? 8.5;
  const rawScoreB = comparison.photoB.numericScore ?? parseFloat(comparison.photoB.score) ?? 8.2;
  const scoreA = Number.isFinite(rawScoreA) ? rawScoreA : 8.5;
  const scoreB = Number.isFinite(rawScoreB) ? rawScoreB : 8.2;

  const scoreADisplay = scoreA.toFixed(2);
  const scoreBDisplay = scoreB.toFixed(2);

  const diff = Math.abs(scoreA - scoreB);
  const advantageText = comparison.advantage || `+${diff.toFixed(2)} ADVANTAGE`;

  // Standard 5 metrics from ref-face-compare.png
  const defaultMetrics = [
    {
      name: 'FACIAL SYMMETRY',
      sublabel: 'Balance & Proportion',
      scoreA: Math.round(scoreA * 10),
      scoreB: Math.round(scoreB * 10),
    },
    {
      name: 'FACIAL HARMONY',
      sublabel: 'Overall Proportional Balance',
      scoreA: Math.round(scoreA * 9.8),
      scoreB: Math.round(scoreB * 9.7),
    },
    {
      name: 'EYES',
      sublabel: 'Shape, Symmetry & Spacing',
      scoreA: Math.round(scoreA * 9.9),
      scoreB: Math.round(scoreB * 10.1),
    },
    {
      name: 'JAWLINE',
      sublabel: 'Definition & Facial Contour',
      scoreA: Math.round(scoreA * 9.6),
      scoreB: Math.round(scoreB * 9.5),
    },
    {
      name: 'PHOTOGENIC APPEAL',
      sublabel: 'Natural Attractiveness',
      scoreA: Math.round(scoreA * 9.9),
      scoreB: Math.round(scoreB * 9.8),
    },
  ];

  const metrics = (comparison.metrics && comparison.metrics.length >= 5)
    ? comparison.metrics
    : defaultMetrics;

  const formattedMetrics = metrics.map((m) => ({
    name: m.name,
    sublabel: m.sublabel,
    personAPercentage: `${Math.min(99, Math.max(50, m.scoreA))}%`,
    personBPercentage: `${Math.min(99, Math.max(50, m.scoreB))}%`,
  }));

  const verdict = comparison.verdictRecommendation || comparison.overallAssessment || (
    isWinnerA
      ? 'Person A demonstrates slightly higher facial harmony, symmetry, and photogenic balance.'
      : isWinnerB
      ? 'Person B demonstrates slightly higher facial harmony, symmetry, and photogenic balance.'
      : 'Both portraits demonstrate balanced facial harmony and complimentary lighting.'
  );

  const reportData = {
    personA: {
      label: 'PERSON A',
      score: scoreADisplay,
      isWinner: isWinnerA,
      badge: isWinnerA ? 'WINNER' : null,
    },
    personB: {
      label: 'PERSON B',
      score: scoreBDisplay,
      isWinner: isWinnerB,
      badge: isWinnerB ? 'WINNER' : null,
    },
    winner: isWinnerA ? 'PERSON A' : isWinnerB ? 'PERSON B' : 'TIE',
    advantage: advantageText,
    metrics: formattedMetrics,
    verdict: verdict.slice(0, 160),
    brandCredit: `Analysis by ${APP_CONFIG.appName}`,
  };

  return `${COMPARE_POSTER_TEMPLATE}\n\nREPORT_DATA\n${JSON.stringify(reportData, null, 2)}`;
}
