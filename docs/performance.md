# Performance Optimizations

## Overview

LEADTRACKING is optimized for fast loading, smooth interactions, and excellent Core Web Vitals scores.

## Key Optimizations

### 1. Loading States (Skeleton Screens)

Every major route has a `loading.tsx` that displays skeleton placeholders instead of spinners:

| Route           | Loading File                     |
| --------------- | -------------------------------- |
| `/` (Dashboard) | `src/app/loading.tsx`            |
| `/leads`        | `src/app/leads/loading.tsx`      |
| `/activities`   | `src/app/activities/loading.tsx` |
| `/analytics`    | `src/app/analytics/loading.tsx`  |
| `/resources`    | `src/app/resources/loading.tsx`  |
| `/training`     | `src/app/training/loading.tsx`   |
| `/settings`     | `src/app/settings/loading.tsx`   |

**Benefits:**

- Perceived performance improvement
- No layout shift when content loads
- Consistent visual experience

### 2. Font Optimization

Fonts are loaded via Google Fonts CDN with `display=swap`:

```html
<link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@500;600;700&display=swap"
/>
```

**Recommendation for future:**
Use `next/font` for automatic font optimization:

```typescript
import { Inter, Outfit } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });
```

### 3. Image Optimization

Next.js Image component is configured in `next.config.ts`:

```typescript
images: {
    remotePatterns: [
        {
            protocol: 'https',
            hostname: '**.googleusercontent.com',
        },
    ],
},
```

**Usage:**

```typescript
import Image from 'next/image';

<Image
    src={user.photoURL}
    alt="Profile"
    width={40}
    height={40}
    className="rounded-full"
/>
```

### 4. Code Splitting

- **Automatic**: Next.js automatically splits by route
- **Dynamic imports**: For heavy components

```typescript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/analytics/HeavyChart'), {
    loading: () => <ChartSkeleton />,
    ssr: false,
});
```

### 5. CSS Optimization

TailwindCSS 4 with automatic purging:

- Only used classes are included in production
- Glassmorphism effects use CSS variables for consistency
- `backdrop-filter` with fallbacks

### 6. React 19 Optimizations

- **Automatic batching**: Multiple state updates batched
- **Suspense**: Used implicitly via loading.tsx
- **Server Components**: Layout is a server component

## Core Web Vitals

### Target Scores

| Metric | Target  | Good     | Needs Improvement |
| ------ | ------- | -------- | ----------------- |
| LCP    | < 2.5s  | ✅ Green | ⚠️ >4s            |
| FID    | < 100ms | ✅ Green | ⚠️ >300ms         |
| CLS    | < 0.1   | ✅ Green | ⚠️ >0.25          |
| FCP    | < 1.8s  | ✅ Green | ⚠️ >3s            |
| TTI    | < 3.8s  | ✅ Green | ⚠️ >7.3s          |

### Measuring Performance

**Lighthouse (Chrome DevTools):**

1. Open DevTools → Lighthouse tab
2. Select "Performance" category
3. Click "Analyze page load"

**Real User Monitoring:**

- Sentry Performance (configured)
- Google Search Console (once indexed)

## Bundle Analysis

### Analyze Bundle Size

```bash
# Install analyzer
npm install @next/bundle-analyzer

# Add to next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);

# Run analysis
ANALYZE=true npm run build
```

### Current Dependencies

| Package               | Size (approx)  | Purpose          |
| --------------------- | -------------- | ---------------- |
| `react` + `react-dom` | ~130KB         | Framework        |
| `firebase`            | ~200KB         | Backend services |
| `lucide-react`        | Tree-shaken    | Icons            |
| `tailwindcss`         | ~10KB (purged) | Styling          |
| `sonner`              | ~15KB          | Toasts           |

### Optimization Opportunities

1. **Firebase modular imports** (already using)

    ```typescript
    // Good: Modular import
    import { getAuth } from 'firebase/auth';

    // Bad: Full import
    import firebase from 'firebase';
    ```

2. **Dynamic imports for heavy features**

    ```typescript
    const AIEmailDraft = dynamic(() => import('@/components/ai/AIEmailDraft'));
    ```

3. **Lazy load below-the-fold content**

## Caching Strategy

### Static Assets

- Handled by Next.js and Firebase App Hosting
- Long cache headers for immutable assets
- Content hash in filenames

### API Responses

```typescript
// Cache for 1 minute, revalidate in background
export const revalidate = 60;

// Or per-request
export async function GET() {
    return Response.json(data, {
        headers: {
            'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
        },
    });
}
```

### Client-Side Caching

Consider adding React Query or SWR for:

- Request deduplication
- Background refresh
- Optimistic updates

## Performance Checklist

- [x] Skeleton loading states on all routes
- [x] Error boundaries on all routes
- [x] React strict mode enabled
- [x] Image optimization configured
- [x] TailwindCSS purging enabled
- [x] Modular Firebase imports
- [ ] next/font (recommended upgrade)
- [ ] Dynamic imports for heavy components
- [ ] React Query for data fetching
- [ ] Service Worker for offline support

## Lighthouse Targets

Run before each major release:

```bash
# Install Lighthouse CI
npm install -g @lhci/cli

# Run audit
lhci autorun --collect.url=http://localhost:3000
```

**Minimum Acceptable Scores:**

- Performance: ≥ 90
- Accessibility: ≥ 90
- Best Practices: ≥ 90
- SEO: ≥ 90

## Troubleshooting Performance Issues

### Slow Initial Load

1. Check bundle size with analyzer
2. Identify large dependencies
3. Add dynamic imports
4. Verify cache headers

### Layout Shift

1. Set explicit dimensions on images
2. Reserve space for dynamic content
3. Use skeleton placeholders

### Slow Interactions

1. Profile with React DevTools
2. Check for unnecessary re-renders
3. Memoize expensive calculations
4. Use `useMemo` and `useCallback`
