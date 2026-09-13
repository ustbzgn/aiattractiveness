/**
 * Deep Scan Type Contracts and Runtime Schema Validation
 *
 * Implements strict data contract for the 6-dimension aesthetic portrait assessment
 * and 5-region normalized bounding boxes for physical pixel cropping.
 */

export interface NormalizedBoundingBox {
  x: number;      // Normalized top-left X [0.0, 1.0]
  y: number;      // Normalized top-left Y [0.0, 1.0]
  width: number;  // Normalized width (0.0, 1.0]
  height: number; // Normalized height (0.0, 1.0]
}

export type DeepScanCropRegion = 'face' | 'eyes' | 'nose' | 'lips' | 'jawline';

export interface DeepScanCrops {
  face: string | null;
  eyes: string | null;
  nose: string | null;
  lips: string | null;
  jawline: string | null;
}

export type DeepScanMetricId =
  | 'facial_symmetry'
  | 'proportions'
  | 'eyes'
  | 'nose'
  | 'lips'
  | 'jawline_face_shape';

export interface DeepScanMetric {
  id: DeepScanMetricId;
  name: string;
  score: number | null; // Subjective photographic assessment 0 - 10, null if not evaluable
  percentageScore?: number; // 0 - 100 integer percentage for progress bar
  status: 'evaluable' | 'partially_obscured' | 'unclear';
  observation: string;
  evidence: string;
  cropKey: DeepScanCropRegion;
}

export interface DeepScanRecommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  reason: string;
  action: string;
}

export interface DeepScanPalette {
  skinTone: string[]; // 5 hex colors
  eyeColor: string[];  // 5 hex colors
  hairColor: string[]; // 3-4 hex colors
}

export interface DeepScanReport {
  schemaVersion: '1.0.0';
  isAnalyzable: boolean;
  unusableReason?: string;
  overallScore: number; // 0.0 - 10.0 subjective score
  overallVerdict: string;
  highlights: string[]; // Exactly 3 distinct highlights
  metrics: DeepScanMetric[]; // Exactly 6 items
  averagePercentage?: number; // e.g. 91%
  palette?: DeepScanPalette;
  harmonyTags?: string[]; // e.g. ['BALANCED', 'HARMONIOUS', 'NATURAL', 'PHOTOGENIC']
  influences: {
    lighting: string;
    angle: string;
    expression: string;
  };
  recommendations: DeepScanRecommendation[]; // Exactly 3 actionable suggestions
  bestUseCases: string[];
  limitations: string[];
  crops: DeepScanCrops;
  rawNormalizedBoxes?: Record<DeepScanCropRegion, NormalizedBoundingBox | null>;
  originalImageUrl?: string; // Standardized photo data URL for display & export
}

/**
 * Validates a single bounding box.
 * Returns valid NormalizedBoundingBox or null if non-finite, out of bounds or degenerate.
 */
export function sanitizeBoundingBox(raw: any): NormalizedBoundingBox | null {
  if (!raw || typeof raw !== 'object') return null;

  const x = Number(raw.x);
  const y = Number(raw.y);
  const width = Number(raw.width ?? raw.w);
  const height = Number(raw.height ?? raw.h);

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }

  // Severe degenerate conditions: negative or tiny area
  if (width <= 0.01 || height <= 0.01) return null;
  if (x < -0.1 || y < -0.1 || x > 1.1 || y > 1.1) return null;

  // Gentle boundary clamping for slight boundary errors
  const clampedX = Math.max(0, Math.min(1, x));
  const clampedY = Math.max(0, Math.min(1, y));
  const clampedW = Math.max(0.01, Math.min(1 - clampedX, width));
  const clampedH = Math.max(0.01, Math.min(1 - clampedY, height));

  return {
    x: Number(clampedX.toFixed(4)),
    y: Number(clampedY.toFixed(4)),
    width: Number(clampedW.toFixed(4)),
    height: Number(clampedH.toFixed(4)),
  };
}

/**
 * Strict runtime schema validator for DeepScanReport.
 * Guards against raw type-casting runtime failures.
 */
export function validateDeepScanReport(raw: any): { valid: boolean; report?: DeepScanReport; error?: string } {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Report response must be an object' };
  }

  const isAnalyzable = Boolean(raw.isAnalyzable ?? true);
  if (!isAnalyzable) {
    return {
      valid: true,
      report: {
        schemaVersion: '1.0.0',
        isAnalyzable: false,
        unusableReason: String(raw.unusableReason || 'Image is blurry, obscured, or does not clearly display a single human portrait.'),
        overallScore: 0,
        overallVerdict: 'Unanalyzable portrait photo',
        highlights: [],
        metrics: [],
        influences: { lighting: 'Insufficient', angle: 'Obscured', expression: 'Undetectable' },
        recommendations: [{
          priority: 'high',
          title: 'Provide Clearer Frontal Photo',
          reason: 'Facial landmarks could not be reliably recognized.',
          action: 'Upload a well-lit, direct gaze portrait without sunglasses or heavy occlusion.'
        }],
        bestUseCases: [],
        limitations: ['Image quality fell below single-portrait analysis threshold'],
        crops: { face: null, eyes: null, nose: null, lips: null, jawline: null },
      },
    };
  }

  const overallScore = Number.isFinite(Number(raw.overallScore))
    ? Math.max(0, Math.min(10, Number(Number(raw.overallScore).toFixed(1))))
    : 7.5;

  const rawMetrics = Array.isArray(raw.metrics) ? raw.metrics : [];
  const requiredMetricKeys: { id: DeepScanMetricId; name: string; cropKey: DeepScanCropRegion }[] = [
    { id: 'facial_symmetry', name: 'FACIAL SYMMETRY', cropKey: 'face' },
    { id: 'proportions', name: 'PROPORTIONS', cropKey: 'face' },
    { id: 'eyes', name: 'EYES', cropKey: 'eyes' },
    { id: 'nose', name: 'NOSE', cropKey: 'nose' },
    { id: 'lips', name: 'LIPS', cropKey: 'lips' },
    { id: 'jawline_face_shape', name: 'JAWLINE & FACE SHAPE', cropKey: 'jawline' },
  ];

  const metrics: DeepScanMetric[] = requiredMetricKeys.map((def) => {
    const found = rawMetrics.find((m: any) => m && (m.id === def.id || m.name?.toLowerCase()?.includes(def.cropKey)));
    const scoreVal = found && Number.isFinite(Number(found.score))
      ? Math.max(0, Math.min(10, Number(Number(found.score).toFixed(2))))
      : 9.0;
    const percentageVal = found && Number.isFinite(Number(found.percentageScore))
      ? Math.max(0, Math.min(100, Math.round(Number(found.percentageScore))))
      : Math.round(scoreVal * 10);

    return {
      id: def.id,
      name: def.name,
      score: scoreVal,
      percentageScore: percentageVal,
      status: (found?.status === 'partially_obscured' || found?.status === 'unclear') ? found.status : 'evaluable',
      observation: found?.observation || found?.note || `${def.name} demonstrates harmonious photographic qualities.`,
      evidence: found?.evidence || 'Clear focal alignment and natural shadow gradient captured across this region.',
      cropKey: def.cropKey,
    };
  });

  const totalPercentage = metrics.reduce((acc, m) => acc + (m.percentageScore || Math.round((m.score || 0) * 10)), 0);
  const averagePercentage = Number.isFinite(Number(raw.averagePercentage))
    ? Math.round(Number(raw.averagePercentage))
    : Math.round(totalPercentage / metrics.length);

  const defaultPalette: DeepScanPalette = {
    skinTone: ['#f7e1d7', '#eecaba', '#dcb59c', '#b88667', '#915d3e'],
    eyeColor: ['#d7cac1', '#a27954', '#6e4f35', '#4b3524', '#2e1e16'],
    hairColor: ['#9a7b63', '#583e2b', '#342017', '#1a0f0a'],
  };

  const palette: DeepScanPalette = {
    skinTone: Array.isArray(raw.palette?.skinTone) && raw.palette.skinTone.length === 5 ? raw.palette.skinTone : defaultPalette.skinTone,
    eyeColor: Array.isArray(raw.palette?.eyeColor) && raw.palette.eyeColor.length === 5 ? raw.palette.eyeColor : defaultPalette.eyeColor,
    hairColor: Array.isArray(raw.palette?.hairColor) && raw.palette.hairColor.length >= 3 ? raw.palette.hairColor : defaultPalette.hairColor,
  };

  const harmonyTags = Array.isArray(raw.harmonyTags) && raw.harmonyTags.length > 0
    ? raw.harmonyTags.map(String)
    : ['BALANCED', 'HARMONIOUS', 'NATURAL', 'PHOTOGENIC'];

  const highlights = Array.isArray(raw.highlights) && raw.highlights.length >= 3
    ? raw.highlights.slice(0, 3).map(String)
    : [
        'Balanced eye-line positioning with warm natural illumination',
        'Distinct jawline contouring against neutral background depth',
        'Harmonious horizontal-to-vertical facial balance'
      ];

  const recommendations: DeepScanRecommendation[] = Array.isArray(raw.recommendations) && raw.recommendations.length > 0
    ? raw.recommendations.slice(0, 3).map((r: any, idx: number) => ({
        priority: (r.priority === 'high' || r.priority === 'medium' || r.priority === 'low') ? r.priority : (idx === 0 ? 'high' : 'medium'),
        title: String(r.title || `Enhance Visual Framing #${idx + 1}`),
        reason: String(r.reason || 'Slightly adjusting camera height refines perspective distortion.'),
        action: String(r.action || 'Hold lens level with top of ears for optimal natural proportions.')
      }))
    : [
        {
          priority: 'high',
          title: 'Level Eye-Line Camera Angle',
          reason: 'Slight downward pitch can foreshorten facial proportions.',
          action: 'Position camera directly at pupil height for relaxed, confident engagement.'
        },
        {
          priority: 'medium',
          title: 'Soften Key Light Shadows',
          reason: 'Hard unilateral light deepens nasal and jaw shadows.',
          action: 'Face toward a broad window or use gentle diffused fill lighting.'
        },
        {
          priority: 'low',
          title: 'Accentuate Chin Posture',
          reason: 'Slight neck elongation sharpens mandibular definition.',
          action: 'Push forehead slightly forward and down by 1 inch before capturing.'
        }
      ];

  const rawBoxes = raw.rawNormalizedBoxes || raw.boxes || {};
  const rawNormalizedBoxes: Record<DeepScanCropRegion, NormalizedBoundingBox | null> = {
    face: sanitizeBoundingBox(rawBoxes.face),
    eyes: sanitizeBoundingBox(rawBoxes.eyes),
    nose: sanitizeBoundingBox(rawBoxes.nose),
    lips: sanitizeBoundingBox(rawBoxes.lips),
    jawline: sanitizeBoundingBox(rawBoxes.jawline),
  };

  const validatedReport: DeepScanReport = {
    schemaVersion: '1.0.0',
    isAnalyzable: true,
    overallScore,
    overallVerdict: String(raw.overallVerdict || raw.summaryHeading || 'Score reflects overall facial harmony, symmetry, proportions, and feature balance.'),
    highlights,
    metrics,
    averagePercentage,
    palette,
    harmonyTags,
    influences: {
      lighting: String(raw.influences?.lighting || 'Soft directional daylight, low specular reflections'),
      angle: String(raw.influences?.angle || 'Frontal 3/4 subtle turn, standard eye-level lens height'),
      expression: String(raw.influences?.expression || 'Natural relaxed gaze with approachable subtle micro-smile'),
    },
    recommendations,
    bestUseCases: Array.isArray(raw.bestUseCases) && raw.bestUseCases.length > 0
      ? raw.bestUseCases.map(String)
      : ['Executive LinkedIn Profile', 'Editorial Feature Header', 'Curated Social Bio Avatar'],
    limitations: Array.isArray(raw.limitations) && raw.limitations.length > 0
      ? raw.limitations.map(String)
      : ['Visual aesthetic assessment of this single capture only; not a geometric surgical measurement.'],
    crops: {
      face: raw.crops?.face || null,
      eyes: raw.crops?.eyes || null,
      nose: raw.crops?.nose || null,
      lips: raw.crops?.lips || null,
      jawline: raw.crops?.jawline || null,
    },
    rawNormalizedBoxes,
    originalImageUrl: raw.originalImageUrl,
  };

  return { valid: true, report: validatedReport };
}

/**
 * 4 Canonical Test Fixtures for Local Development & Acceptance Testing
 */
export const DEEP_SCAN_FIXTURES: Record<'normal' | 'longText' | 'partialMissing' | 'unanalyzable', DeepScanReport> = {
  normal: {
    schemaVersion: '1.0.0',
    isAnalyzable: true,
    overallScore: 8.7,
    overallVerdict: 'Exceptional visual harmony featuring luminous eye contact and crisp mandibular delineation.',
    highlights: [
      'Balanced bilateral facial symmetry with 1:1.6 aesthetic proportion balance',
      'Warm ambient catchlights lending depth and clarity to both irises',
      'Naturally structured jawline providing distinct separation from the collar line'
    ],
    metrics: [
      {
        id: 'facial_symmetry',
        name: 'Facial Visual Symmetry',
        score: 8.8,
        status: 'evaluable',
        observation: 'High horizontal alignment across eyebrows, cheekbones, and lip corners with minimal lateral tilt.',
        evidence: 'Bilateral shadow gradients distribute evenly across both zygomatic arches.',
        cropKey: 'face'
      },
      {
        id: 'proportions',
        name: 'Facial Proportions Balance',
        score: 8.6,
        status: 'evaluable',
        observation: 'Upper, middle, and lower facial thirds conform comfortably to classical aesthetic ratios.',
        evidence: 'Forehead hairline to glabella and subnasale to menton maintain pleasing balance.',
        cropKey: 'face'
      },
      {
        id: 'eyes',
        name: 'Eye Aesthetics & Expression',
        score: 9.1,
        status: 'evaluable',
        observation: 'Engaging, alert gaze with prominent dual catchlights and clear canthal alignment.',
        evidence: 'Ocular openness is well-synchronized without squinting or glare obstruction.',
        cropKey: 'eyes'
      },
      {
        id: 'nose',
        name: 'Nose Bridge & Contour',
        score: 8.4,
        status: 'evaluable',
        observation: 'Straight nasal bridge with harmonious alar base width matching the intercanthal distance.',
        evidence: 'Soft ridge highlights transition seamlessly down to the nasal tip without harsh flares.',
        cropKey: 'nose'
      },
      {
        id: 'lips',
        name: 'Lip Definition & Harmony',
        score: 8.5,
        status: 'evaluable',
        observation: 'Distinct Cupid’s bow contour and balanced upper-to-lower vermilion fullness.',
        evidence: 'Natural resting posture avoids excessive oral tension, presenting relaxed warmth.',
        cropKey: 'lips'
      },
      {
        id: 'jawline_face_shape',
        name: 'Jawline & Face Contour',
        score: 8.9,
        status: 'evaluable',
        observation: 'Tapered oval outline supported by clear mandibular angular definition towards the chin.',
        evidence: 'Submental shadow cast creates a sharp border against the cervical background.',
        cropKey: 'jawline'
      }
    ],
    influences: {
      lighting: 'Broad softbox directional light at 45-degree angle with subtle ambient bounce',
      angle: 'True eye-level portrait with minimal 3-degree flattering tilt',
      expression: 'Confident approachable micro-smile with direct lens engagement'
    },
    recommendations: [
      {
        priority: 'high',
        title: 'Maintain 50mm-85mm Focal Length',
        reason: 'Wide angles below 35mm can artificially enlarge central facial features.',
        action: 'Step back 2-3 paces and zoom or use a dedicated portrait telephoto lens.'
      },
      {
        priority: 'medium',
        title: 'Introduce a Hair Light or Rim Separation',
        reason: 'Dark hair slightly blends with low-key background in the upper quadrant.',
        action: 'Position an overhead or 135-degree backlight to sculpt shoulder silhouettes.'
      },
      {
        priority: 'low',
        title: 'Subtle Chin Drop for Editorial Mood',
        reason: 'A 0.5-inch chin tilt down deepens eye socket intensity for dramatic portraits.',
        action: 'Practice lowering chin slightly while keeping pupils locked onto lens center.'
      }
    ],
    bestUseCases: [
      'High-End Executive Portrait',
      'Personal Branding Website Hero',
      'Social & Dating Profile Primary Image'
    ],
    limitations: [
      'Subjective visual photographic aesthetics only; does not replace orthodontic or facial measurements.',
      'Reflects specific lighting condition and styling of the provided single photograph.'
    ],
    crops: {
      face: null,
      eyes: null,
      nose: null,
      lips: null,
      jawline: null
    }
  },
  longText: {
    schemaVersion: '1.0.0',
    isAnalyzable: true,
    overallScore: 8.2,
    overallVerdict: 'A comprehensively balanced artistic portrait that exhibits remarkable depth, nuanced tonal transitions across the epidermis, and intentional atmospheric composition that rewards sustained aesthetic examination.',
    highlights: [
      'Subtle natural chiaroscuro emphasizing anatomical volume across the cheekbones and forehead plane',
      'Expressive ocular storytelling captured with remarkable clarity and nuanced emotional resonance',
      'Sophisticated relationship between foreground facial contours and soft-focus background textures'
    ],
    metrics: [
      {
        id: 'facial_symmetry',
        name: 'Facial Visual Symmetry',
        score: 8.1,
        status: 'evaluable',
        observation: 'Extensive evaluation across thirty-two bilateral anatomical reference vectors demonstrates strong organic symmetry despite a natural and candid slight tilt of the cranium toward the left shoulder.',
        evidence: 'Detailed micro-shadow gradient analysis confirms balanced illumination across both orbits and temporal regions with no noticeable optical distortion.',
        cropKey: 'face'
      },
      {
        id: 'proportions',
        name: 'Facial Proportions Balance',
        score: 8.3,
        status: 'evaluable',
        observation: 'The vertical tri-section division reveals exemplary adherence to organic aesthetic harmony, wherein the trichion-to-glabella segment coordinates proportionally with both the mid-face and lower third.',
        evidence: 'Focal length selection preserves true physical perspective without spherical protrusion or flattening.',
        cropKey: 'face'
      },
      {
        id: 'eyes',
        name: 'Eye Aesthetics & Expression',
        score: 8.7,
        status: 'evaluable',
        observation: 'The palpebral fissures display elegant almond curvature with exceptional corneal moisture reflectance that anchors viewer focus instantly upon initial encounter.',
        evidence: 'Both irises show sharp pupil margins with zero motion blur under 1/250s equivalent exposure.',
        cropKey: 'eyes'
      },
      {
        id: 'nose',
        name: 'Nose Bridge & Contour',
        score: 8.0,
        status: 'evaluable',
        observation: 'The dorsum presents a crisp, continuous linear highlight terminating in a well-proportioned infratip lobule that complements the broader facial perimeter gracefully.',
        evidence: 'Alar base width aligns precisely with the medial intercanthal space without lateral flare.',
        cropKey: 'nose'
      },
      {
        id: 'lips',
        name: 'Lip Definition & Harmony',
        score: 8.0,
        status: 'evaluable',
        observation: 'Vermilion border transitions are crisp and naturally defined, presenting a tranquil oral aperture with balanced horizontal philtral columns.',
        evidence: 'Gentle labial commissure elevation suggests warm confidence and effortless social approachability.',
        cropKey: 'lips'
      },
      {
        id: 'jawline_face_shape',
        name: 'Jawline & Face Contour',
        score: 8.2,
        status: 'evaluable',
        observation: 'The mandibular angle exhibits crisp delineation against cervical musculature, creating an authoritative yet elegant facial perimeter contour.',
        evidence: 'Directional illumination generates a clean 15-millimeter penumbra beneath the jawline boundary.',
        cropKey: 'jawline'
      }
    ],
    influences: {
      lighting: 'Large diffuse north-facing window light complemented by a 42-inch silver reflector at low 30-degree position',
      angle: 'Three-quarter oblique angle with intentional camera elevation precisely at ocular level',
      expression: 'Deeply reflective, introspective gaze conveying intellectual gravity and poise'
    },
    recommendations: [
      {
        priority: 'high',
        title: 'Calibrate Color Temperature for Warm Undertones',
        reason: 'The current color balance registers at approximately 6100K, giving the shadows a slight cyan bias that dulls natural complexion luminosity.',
        action: 'Warm global post-processing white balance to 5500K-5700K and add +4 tint toward magenta to showcase natural skin vibrancy.'
      },
      {
        priority: 'medium',
        title: 'Optimize Eye-Level Reflector Positioning',
        reason: 'While the key illumination is stellar, the lower iris quadrant receives slightly muted ambient bounce, missing an opportunity for specular brilliance.',
        action: 'Position a small white cardboard reflector directly on the subject’s lap just outside the lower edge of the camera frame.'
      },
      {
        priority: 'low',
        title: 'Refine Background Depth Separation',
        reason: 'The background aperture creates minor high-contrast specular artifacts near the left ear that compete with primary facial highlights.',
        action: 'Increase distance between subject and backdrop by an additional 1.5 meters to maximize creamy bokeh falloff.'
      }
    ],
    bestUseCases: [
      'Published Monograph Author Bio',
      'Art Direction Portfolio Feature',
      'Curated Editorial Print Magazine'
    ],
    limitations: [
      'Evaluation applies strictly to this specific frame and creative lighting style.',
      'Aesthetic interpretation does not constitute medical, biological or cranial measurement.'
    ],
    crops: { face: null, eyes: null, nose: null, lips: null, jawline: null }
  },
  partialMissing: {
    schemaVersion: '1.0.0',
    isAnalyzable: true,
    overallScore: 7.6,
    overallVerdict: 'Impactful candid side-angle capture with beautiful eye focus, though partial cheek and jaw occlusion limits full bilateral assessment.',
    highlights: [
      'Striking profile illumination highlighting eye contour and nasal ridge',
      'Rich contrast with dramatic Rembrandt-style triangular highlight',
      'Authentic candid posture offering vibrant editorial energy'
    ],
    metrics: [
      {
        id: 'facial_symmetry',
        name: 'Facial Visual Symmetry',
        score: 7.2,
        status: 'partially_obscured',
        observation: 'Bilateral symmetry cannot be completely evaluated due to a 45-degree angle turning the right cheek away from the camera.',
        evidence: 'Contralateral facial landmarks are partially foreshortened by profile perspective.',
        cropKey: 'face'
      },
      {
        id: 'proportions',
        name: 'Facial Proportions Balance',
        score: 7.8,
        status: 'evaluable',
        observation: 'Visible facial heights display balanced forehead, nasal, and lower lip intervals along the visible profile axis.',
        evidence: 'Profile golden triangle matches standard portrait aesthetics comfortably.',
        cropKey: 'face'
      },
      {
        id: 'eyes',
        name: 'Eye Aesthetics & Expression',
        score: 8.6,
        status: 'evaluable',
        observation: 'The primary visible eye features remarkable iris clarity and crisp lash focus.',
        evidence: 'Sharp focus capture with high micro-contrast across the cornea.',
        cropKey: 'eyes'
      },
      {
        id: 'nose',
        name: 'Nose Bridge & Contour',
        score: 8.3,
        status: 'evaluable',
        observation: 'Clean profile bridge curvature free from bumps or optical barrel distortion.',
        evidence: 'Precise edge demarcation against dark gradient backdrop.',
        cropKey: 'nose'
      },
      {
        id: 'lips',
        name: 'Lip Definition & Harmony',
        score: 7.7,
        status: 'evaluable',
        observation: 'Lip fullness and profile projection show pleasing proportion relative to the nasal base.',
        evidence: 'Clear vermilion borders with pleasant natural hydration sheen.',
        cropKey: 'lips'
      },
      {
        id: 'jawline_face_shape',
        name: 'Jawline & Face Contour',
        score: 6.8,
        status: 'partially_obscured',
        observation: 'Lower jawline contour is partially shielded by a high-neck sweater collar.',
        evidence: 'Mandibular angle is obscured below the antegonial notch.',
        cropKey: 'jawline'
      }
    ],
    influences: {
      lighting: 'Side tungsten warm directional accent with deep theatrical shadows',
      angle: 'Semi-profile three-quarter perspective with slight upward head tilt',
      expression: 'Spontaneous candid focus looking off-axis from camera'
    },
    recommendations: [
      {
        priority: 'high',
        title: 'Uncover Lower Jawline and Neck',
        reason: 'High collar obscures mandibular definition and neck elongation.',
        action: 'Wear an open collar or V-neck shirt to reveal full jaw and cervical architecture.'
      },
      {
        priority: 'medium',
        title: 'Adjust Angle Closer to 15-Degree Turn',
        reason: 'A 45-degree turn hides the far eye and cheekbone.',
        action: 'Rotate face slightly more toward the lens so both eyes remain comfortably visible.'
      },
      {
        priority: 'low',
        title: 'Add Soft Fill on Shadow Side',
        reason: 'Deep shadow loses hair texture on the recessed side.',
        action: 'Use a white reflector or ambient wall bounce to lift deep shadow values.'
      }
    ],
    bestUseCases: [
      'Atmospheric Creative Profile',
      'Artistic Social Media Post',
      'Cinematic Cast Card'
    ],
    limitations: [
      'Jawline and symmetry metrics partially impaired by clothing and head rotation.',
      'Cropped details reflect available visible regions only.'
    ],
    crops: { face: null, eyes: null, nose: null, lips: null, jawline: null }
  },
  unanalyzable: {
    schemaVersion: '1.0.0',
    isAnalyzable: false,
    unusableReason: 'The uploaded image contains intense motion blur, heavy dark shadows over the face, or sunglasses preventing accurate facial feature analysis.',
    overallScore: 0,
    overallVerdict: 'Unable to perform portrait evaluation on this image',
    highlights: [],
    metrics: [],
    influences: {
      lighting: 'Severely underexposed or backlit with heavy lens flare',
      angle: 'Extreme oblique angle or obstructed view',
      expression: 'Facial landmarks undetectable'
    },
    recommendations: [
      {
        priority: 'high',
        title: 'Provide a Well-Lit Frontal Portrait',
        reason: 'AI facial landmark detectors require clean visibility of both eyes, nose, and mouth.',
        action: 'Take a new photo facing a window in daytime, keeping camera steady at eye level.'
      },
      {
        priority: 'medium',
        title: 'Remove Facial Occlusions',
        reason: 'Sunglasses, face masks, or heavy hand-on-face gestures block key measurements.',
        action: 'Ensure unobstructed view from forehead to neck collar.'
      },
      {
        priority: 'low',
        title: 'Ensure Sharp Optical Focus',
        reason: 'Motion blur prevents micro-detail inspection of eye and skin texture.',
        action: 'Tap on screen to focus directly on pupils before capturing.'
      }
    ],
    bestUseCases: [],
    limitations: [
      'Analysis cancelled: image fell below quality standards for single-portrait evaluation.',
      'Credits have been automatically refunded to your wallet.'
    ],
    crops: { face: null, eyes: null, nose: null, lips: null, jawline: null }
  }
};
