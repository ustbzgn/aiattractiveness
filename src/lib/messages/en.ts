export const messages = {
  nav: {
    history: 'History',
    pricing: 'Credit Packs',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    tagline: 'Portrait Feedback & Suggestions',
    credits: 'Credits',
  },
  hero: {
    title: 'Portrait Feedback & Lighting Suggestions',
    subtitle:
      'Objective analysis of portrait lighting, framing, expression, and sharpness with practical suggestions for your photos.',
  },
  tabs: {
    fastTest: {
      id: 'fast',
      label: 'Fast Test',
      description: 'Quick single-photo overview of lighting, framing, and presentation.',
    },
    deepScan: {
      id: 'deep',
      label: 'Deep Scan',
      description: 'Detailed feedback on lighting, framing, expression, and sharpness with helpful portrait tips.',
    },
    compare: {
      id: 'compare',
      label: 'Face Compare',
      description: 'Direct side-by-side comparison between two portraits to evaluate lighting and framing.',
    },
  },
  upload: {
    singleTitle: 'Upload portrait photo',
    singleSubtitle: 'Drag & drop or press Enter / Space to browse files',
    compareSlot1: 'Photo A (Baseline)',
    compareSlot2: 'Photo B (Alternative)',
    slotHint: 'Click or press Enter to choose photo',
    constraints: 'Supports JPG, PNG, WebP, GIF up to 10MB',
    remove: 'Remove photo',
    replace: 'Replace photo',
    startAnalysis: 'Run Portrait Analysis',
    comparingAnalysis: 'Compare Two Portraits',
    emptyStateSingle: 'Please select an image to evaluate.',
    emptyStateCompare: 'Please upload both Photo A and Photo B to compare.',
  },
  validation: {
    invalidType: 'Unsupported file format. Please upload JPEG, PNG, WebP, or GIF.',
    fileTooLarge: 'File is too large. Maximum allowed size is 10MB.',
  },
  apiFeedback: {
    title: 'Analysis Engine Status',
    badge: 'Preview Mode',
    message: 'Portrait evaluation engine is currently in live preview. No credits were deducted.',
    subtext:
      'Review the report below to see detailed feedback on lighting, framing, expression, and sharpness.',
  },
  sampleReport: {
    badge: 'Illustrative Sample Report',
    disclaimer:
      'Notice: This sample report is an illustrative demonstration showing feedback format and scoring categories. It is not derived from your uploaded photo.',
    overallScore: '8.4',
    scoreLabel: 'Sample Overall Rating',
    metrics: [
      { name: 'Lighting Balance', score: '8.5 / 10', note: 'Soft, balanced illumination across the face with gentle natural contrast.' },
      { name: 'Framing & Composition', score: '8.2 / 10', note: 'Centered composition with comfortable headroom and balanced eye line.' },
      { name: 'Facial Expression', score: '8.8 / 10', note: 'Approachable, relaxed expression with authentic posture.' },
      { name: 'Subject Sharpness', score: '8.1 / 10', note: 'Crisp ocular focus with clean subject-to-background separation.' },
    ],
    summaryHeading: 'Portrait Feedback Summary',
    summaryText:
      'The portrait displays pleasant key lighting with even illumination and an approachable expression. The framing keeps the subject naturally anchored. Tilting the camera angle slightly to match eye height can improve portrait balance.',
  },
  faq: {
    title: 'Frequently Asked Questions',
    items: [
      {
        question: 'What kind of feedback does this tool provide?',
        answer:
          'Feedback focuses on everyday photography elements: lighting quality, composition framing, facial expression readability, and image sharpness.',
      },
      {
        question: 'How do one-time credits work?',
        answer:
          'You buy a bundle of credits once with no recurring subscription. Each portrait analysis deducts credits from your balance.',
      },
      {
        question: 'Can I compare two different photos?',
        answer:
          'Yes. Use the Face Compare tab to load two portraits side by side and see comparative notes on lighting, angle, and framing.',
      },
      {
        question: 'What file formats and sizes can I upload?',
        answer:
          'You can upload JPEG, PNG, WebP, or GIF image files up to 10MB in size.',
      },
    ],
  },
  routes: {
    pricing: {
      title: 'Portrait Credits',
      subtitle: 'Acquire credits for detailed lighting, framing, and expression analysis on your portraits.',
      cta: 'Get Credits',
    },
    history: {
      title: 'Analysis History',
      subtitle: 'View your completed portrait reports and comparisons.',
      emptyTitle: 'No scans recorded yet',
      emptyMessage:
        'Your completed portrait analyses will be saved here when logged in with an active account.',
      action: 'Start a Portrait Test',
    },
    signIn: {
      title: 'Sign In to Your Account',
      subtitle: 'Manage your credit balance and view portrait history.',
      missingConfigNotice:
        'Authentication service is running in local preview mode. Configure BETTER_AUTH_SECRET to enable persistent sessions.',
      emailLabel: 'Email address',
      passwordLabel: 'Password',
      emailPlaceholder: 'you@example.com',
      button: 'Sign In / Register',
      disclaimer: 'By signing in, you access your credit wallet and saved portrait history.',
    },
    checkoutStatus: {
      title: 'Order Status',
      subtitle: 'Confirming your payment and updating your credit balance.',
      pendingMessage: 'Your order is currently processing. Your credits will appear in your balance momentarily.',
      successMessage: 'Payment confirmed! Your credits have been added to your balance.',
      failedMessage: 'Payment was canceled or could not be completed.',
      orderIdLabel: 'Order Reference',
      creditsAddedLabel: 'Credits Granted',
      returnToPricing: 'Back to Credit Packs',
      startTesting: 'Analyze a Portrait',
    },
  },
  footer: {
    copyright: '© 2026 Attractiveness AI. All rights reserved.',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    contact: 'Contact Support',
  },
} as const;
