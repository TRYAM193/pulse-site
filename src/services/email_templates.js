/**
 * Outbound Email Templates & Niche Pain Points
 * Holds structured, high-conversion copy points, HTML layouts, and subject line templates per niche.
 */

export const NICHE_PAIN_POINTS = {
  hair_salon: {
    avgTicket: 65,
    statistic: 'Over 85% of clients search online to review stylist profiles and prices before choosing a new salon.',
    painPoint: 'Without a website, your salon remains invisible to clients looking for local haircuts, color services, or styling on Google.',
    opportunity: 'A professional site with a booking calendar and review gallery captures potential clients actively looking to book.',
    features: ['Instant Online Appointment Scheduler', 'Before & After Hair Photo Gallery', 'Services & Stylist Pricing Grid', 'Google Maps Local SEO Optimization']
  },
  barber_shop: {
    avgTicket: 35,
    statistic: 'More than 70% of walk-ins check a shop\'s styling photos and booking slots online before visiting.',
    painPoint: 'Missing a website means clients who want a clean fade or trim can\'t see your pricing, seating capacity, or reviews.',
    opportunity: 'A modern, high-contrast website showing open chairs and instant booking turns online traffic into regular clients.',
    features: ['Chair Booker & Time Slot Picker', 'Barber Profile Cards & Specialities', 'Style & Cut Visual Gallery', 'Mobile-Responsive Booking Widget']
  },
  plumber: {
    avgTicket: 160,
    statistic: '94% of homeowners needing emergency plumbing help go straight to Google to find a fast, trusted local provider.',
    painPoint: 'If you don\'t have a website showing your credentials and response times, they will call a competitor with a professional site.',
    opportunity: 'A clean site optimized for mobile clicks captures urgent local plumbing calls in your area.',
    features: ['Emergency "Tap to Call" Mobile Action', 'Service Area Map & Zip Codes', 'Customer Trust Badges & Guarantees', 'Quick Quote / Service Request Form']
  },
  dentist: {
    avgTicket: 250,
    statistic: '80% of patients verify a dental practice\'s safety reviews and insurance details online before calling.',
    painPoint: 'Not having a site creates doubt about your clinic\'s modernity and clinical certifications, losing high-value treatment bookings.',
    opportunity: 'A trusted, credential-focused site captures new patients searching for family dentistry or dental cleanings.',
    features: ['Patient Intake & Booking Form', 'Doctor Credentials & Bio Section', 'Insurance Providers Accepted List', 'Safety & Sanitization Policy Panel']
  },
  restaurant: {
    avgTicket: 35,
    statistic: '68% of diners check menus and reservation availability online before visiting a new restaurant.',
    painPoint: 'Without an online menu or table reservation system, you miss out on group bookings, deliveries, and dinner traffic.',
    opportunity: 'A fast-loading menu list and integrated booking widget turn hungry local browsers into packed tables.',
    features: ['Visual Food & Drink Menu Grid', 'Integrated Table Reservation Widget', 'Ambiance Photo Gallery', 'Local Google Maps Directions']
  },
  cafe: {
    avgTicket: 12,
    statistic: '74% of coffee lovers check operating hours, food options, and Wi-Fi availability online.',
    painPoint: 'If you aren\'t visible on the web, remote workers and morning commuters will go to local chain cafes instead.',
    opportunity: 'An active local site with a specialty menu highlights your unique blends and invites daily regulars.',
    features: ['Signature Drink & Pastry Highlights', 'Hours & Direct Navigation Link', 'Wi-Fi & Seating Amenity Badges', 'Digital Gift Cards Order Link']
  },
  bakery: {
    avgTicket: 20,
    statistic: '82% of clients check custom cake designs and dessert pricing online before ordering for events.',
    painPoint: 'No website means you lose high-margin wedding, birthday, or corporate catering orders to commercial bakeries.',
    opportunity: 'A colorful cake gallery and catering inquiry form make ordering custom pastries easy.',
    features: ['Custom Order & Catering Form', 'Wedding & Event Cake Photo Gallery', 'Signature Daily Treat Schedule', 'Dietary Option Badges (Gluten-Free, Vegan)']
  },
  gym: {
    avgTicket: 60,
    statistic: '91% of fitness seekers research class times, membership plans, and trainer profiles before joining a gym.',
    painPoint: 'Without a website, you miss out on monthly recurring memberships to gyms that offer online signups.',
    opportunity: 'Highlighting membership tiers and class schedules online captures local signups instantly.',
    features: ['SaaS-Style Membership Pricing Cards', 'Weekly Class Schedule Table', 'Trainer Bios & Focus Areas', 'Free Trial Pass Request Button']
  },
  yoga_studio: {
    avgTicket: 25,
    statistic: '83% of practitioners prefer to reserve class spots and view package options online.',
    painPoint: 'Clients looking for weekly classes can\'t find your schedule, class descriptions, or introductory rates.',
    opportunity: 'A peaceful, minimalist site with a scheduling widget converts local yoga searchers.',
    features: ['Class Schedule & Reservation Widget', 'Zen Style & Philosophy Intro', 'Introductory Offer Callout', 'Instructor Bio Profiles']
  },
  spa: {
    avgTicket: 110,
    statistic: '87% of customers book massages and facials as self-care gifts, comparing package menus online first.',
    painPoint: 'Missing a service menu and duration price list turns away gift-buyers and high-spending package customers.',
    opportunity: 'A gorgeous service grid and integrated booking system turns local traffic into booked treatments.',
    features: ['Massage & Therapy Service List', 'Treatment Duration & Price Table', 'Spa Package Gift Voucher Builder', 'Calming Ambiance Photo Slider']
  },
  real_estate: {
    avgTicket: 500,
    statistic: '92% of homebuyers and sellers compare local agents and search listings online before calling.',
    painPoint: 'Without a site, buyers can\'t see your listings or success stats, harming your professional credibility.',
    opportunity: 'A high-end website showing recent sales, client testimonials, and listings positions you as a top local agent.',
    features: ['Featured Property Carousel', 'Free Home Valuation Inquiry Form', 'Local Market Stats Counter', 'Agent Bio & Contact Details']
  },
  law_firm: {
    avgTicket: 300,
    statistic: '86% of individuals hiring a lawyer verify practice specialties and past cases online first.',
    painPoint: 'If you lack a professional online profile, clients seeking legal aid will choose competitors with clear credentials.',
    opportunity: 'A structured, trust-focused site establishing authority drives qualified consultation requests.',
    features: ['Practice Specialty Cards', 'Free Legal Consultation Request Form', 'Attorney Credential Timelines', 'Key Case Results & Trust Stats']
  },
  accounting: {
    avgTicket: 150,
    statistic: '78% of small business owners look for local CPAs and check their services online before tax season.',
    painPoint: 'Clients looking for bookkeeping or tax help will hire firms with professional websites and clear service lists.',
    opportunity: 'A professional website highlighting compliance expertise captures local business clients.',
    features: ['Business & Personal Service List', 'Schedule Consultation Button', 'Client Portal Login Link', 'Tax Deadline Timer & Resource links']
  },
  cleaning_service: {
    avgTicket: 120,
    statistic: '88% of clients booking residential or commercial cleanings require pricing quotes online.',
    painPoint: 'Without a site or request form, you miss out on recurring weekly/monthly cleaning accounts.',
    opportunity: 'A simple service scope and instant quote form secures bookings from busy homeowners.',
    features: ['Instant Quote Calculator Form', 'Commercial vs. Home Service Details', 'Satisfaction Guarantee Badge', 'Bonded & Insured Trust Details']
  },
  landscaping: {
    avgTicket: 180,
    statistic: '81% of property owners check lawn care galleries and project reviews online before booking a landscaper.',
    painPoint: 'Clients can\'t view your previous patio, lawn, or garden designs, losing jobs to visual competitors.',
    opportunity: 'A bright project showcase and request form converts landscaping design leads.',
    features: ['Project Showcase Masonry Grid', 'Lawn Care Service Request Form', 'Seasonal Maintenance Pricing', 'Before/After Lawn Slider']
  },
  tutoring: {
    avgTicket: 45,
    statistic: '76% of parents compare tutoring credentials, subject specialties, and pricing online.',
    painPoint: 'No website means local students and parents can\'t discover your tutoring subjects or success rates.',
    opportunity: 'A structured site showing subjects, credentials, and parent reviews drives booking requests.',
    features: ['Subject & Grade level Grid', 'Schedule Trial Session Form', 'Tutor Bios & Certification Badges', 'Student Grade Improvement Stats']
  },
  pet_grooming: {
    avgTicket: 70,
    statistic: '84% of pet owners research grooming prices and safety reviews online before booking a pet salon.',
    painPoint: 'Without a website, pet owners can\'t see your safety policies, breed prices, or appointment availability.',
    opportunity: 'An easy pet profile form and booking calendar captures groom bookings quickly.',
    features: ['Pet Size Pricing Cards', 'Grooming Package Booking Form', 'Groomer Profiles & Pet Certifications', 'Pet Safety & Sanitization Rules']
  },
  veterinarian: {
    avgTicket: 140,
    statistic: '90% of pet owners verify emergency services, pet health services, and ratings online.',
    painPoint: 'If you lack a veterinary website, clients will go to clinics with clear office hours and emergency contacts.',
    opportunity: 'A credential-focused clinic site builds trust and handles new pet registrations.',
    features: ['Office Hours & Emergency Contact Callout', 'Pet Appointment Booking Form', 'Vet Credential Cards', 'New Client Intake Form Link']
  },
  photography: {
    avgTicket: 200,
    statistic: '96% of photography clients compare portfolios and package pricing online before booking.',
    painPoint: 'Without a visual online portfolio, you cannot show your photography style, losing clients.',
    opportunity: 'A stunning visual gallery and booking form secures shoots for weddings, headshots, or products.',
    features: ['High-Resolution Portfolio Grid', 'Shoot Booking & Date Reservation', 'Photography Package Pricing', 'Client Gallery Portal Redirect']
  },
  tattoo_parlor: {
    avgTicket: 150,
    statistic: '92% of clients check artist portfolios and hygiene certifications online before getting ink.',
    painPoint: 'If you lack a site, collectors can\'t view your artists\' styles or booking windows, losing shop bookings.',
    opportunity: 'A bold, high-contrast site with artist portfolios and booking forms captures ink collectors.',
    features: ['Artist Style Portfolio Grids', 'Tattoo Consultation Request Form', 'Hygiene & Safety Credentials', 'Shop Hours & Location Pin']
  },
  florist: {
    avgTicket: 50,
    statistic: '79% of floral shoppers order arrangements, bouquet deliveries, or event setups online.',
    painPoint: 'No site means you lose local delivery sales and wedding bookings to online floral giants.',
    opportunity: 'A beautiful bouquet shop grid and delivery form handles florist orders.',
    features: ['Flower Bouquet Product Grid', 'Local Delivery Address & Date Picker', 'Wedding & Event Florals Inquiry Form', 'Store Hours & Location Pin']
  },
  chiropractor: {
    avgTicket: 90,
    statistic: '82% of patients check chiropractic treatment approaches and symptom reviews online.',
    painPoint: 'Without a site, clients suffering back pain can\'t see your specialties or schedule adjustments.',
    opportunity: 'A clean clinic site showing specialties and booking slots drives patient registrations.',
    features: ['Adjustment Booking Form', 'Symptom Relief Target List', 'Dr. Bio & Chiropractic Credentials', 'First-Visit Discount Banner']
  },
  optometrist: {
    avgTicket: 180,
    statistic: '85% of eye care patients verify frame brands and book eye exams online.',
    painPoint: 'Clients looking for eye care can\'t book exams or view frame listings, losing eyecare business.',
    opportunity: 'An easy exam scheduler and frame brand highlight page drives optician store traffic.',
    features: ['Eye Exam Booking Form', 'Frame Brand Logos Grid', 'Doctor Credentials Card', 'Insurance Direct-Bill Badge']
  },
  insurance: {
    avgTicket: 100,
    statistic: '76% of clients check agent coverage options and request policy quotes online.',
    painPoint: 'Without a website, clients seeking auto, home, or business policies will call agency competitors.',
    opportunity: 'A clear list of coverage options and quote request form drives policy sales.',
    features: ['Policy Option & Cover Cards', 'Free Quote Request Form', 'Agent Credential Details', 'Customer Claims Phone Callout']
  },
  wedding_planner: {
    avgTicket: 1200,
    statistic: '95% of couples check wedding planner portfolios, services, and packages online first.',
    painPoint: 'Without a web presence, couples looking to plan their big day won\'t discover your planning styles.',
    opportunity: 'A gorgeous wedding gallery and package consultation form handles inquiries.',
    features: ['Stunning Wedding Portfolio Grid', 'Consultation Booking Form', 'Planning Package Pricing Cards', 'Vendor Network & Venue Advice']
  },
  interior_design: {
    avgTicket: 800,
    statistic: '91% of homeowners compare designer portfolios and project styling online before hiring.',
    painPoint: 'Clients can\'t view your previous home designs, losing renovation contracts to active designers.',
    opportunity: 'A clean project gallery and styling consultation form drives design briefs.',
    features: ['Project Gallery Grid', 'Design Consultation Booking Form', 'Service Package Options List', 'Designer Credentials & Bio Card']
  },
  default: {
    avgTicket: 50,
    statistic: '80% of local customers check a business\'s details and pricing online before visiting.',
    painPoint: 'Without a website, you lose local customers to businesses that make booking online simple.',
    opportunity: 'A professional website highlighting services and reviews converts local leads.',
    features: ['Services & Pricing Cards', 'Customer Appointment Booking Form', 'About Us Brand Story Card', 'Hours & Location Contact Panel']
  }
};

/**
 * Returns HTML email layout with professional glassmorphic design matching AutoAgency branding.
 * @param {object} lead
 * @param {string} subject
 * @param {string} bodyContent
 * @param {string} ctaUrl
 * @returns {string} Fully rendered HTML email
 */
export function getEmailHtml(lead, subject, bodyContent, ctaUrl) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #080c14; color: #f8fafc; margin: 0; padding: 0; }
    .wrapper { width: 100%; background-color: #080c14; padding: 40px 20px; box-sizing: border-box; }
    .container { max-width: 600px; margin: 0 auto; background: #0f172a; border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .header { padding: 30px 40px; background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); border-bottom: 1px solid rgba(255,255,255,0.06); text-align: center; }
    .logo { font-size: 1.5rem; font-weight: 800; color: #fff; text-decoration: none; background: linear-gradient(135deg, #6366f1, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .content { padding: 40px; line-height: 1.6; color: #cbd5e1; }
    h1 { color: #f8fafc; font-size: 1.5rem; font-weight: 700; margin-top: 0; margin-bottom: 20px; }
    p { margin-top: 0; margin-bottom: 20px; font-size: 1rem; }
    .cta-container { text-align: center; margin: 35px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #6366f1, #a855f7); color: #ffffff !important; padding: 14px 30px; border-radius: 12px; font-weight: bold; text-decoration: none; box-shadow: 0 4px 15px rgba(99,102,241,0.3); transition: transform 0.2s; }
    .btn:hover { transform: translateY(-2px); }
    .highlight-box { background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.15); border-radius: 12px; padding: 20px; margin-bottom: 25px; }
    .highlight-title { font-weight: bold; color: #a855f7; margin-bottom: 8px; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 1px; }
    .footer { padding: 30px 40px; background: #0b0f19; border-top: 1px solid rgba(255,255,255,0.06); text-align: center; font-size: 0.8rem; color: #64748b; }
    .footer a { color: #94a3b8; text-decoration: underline; }
    .unsubscribe { margin-top: 15px; display: block; font-size: 0.75rem; color: #475569; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <a href="https://autoagency.app" class="logo">AutoAgency.app</a>
      </div>
      <div class="content">
        ${bodyContent}
        <div class="cta-container">
          <a href="${ctaUrl}" class="btn" target="_blank">View Your Website Preview</a>
        </div>
        <p style="font-size:0.9rem; color:#64748b;">Simply reply directly to this email if you want to make changes or connect your custom domain.</p>
      </div>
      <div class="footer">
        <p>Sent by AutoAgency — Automating Web Design & Local SEO</p>
        <p>100 Grand Ave, Seattle, WA 98101</p>
        <a href="${ctaUrl}/unsubscribe" class="unsubscribe">Unsubscribe from these outreach alerts</a>
      </div>
    </div>
  </div>
</body>
</html>
`;
}
