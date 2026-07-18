import { ai, generateContentWithRetry } from '../utils/ai_helper.js';

/**
 * Maps business niches to Schema.org types for LocalBusiness structured data.
 */
const NICHE_SCHEMA_TYPES = {
  hair_salon: 'HairSalon',
  barber_shop: 'BarberShop',
  restaurant: 'Restaurant',
  cafe: 'CafeOrCoffeeShop',
  bakery: 'Bakery',
  dentist: 'Dentist',
  gym: 'HealthClub',
  yoga_studio: 'HealthClub',
  spa: 'DaySpa',
  law_firm: 'LegalService',
  accounting: 'AccountingService',
  real_estate: 'RealEstateAgent',
  plumber: 'Plumber',
  auto_repair: 'AutoRepair',
  veterinarian: 'VeterinaryCare',
  florist: 'Florist',
  photography: 'ProfessionalService',
  tattoo_parlor: 'TattooParlor',
  cleaning_service: 'ProfessionalService',
  landscaping: 'ProfessionalService',
  nail_salon: 'NailSalon',
  chiropractor: 'Chiropractor',
  optometrist: 'Optician',
  insurance: 'InsuranceAgency',
  wedding_planner: 'ProfessionalService',
  interior_design: 'ProfessionalService',
  tutoring: 'EducationalOrganization',
  pet_grooming: 'ProfessionalService',
};

/**
 * SEO Agent: Generates search engine optimization metadata for local business websites.
 * Produces meta tags, Schema.org LocalBusiness JSON-LD, robots.txt, and sitemap.xml.
 * 
 * @param {object} lead - Lead data with id, businessName, niche, city, address, phone
 * @param {object} brief - The complete Design Brief JSON
 * @returns {Promise<object>} SEO metadata object
 */
export async function generateSeoMetadata(lead, brief) {
  console.log(`[SEOAgent] Generating SEO metadata for: ${lead.businessName}`);

  const niche = lead.niche || 'default';
  const city = lead.city || brief.contact?.address?.split(',')?.slice(-2, -1)?.[0]?.trim() || '';
  const state = brief.contact?.address?.split(',')?.slice(-1)?.[0]?.trim() || '';
  const schemaType = NICHE_SCHEMA_TYPES[niche] || 'LocalBusiness';

  // Use Gemini to generate optimized title + description
  const prompt = `
You are an SEO specialist for local businesses. Generate optimized meta tags for this business:

Business: ${lead.businessName}
Type: ${niche.replace(/_/g, ' ')}
City: ${city}
Services: ${JSON.stringify((brief.services || []).map(s => s.name || s))}
About: ${brief.nicheCopy?.aboutBody || ''}

Return a JSON object with exactly these keys:
{
  "title": "Business Name - Tagline | City, State (60-70 chars max)",
  "description": "Compelling meta description with keywords, location, and call-to-action (150-160 chars max)",
  "ogTitle": "Slightly different, more engaging title for social shares",
  "ogDescription": "Social-optimized description with emoji-free professional tone (100-150 chars)"
}

Rules:
- Include the city name naturally in both title and description
- Include the primary service keyword in the title
- Description must contain a call-to-action phrase
- Do NOT use generic phrases like "best in town" or "number one"
- Return ONLY the raw JSON string. Do NOT wrap in markdown code blocks.
`;

  let metaTags;
  try {
    const response = await generateContentWithRetry({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: { temperature: 0.3 }
    });

    let responseText = response.text.trim();
    if (responseText.startsWith('```')) {
      responseText = responseText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }
    metaTags = JSON.parse(responseText);
  } catch (err) {
    console.warn(`[SEOAgent] Failed to generate meta tags via AI, using fallback: ${err.message}`);
    const niceName = niche.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    metaTags = {
      title: `${lead.businessName} - Professional ${niceName} | ${city}${state ? ', ' + state : ''}`,
      description: `${lead.businessName} offers premium ${niceName.toLowerCase()} services in ${city}. Book your appointment today and experience the difference.`,
      ogTitle: `${lead.businessName} | ${niceName} in ${city}`,
      ogDescription: `Discover professional ${niceName.toLowerCase()} services at ${lead.businessName} in ${city}.`,
    };
  }

  // Add static fields
  metaTags.ogImage = (brief.brandImages && brief.brandImages[0]) || '';
  metaTags.twitterCard = 'summary_large_image';

  // Generate Schema.org LocalBusiness JSON-LD
  const schemaOrg = generateSchemaOrg(lead, brief, schemaType, city, state);

  // Generate robots.txt
  const siteUrl = brief.customDomain
    ? `https://${brief.customDomain}`
    : `https://autoagency.app/client/${lead.id}`;

  const robotsTxt = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /portal/

Sitemap: ${siteUrl}/sitemap.xml`;

  // Generate sitemap.xml
  const today = new Date().toISOString().split('T')[0];
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

  console.log(`[SEOAgent] SEO metadata generated successfully for: ${lead.businessName}`);

  return {
    metaTags,
    schemaOrg,
    robotsTxt,
    sitemapXml,
  };
}

/**
 * Generates Schema.org LocalBusiness structured data in JSON-LD format.
 * @param {object} lead
 * @param {object} brief
 * @param {string} schemaType
 * @param {string} city
 * @param {string} state
 * @returns {string} JSON-LD string
 */
function generateSchemaOrg(lead, brief, schemaType, city, state) {
  const services = Array.isArray(brief.services) ? brief.services : [];
  const testimonials = Array.isArray(brief.testimonials) ? brief.testimonials : [];

  // Calculate price range from services
  let priceRange = '$$';
  if (services.length > 0) {
    const prices = services.map(s => s.price || 0).filter(p => p > 0);
    if (prices.length > 0) {
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      priceRange = `$${min} - $${max}`;
    }
  }

  // Calculate aggregate rating from testimonials
  let aggregateRating = null;
  if (testimonials.length > 0) {
    const ratings = testimonials.map(t => t.rating || 5);
    const avgRating = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
    aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: avgRating,
      reviewCount: testimonials.length.toString(),
      bestRating: '5',
      worstRating: '1',
    };
  }

  // Parse opening hours from brief
  const openingHours = [];
  if (brief.hours && typeof brief.hours === 'object') {
    const dayMap = {
      Monday: 'Mo', Tuesday: 'Tu', Wednesday: 'We',
      Thursday: 'Th', Friday: 'Fr', Saturday: 'Sa', Sunday: 'Su'
    };

    for (const [day, hours] of Object.entries(brief.hours)) {
      if (hours && hours.toLowerCase() !== 'closed') {
        const abbr = dayMap[day] || day.substring(0, 2);
        // Parse "9am-6pm" → "09:00-18:00"
        const timeMatch = hours.match(/(\d{1,2})\s*(am|pm)\s*[-–]\s*(\d{1,2})\s*(am|pm)/i);
        if (timeMatch) {
          let openH = parseInt(timeMatch[1]);
          let closeH = parseInt(timeMatch[3]);
          if (timeMatch[2].toLowerCase() === 'pm' && openH !== 12) openH += 12;
          if (timeMatch[4].toLowerCase() === 'pm' && closeH !== 12) closeH += 12;
          if (timeMatch[2].toLowerCase() === 'am' && openH === 12) openH = 0;
          if (timeMatch[4].toLowerCase() === 'am' && closeH === 12) closeH = 0;
          openingHours.push({
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: abbr,
            opens: `${openH.toString().padStart(2, '0')}:00`,
            closes: `${closeH.toString().padStart(2, '0')}:00`,
          });
        }
      }
    }
  }

  // Parse address into components
  const addressParts = (brief.contact?.address || lead.address || '').split(',').map(s => s.trim());
  const streetAddress = addressParts[0] || '';
  const addressLocality = addressParts.length > 1 ? addressParts[1] : city;
  const addressRegion = addressParts.length > 2 ? addressParts[2] : state;

  const schema = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: lead.businessName,
    description: brief.nicheCopy?.aboutBody || `Professional ${lead.niche?.replace(/_/g, ' ')} services`,
    url: brief.customDomain ? `https://${brief.customDomain}` : `https://autoagency.app/client/${lead.id}/`,
    telephone: brief.contact?.phone || lead.phone || '',
    email: brief.contact?.email || '',
    address: {
      '@type': 'PostalAddress',
      streetAddress,
      addressLocality,
      addressRegion,
    },
    priceRange,
    image: (brief.brandImages && brief.brandImages.length > 0) ? brief.brandImages : [],
  };

  if (aggregateRating) {
    schema.aggregateRating = aggregateRating;
  }

  if (openingHours.length > 0) {
    schema.openingHoursSpecification = openingHours;
  }

  return JSON.stringify(schema, null, 2);
}

/**
 * Generates an HTML string containing the SEO meta tags and JSON-LD script tag.
 * This should be injected into the <head> of the generated HTML.
 * @param {object} seoData - Output from generateSeoMetadata()
 * @returns {string} HTML string for the <head>
 */
export function renderSeoHead(seoData) {
  const { metaTags, schemaOrg } = seoData;

  return `
    <!-- SEO Meta Tags -->
    <title>${escapeHtml(metaTags.title)}</title>
    <meta name="description" content="${escapeHtml(metaTags.description)}">
    <meta property="og:title" content="${escapeHtml(metaTags.ogTitle)}">
    <meta property="og:description" content="${escapeHtml(metaTags.ogDescription)}">
    ${metaTags.ogImage ? `<meta property="og:image" content="${escapeHtml(metaTags.ogImage)}">` : ''}
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="${metaTags.twitterCard}">
    <meta name="twitter:title" content="${escapeHtml(metaTags.ogTitle)}">
    <meta name="twitter:description" content="${escapeHtml(metaTags.ogDescription)}">
    ${metaTags.ogImage ? `<meta name="twitter:image" content="${escapeHtml(metaTags.ogImage)}">` : ''}
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="">

    <!-- Schema.org LocalBusiness Structured Data -->
    <script type="application/ld+json">
${schemaOrg}
    </script>
`;
}

/**
 * Escapes HTML special characters in a string.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
