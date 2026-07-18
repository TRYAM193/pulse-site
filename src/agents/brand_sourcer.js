import fs from 'fs';
import path from 'path';

// Stable, high-quality public Unsplash image assets for each business niche
const NICHE_IMAGE_ASSETS = {
  hair_salon: [
    "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80", // Modern chic salon interior (Teal / Charcoal / Wood)
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80"  // Hair stylist styling hair
  ],
  plumber: [
    "https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?w=600&q=80", // Copper pipes, professional tools (Copper / Blue)
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80"  // Plumber working under sink
  ],
  dentist: [
    "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600&q=80", // Modern minimalist dental office (White / Aqua / Blue)
    "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=600&q=80"  // Dental clean room
  ],
  restaurant: [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80", // Ambient bistro restaurant (Amber / Warm Wood / Matte Black)
    "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=600&q=80"  // Elegant dining tables
  ],
  default: [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80"  // Modern corporate office interior
  ]
};

/**
 * Brand Sourcing Agent: Gathers brand photo assets and downloads them for multimodal analysis.
 * @param {object} lead
 * @returns {Promise<object>} Object containing { imageUrls, base64Assets }
 */
export async function sourceBrandAssets(lead) {
  console.log(`[BrandSourcer] Gathering visual assets for: ${lead.businessName}`);
  
  const urls = NICHE_IMAGE_ASSETS[lead.niche] || NICHE_IMAGE_ASSETS.default;
  const base64Assets = [];

  for (const url of urls) {
    try {
      console.log(`[BrandSourcer] Fetching asset: ${url}`);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      
      base64Assets.push({
        inlineData: {
          data: base64,
          mimeType: 'image/jpeg'
        }
      });
    } catch (err) {
      console.warn(`[BrandSourcer] Failed to fetch image ${url}: ${err.message}`);
    }
  }

  return {
    imageUrls: urls,
    base64Assets
  };
}
