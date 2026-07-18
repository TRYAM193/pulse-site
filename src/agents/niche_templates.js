/**
 * Niche-Specific Section Templates for AutoAgency
 * Provides industry-appropriate website layouts instead of one generic layout for all businesses.
 * The Structure Agent references this to generate contextually relevant HTML sections.
 */

const NICHE_ALIASES = {
  'coffee_shop': 'cafe', 'coffee': 'cafe',
  'fitness': 'gym', 'fitness_center': 'gym',
  'beauty_salon': 'hair_salon', 'salon': 'hair_salon',
  'mechanic': 'auto_repair', 'auto_shop': 'auto_repair',
  'attorney': 'law_firm', 'lawyer': 'law_firm', 'legal': 'law_firm',
  'accountant': 'accounting', 'bookkeeper': 'accounting',
  'barber': 'barber_shop',
  'massage': 'spa', 'wellness': 'spa', 'day_spa': 'spa',
  'tattoo': 'tattoo_parlor',
  'vet': 'veterinarian',
  'yoga': 'yoga_studio', 'pilates': 'yoga_studio',
  'tutor': 'tutoring', 'education': 'tutoring',
  'garden': 'landscaping', 'lawn_care': 'landscaping',
  'maid': 'cleaning_service', 'house_cleaning': 'cleaning_service',
  'nail_tech': 'nail_salon', 'nails': 'nail_salon',
  'photographer': 'photography', 'photo': 'photography',
  'wedding': 'wedding_planner',
  'decorator': 'interior_design',
  'eye_doctor': 'optometrist',
  'insurance_agent': 'insurance',
  'chiro': 'chiropractor',
};

/**
 * All niche template definitions.
 * Each template specifies:
 *   sections     — ordered list of sections to render
 *   servicesStyle — how to present services/pricing
 *   ctaText      — primary call-to-action button label
 *   bookingLabel — booking form heading
 *   specialSections — niche-specific bonus sections
 *   aboutStyle   — how to present the about section
 *   sectionHints — plain-english instructions per special section for the Structure Agent prompt
 */
const NICHE_TEMPLATES = {
  cafe: {
    sections: ['hero', 'menu_highlights', 'about', 'gallery', 'testimonials', 'location_hours', 'booking'],
    servicesStyle: 'menu_grid',
    ctaText: 'Order Now',
    bookingLabel: 'Reserve a Table',
    specialSections: ['menu_highlights'],
    aboutStyle: 'story_with_stats',
    sectionHints: {
      menu_highlights: 'Render the services as a visual food/drink menu grid. Each item gets a card with name, price, and a short appetizing description. Group items by category if possible (Hot Drinks, Cold Brews, Pastries). Use warm amber/coffee tones for accents.',
    },
  },

  bakery: {
    sections: ['hero', 'menu_highlights', 'about', 'gallery', 'testimonials', 'location_hours', 'booking'],
    servicesStyle: 'menu_grid',
    ctaText: 'Order Fresh',
    bookingLabel: 'Place a Custom Order',
    specialSections: ['menu_highlights'],
    aboutStyle: 'story_with_images',
    sectionHints: {
      menu_highlights: 'Display baked goods as a visual menu with warm, inviting cards. Each item shows name, price, and a description. Use soft gold/cream accent colors. Group by Breads, Pastries, Cakes, Custom Orders.',
    },
  },

  restaurant: {
    sections: ['hero', 'menu_highlights', 'about', 'gallery', 'testimonials', 'location_hours', 'booking'],
    servicesStyle: 'categorized_menu',
    ctaText: 'Reserve a Table',
    bookingLabel: 'Make a Reservation',
    specialSections: ['menu_highlights'],
    aboutStyle: 'story_with_images',
    sectionHints: {
      menu_highlights: 'Present the restaurant menu as an elegant categorized list (Starters, Mains, Desserts, Drinks). Each item shows name, price, and a one-line description. Use the brand accent colors for category headers. Include a "View Full Menu" CTA if more than 6 items.',
    },
  },

  hair_salon: {
    sections: ['hero', 'services_pricelist', 'about', 'gallery', 'testimonials', 'location_hours', 'booking'],
    servicesStyle: 'pricelist_with_duration',
    ctaText: 'Book Appointment',
    bookingLabel: 'Schedule Your Session',
    specialSections: ['services_pricelist'],
    aboutStyle: 'story_with_images',
    sectionHints: {
      services_pricelist: 'Render services as a clean price list table. Each row: service name on the left, duration in the middle (e.g. "45 mins"), price on the right. Add category headers if services span multiple types (Cuts, Color, Treatments). The most popular service gets a subtle "Popular" badge.',
    },
  },

  barber_shop: {
    sections: ['hero', 'services_pricelist', 'about', 'gallery', 'testimonials', 'location_hours', 'booking'],
    servicesStyle: 'pricelist_with_duration',
    ctaText: 'Book a Cut',
    bookingLabel: 'Reserve Your Seat',
    specialSections: ['services_pricelist'],
    aboutStyle: 'story_with_stats',
    sectionHints: {
      services_pricelist: 'Display barber services as a masculine, clean price list. Bold service names, duration, and price. Use a dark card background with sharp borders. Add a "Walk-ins Welcome" badge if applicable.',
    },
  },

  nail_salon: {
    sections: ['hero', 'services_pricelist', 'about', 'gallery', 'testimonials', 'location_hours', 'booking'],
    servicesStyle: 'pricelist_with_duration',
    ctaText: 'Book Appointment',
    bookingLabel: 'Schedule Your Mani-Pedi',
    specialSections: ['services_pricelist'],
    aboutStyle: 'story_with_images',
    sectionHints: {
      services_pricelist: 'Show nail services as an elegant price list grouped by category: Manicure, Pedicure, Nail Art, Gel/Acrylic. Use soft pink/rose gold accents. Each row shows service name, duration, and price.',
    },
  },

  gym: {
    sections: ['hero', 'membership_tiers', 'about', 'gallery', 'testimonials', 'location_hours', 'booking'],
    servicesStyle: 'membership_cards',
    ctaText: 'Join Now',
    bookingLabel: 'Start Your Free Trial',
    specialSections: ['membership_tiers'],
    aboutStyle: 'stats_focused',
    sectionHints: {
      membership_tiers: 'Present services/memberships as side-by-side pricing tier cards (like SaaS pricing pages). Each card: tier name at top, large price, list of included features with checkmarks, and a CTA button. The middle/recommended tier gets a highlighted border and "Most Popular" badge.',
    },
  },

  yoga_studio: {
    sections: ['hero', 'services', 'about', 'gallery', 'testimonials', 'location_hours', 'booking'],
    servicesStyle: 'zen_cards',
    ctaText: 'Book a Class',
    bookingLabel: 'Reserve Your Mat',
    specialSections: [],
    aboutStyle: 'story_with_images',
    sectionHints: {},
  },

  spa: {
    sections: ['hero', 'services_pricelist', 'about', 'gallery', 'testimonials', 'location_hours', 'booking'],
    servicesStyle: 'pricelist_with_duration',
    ctaText: 'Book Treatment',
    bookingLabel: 'Reserve Your Session',
    specialSections: ['services_pricelist'],
    aboutStyle: 'story_with_images',
    sectionHints: {
      services_pricelist: 'Display spa treatments as a luxurious price list. Group by: Massages, Facials, Body Treatments, Packages. Use calming teal/sage green accents. Each entry: treatment name, description, duration, and price.',
    },
  },

  dentist: {
    sections: ['hero', 'services', 'about', 'gallery', 'testimonials', 'location_hours', 'booking'],
    servicesStyle: 'icon_cards',
    ctaText: 'Book Appointment',
    bookingLabel: 'Schedule Your Visit',
    specialSections: [],
    aboutStyle: 'credentials_focused',
    sectionHints: {},
  },

  chiropractor: {
    sections: ['hero', 'services', 'about', 'gallery', 'testimonials', 'location_hours', 'booking'],
    servicesStyle: 'icon_cards',
    ctaText: 'Book Session',
    bookingLabel: 'Schedule Your Adjustment',
    specialSections: [],
    aboutStyle: 'credentials_focused',
    sectionHints: {},
  },

  optometrist: {
    sections: ['hero', 'services', 'about', 'gallery', 'testimonials', 'location_hours', 'booking'],
    servicesStyle: 'icon_cards',
    ctaText: 'Book Eye Exam',
    bookingLabel: 'Schedule Your Appointment',
    specialSections: [],
    aboutStyle: 'credentials_focused',
    sectionHints: {},
  },

  veterinarian: {
    sections: ['hero', 'services', 'about', 'gallery', 'testimonials', 'location_hours', 'booking'],
    servicesStyle: 'icon_cards',
    ctaText: 'Book Visit',
    bookingLabel: 'Schedule Pet Appointment',
    specialSections: [],
    aboutStyle: 'story_with_images',
    sectionHints: {},
  },

  real_estate: {
    sections: ['hero', 'services', 'about', 'gallery', 'testimonials', 'location_hours', 'booking'],
    servicesStyle: 'consultation_tiers',
    ctaText: 'Request Valuation',
    bookingLabel: 'Schedule Consultation',
    specialSections: [],
    aboutStyle: 'stats_focused',
    sectionHints: {},
  },

  law_firm: {
    sections: ['hero', 'services', 'about', 'gallery', 'testimonials', 'location_hours', 'booking'],
    servicesStyle: 'practice_area_cards',
    ctaText: 'Free Consultation',
    bookingLabel: 'Schedule a Consultation',
    specialSections: [],
    aboutStyle: 'credentials_focused',
    sectionHints: {},
  },

  accounting: {
    sections: ['hero', 'services', 'about', 'gallery', 'testimonials', 'location_hours', 'booking'],
    servicesStyle: 'standard_cards',
    ctaText: 'Get a Quote',
    bookingLabel: 'Schedule a Meeting',
    specialSections: [],
    aboutStyle: 'credentials_focused',
    sectionHints: {},
  },

  insurance: {
    sections: ['hero', 'services', 'about', 'gallery', 'testimonials', 'location_hours', 'booking'],
    servicesStyle: 'standard_cards',
    ctaText: 'Get a Quote',
    bookingLabel: 'Request a Free Quote',
    specialSections: [],
    aboutStyle: 'story_with_stats',
    sectionHints: {},
  },

  plumber: {
    sections: ['hero', 'services', 'about', 'gallery', 'testimonials', 'location_hours', 'booking'],
    servicesStyle: 'standard_cards',
    ctaText: 'Call Now',
    bookingLabel: 'Request Service',
    specialSections: [],
    aboutStyle: 'story_with_stats',
    sectionHints: {},
  },

  auto_repair: {
    sections: ['hero', 'services', 'about', 'gallery', 'testimonials', 'location_hours', 'booking'],
    servicesStyle: 'standard_cards',
    ctaText: 'Book Service',
    bookingLabel: 'Schedule Auto Service',
    specialSections: [],
    aboutStyle: 'story_with_stats',
    sectionHints: {},
  },

  pet_grooming: {
    sections: ['hero', 'services_pricelist', 'about', 'gallery', 'testimonials', 'location_hours', 'booking'],
    servicesStyle: 'pricelist_with_duration',
    ctaText: 'Book Grooming',
    bookingLabel: 'Schedule Pet Grooming',
    specialSections: ['services_pricelist'],
    aboutStyle: 'story_with_images',
    sectionHints: {
      services_pricelist: 'Show grooming packages as cards grouped by pet size (Small, Medium, Large). Each card: package name, what\'s included (bath, haircut, nail trim), duration, and price.',
    },
  },

  photography: {
    sections: ['hero', 'services', 'about', 'gallery', 'testimonials', 'location_hours', 'booking'],
    servicesStyle: 'consultation_tiers',
    ctaText: 'Book a Session',
    bookingLabel: 'Reserve Your Photoshoot',
    specialSections: [],
    aboutStyle: 'story_with_images',
    sectionHints: {},
  },

  tattoo_parlor: {
    sections: ['hero', 'services_pricelist', 'about', 'gallery', 'testimonials', 'location_hours', 'booking'],
    servicesStyle: 'pricelist_with_duration',
    ctaText: 'Book Consultation',
    bookingLabel: 'Schedule Your Session',
    specialSections: ['services_pricelist'],
    aboutStyle: 'story_with_images',
    sectionHints: {
      services_pricelist: 'Display tattoo services as a bold price list. Categories: Small Tattoos, Medium Pieces, Full Sleeves, Custom Work, Piercings. Use dark/edgy styling with the brand accent colors.',
    },
  },

  florist: {
    sections: ['hero', 'menu_highlights', 'about', 'gallery', 'testimonials', 'location_hours', 'booking'],
    servicesStyle: 'menu_grid',
    ctaText: 'Order Flowers',
    bookingLabel: 'Place a Custom Order',
    specialSections: ['menu_highlights'],
    aboutStyle: 'story_with_images',
    sectionHints: {
      menu_highlights: 'Present flower arrangements as a visual product grid. Each card: arrangement name, occasion type (Wedding, Birthday, Sympathy), price, and description. Use soft floral pastel accents.',
    },
  },

  cleaning_service: {
    sections: ['hero', 'services', 'about', 'gallery', 'testimonials', 'location_hours', 'booking'],
    servicesStyle: 'standard_cards',
    ctaText: 'Get a Free Estimate',
    bookingLabel: 'Book a Cleaning',
    specialSections: [],
    aboutStyle: 'story_with_stats',
    sectionHints: {},
  },

  landscaping: {
    sections: ['hero', 'services', 'about', 'gallery', 'testimonials', 'location_hours', 'booking'],
    servicesStyle: 'standard_cards',
    ctaText: 'Get a Free Quote',
    bookingLabel: 'Schedule Service',
    specialSections: [],
    aboutStyle: 'story_with_stats',
    sectionHints: {},
  },

  wedding_planner: {
    sections: ['hero', 'services', 'about', 'gallery', 'testimonials', 'location_hours', 'booking'],
    servicesStyle: 'consultation_tiers',
    ctaText: 'Start Planning',
    bookingLabel: 'Schedule a Consultation',
    specialSections: [],
    aboutStyle: 'story_with_images',
    sectionHints: {},
  },

  interior_design: {
    sections: ['hero', 'services', 'about', 'gallery', 'testimonials', 'location_hours', 'booking'],
    servicesStyle: 'consultation_tiers',
    ctaText: 'Book Consultation',
    bookingLabel: 'Schedule a Design Session',
    specialSections: [],
    aboutStyle: 'story_with_images',
    sectionHints: {},
  },

  tutoring: {
    sections: ['hero', 'services', 'about', 'gallery', 'testimonials', 'location_hours', 'booking'],
    servicesStyle: 'standard_cards',
    ctaText: 'Book a Session',
    bookingLabel: 'Schedule Tutoring',
    specialSections: [],
    aboutStyle: 'story_with_stats',
    sectionHints: {},
  },
};

/** Default template for unknown niches */
const DEFAULT_TEMPLATE = {
  sections: ['hero', 'services', 'about', 'gallery', 'testimonials', 'location_hours', 'booking'],
  servicesStyle: 'standard_cards',
  ctaText: 'Get Started',
  bookingLabel: 'Book Now',
  specialSections: [],
  aboutStyle: 'story_with_stats',
  sectionHints: {},
};

/**
 * Returns the niche-specific template for a given niche string.
 * Resolves aliases automatically.
 * @param {string} niche - The business niche
 * @returns {object} Template configuration object
 */
export function getNicheTemplate(niche) {
  if (!niche) return DEFAULT_TEMPLATE;
  const key = NICHE_ALIASES[niche.toLowerCase().trim()] || niche.toLowerCase().trim();
  return NICHE_TEMPLATES[key] || DEFAULT_TEMPLATE;
}

/**
 * Generates a structured prompt fragment for the Structure Agent describing
 * how to render sections for a specific niche. Injected into the HTML generation prompt.
 * @param {string} niche - The business niche
 * @param {object} [template] - Optional pre-resolved template
 * @returns {string} Markdown prompt instructions for the Structure Agent
 */
export function getNicheSectionPrompt(niche, template) {
  const t = template || getNicheTemplate(niche);

  let prompt = `
## NICHE-SPECIFIC LAYOUT INSTRUCTIONS (${niche})

### Section Order
Render the following sections in this EXACT order:
${t.sections.map((s, i) => `${i + 1}. ${s}`).join('\n')}

### Primary CTA Button Text
Use "${t.ctaText}" as the main call-to-action button text in the Hero section and navigation.

### Booking Form Heading
Use "${t.bookingLabel}" as the heading for the booking/contact form section.

### Services Display Style: "${t.servicesStyle}"
`;

  // Add style-specific instructions
  switch (t.servicesStyle) {
    case 'pricelist_with_duration':
      prompt += `Present services as a clean, elegant price list table inside a card. Each row has: service name (left), duration (center, muted), price (right, bold). Group by category if 4+ services. The most popular service gets a subtle "Popular" badge.\n`;
      break;
    case 'menu_grid':
      prompt += `Present services as a visual grid of menu item cards (2-3 columns). Each card: item name (bold), short appetizing description, and price. Use warm accent colors for category headers.\n`;
      break;
    case 'categorized_menu':
      prompt += `Present services as an elegant categorized list grouped by type. Category name as a styled header, items below as rows with name, description, and price. Maintain visual hierarchy.\n`;
      break;
    case 'membership_cards':
      prompt += `Present services as side-by-side pricing tier cards (like SaaS pricing). Each card: tier name at top, large price, bullet list of features with checkmarks, CTA button. Middle tier = "Most Popular" badge + highlighted border.\n`;
      break;
    case 'icon_cards':
      prompt += `Present services as icon-based feature cards in a 2x2 or 3-column grid. Each card: SVG icon at top, service name, short description, and price. Use the brand primary/accent colors for icons.\n`;
      break;
    case 'consultation_tiers':
      prompt += `Present services as consultation packages in side-by-side cards. Each card: package name, price, what's included, and "Book" CTA. The premium tier gets a highlighted gradient border.\n`;
      break;
    case 'practice_area_cards':
      prompt += `Present services as practice area/specialty cards in a grid. Each card: bold area name, brief description. No prices visible — use "Schedule Consultation" CTA instead.\n`;
      break;
    case 'zen_cards':
      prompt += `Present services as calm, minimalist cards with generous whitespace. Use soft, muted colors. Each card: class/service name, duration, price, and a short description.\n`;
      break;
    default:
      prompt += `Present services as standard feature cards in a responsive grid. Each card: service name, description, price, and duration. Clean, professional layout.\n`;
  }

  // Add about style instructions
  prompt += `\n### About Section Style: "${t.aboutStyle}"\n`;
  switch (t.aboutStyle) {
    case 'story_with_stats':
      prompt += `Left column: brand story text + two stat counters (e.g. "99% Satisfaction", "$50M+ Revenue"). Right column: 2x2 image grid.\n`;
      break;
    case 'story_with_images':
      prompt += `Left column: brand story text with a "Learn More" link. Right column: large featured image or 2x2 image grid.\n`;
      break;
    case 'stats_focused':
      prompt += `Full-width section with brand story above, and a row of 3-4 large stat counters below (e.g. "500+ Members", "10 Years", "50+ Classes").\n`;
      break;
    case 'credentials_focused':
      prompt += `Left column: brand story + credentials/certifications list. Right column: professional headshot or office image. Emphasize trust and expertise.\n`;
      break;
  }

  // Add special section rendering hints
  if (t.specialSections.length > 0) {
    prompt += '\n### Special Section Rendering\n';
    for (const section of t.specialSections) {
      if (t.sectionHints[section]) {
        prompt += `**${section}**: ${t.sectionHints[section]}\n\n`;
      }
    }
  }

  return prompt;
}
