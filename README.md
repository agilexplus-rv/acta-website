# ACTA Website

A lightweight, mobile-first website for ACTA — Automotive Certification & Type Approval Ltd. Built with HTML, CSS (Tailwind), and vanilla JavaScript.

## 🚀 Quick Start

1. **Open the website**: Simply open `index.html` in your web browser
2. **Local development**: Use a local server (e.g., `python -m http.server` or `npx serve`) for full functionality
3. **Production**: Upload all files to your web server

## 📁 Project Structure

```
ACTA-website/
├── index.html                 # Main homepage
├── privacy.html              # Privacy policy page
├── favicon.svg               # Site favicon
├── assets/
│   ├── css/
│   │   └── overrides.css     # Custom CSS overrides
│   ├── js/
│   │   ├── header.js         # Header scroll reveal & mobile menu
│   │   ├── animate.js        # Scroll-triggered animations
│   │   ├── smooth-scroll.js  # Smooth scrolling for anchors
│   │   ├── consent.js        # GDPR cookie consent manager
│   │   └── contact.js        # Contact form validation & submission
│   └── img/
│       └── logo-acta.svg     # Company logo
└── README.md                 # This file
```

## 🎨 Styling

### Tailwind CSS
The site uses Tailwind CSS via CDN with custom configuration:

```html
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          brand: '#1B66D1',
          navy: '#0E2E52',
          ink: '#0B0E11'
        },
        maxWidth: {
          content: '72rem'
        }
      }
    }
  }
</script>
```

### Custom CSS
Additional styles in `/assets/css/overrides.css` include:
- Header reveal animations
- Scroll-triggered animations
- Form validation styles
- Accessibility improvements
- Reduced motion support

## 🔧 Supabase Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your `SUPABASE_URL` and `ANON_KEY` from the project settings

### 2. Database Setup

Run this SQL in your Supabase SQL editor:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create inquiries table
create table if not exists public.inquiries (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  full_name text not null,
  organisation text,
  email text not null,
  phone text,
  message text not null,
  consent boolean not null default true,
  user_agent text,
  ip text
);

-- Enable Row Level Security
alter table public.inquiries enable row level security;

-- Create policy for anonymous inserts
create policy "Allow inserts from anon" on public.inquiries
  for insert to anon with check (true);

-- Revoke other permissions from anon
revoke select, update, delete on public.inquiries from anon;
```

### 3. Configure Supabase in HTML

Update the Supabase configuration in `index.html`:

```html
<script id="supabase" 
        data-supabase-url="YOUR_SUPABASE_URL" 
        data-supabase-key="YOUR_SUPABASE_ANON_KEY">
</script>
```

Replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY` with your actual values.

### 4. Optional: Rate Limiting

For production, consider implementing rate limiting:

```sql
-- Create rate limiting function
create or replace function check_rate_limit(ip_address text)
returns boolean as $$
declare
  request_count integer;
begin
  select count(*) into request_count
  from public.inquiries
  where ip = ip_address
  and created_at > now() - interval '1 hour';
  
  return request_count < 5; -- Max 5 requests per hour
end;
$$ language plpgsql security definer;

-- Update policy to include rate limiting
drop policy if exists "Allow inserts from anon" on public.inquiries;
create policy "Allow inserts from anon" on public.inquiries
  for insert to anon with check (check_rate_limit(ip));
```

### 5. Security Considerations

- **Rotate keys regularly**: Change your anon key periodically
- **Monitor usage**: Check Supabase dashboard for unusual activity
- **Consider edge functions**: For stricter control, move form handling to a Supabase Edge Function
- **IP logging**: The current setup logs IP addresses for rate limiting

## 🍪 GDPR Cookie Consent

### Default Behavior
The site ships with **no non-essential cookies** by default. The consent banner only appears when non-essential scripts are present.

### Adding Analytics
To add Google Analytics or similar tracking:

1. Wrap the script with consent gating:
```html
<script type="text/plain" data-cookie-category="analytics">
  // Google Analytics code here
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

2. The consent manager will automatically:
   - Block execution until user consents
   - Convert to executable script after consent
   - Store preferences in localStorage and cookies

### Consent Categories
- **Necessary**: Always enabled (required for site functionality)
- **Analytics**: User tracking and performance monitoring
- **Marketing**: Advertising and remarketing

### API Usage
```javascript
// Check if category is allowed
if (window.ACTAConsent.isAllowed('analytics')) {
  // Run analytics code
}

// Update consent preferences
window.ACTAConsent.update({
  analytics: true,
  marketing: false
});
```

## ♿ Accessibility Features

- **Keyboard navigation**: Full keyboard support for all interactive elements
- **Screen reader support**: Proper ARIA labels and semantic HTML
- **Focus management**: Visible focus indicators and logical tab order
- **Reduced motion**: Respects `prefers-reduced-motion` setting
- **High contrast**: Supports high contrast mode
- **Skip links**: Quick navigation to main content

## 📱 Mobile Features

- **Responsive design**: Mobile-first approach with Tailwind breakpoints
- **Touch targets**: Minimum 44px touch targets for mobile devices
- **Mobile menu**: Slide-down navigation with focus trapping
- **Smooth scrolling**: Native smooth scrolling with fallbacks

## 🎭 Animations

### Scroll Animations
- Elements with `.fade-up` class animate in on scroll
- Uses IntersectionObserver for performance
- Disabled when `prefers-reduced-motion: reduce`

### Header Animation
- Header slides in after scrolling 48px
- Smooth transitions with backdrop blur
- No layout shift during animation

### Form Animations
- Success/error messages slide in
- Loading states with visual feedback
- Smooth focus transitions

## 🧪 Testing

### Manual Testing Checklist
- [ ] Header appears after scrolling 48px
- [ ] Mobile menu opens/closes properly
- [ ] All form validation works
- [ ] Contact form submits to Supabase
- [ ] Cookie consent banner appears (if analytics present)
- [ ] Smooth scrolling works for anchor links
- [ ] Animations respect reduced motion preference
- [ ] All links and buttons are keyboard accessible

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🚀 Deployment

### Static Hosting
Upload all files to any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- AWS S3 + CloudFront

### Server Requirements
- No server-side processing required
- Static file serving only
- HTTPS recommended for production

## 🔧 Customization

### Colors
Update the color palette in `index.html`:
```javascript
tailwind.config = {
  theme: {
    extend: {
      colors: {
        brand: '#1B66D1',    // Primary blue
        navy: '#0E2E52',     // Dark navy
        ink: '#0B0E11'       // Text color
      }
    }
  }
}
```

### Content
- Update company information in HTML files
- Modify service descriptions in the Services section
- Update contact information and addresses

### Styling
- Add custom CSS in `/assets/css/overrides.css`
- Modify Tailwind classes in HTML files
- Update animations in JavaScript files

## 📞 Support

For technical support or questions about this website:
- Email: contact@acta-approval.com
- Phone: +44 (0) 20 7123 4567

## 📄 License

This website is proprietary to ACTA — Automotive Certification & Type Approval Ltd.

---

**Note**: This website is designed exclusively for Type Approval Authorities. ACTA does not provide services to manufacturers.
