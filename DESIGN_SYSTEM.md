# Design System

A unique, glassmorphic design system that stands out from typical solo dev apps.

## Design Philosophy

**Problem**: Most solo dev apps use the same purple/blue gradient themes (Vercel, Linear, etc.)

**Our Approach**: Warm, sophisticated palette with glassmorphic depth

**Principles**:
1. **Warmth over coldness** - Orange/amber accents instead of purple/blue
2. **Depth through glass** - Frosted glass effects for layering
3. **Readable first** - High contrast text, proper spacing
4. **Dark mode native** - Designed for dark mode, light mode adapted
5. **Minimal but rich** - Clean layout with subtle details

---

## Color Palette

### Primary: Warm Ember

Inspired by fire and energy, not the typical tech blue.

```css
ember-50:  #fff7ed   /* Lightest - backgrounds */
ember-100: #ffedd5   /* Very light */
ember-200: #fed7aa   /* Light */
ember-300: #fdba74   /* Medium light */
ember-400: #fb923c   /* Medium - primary actions */
ember-500: #f97316   /* Base - brand color */
ember-600: #ea580c   /* Medium dark */
ember-700: #c2410c   /* Dark */
ember-800: #9a3412   /* Very dark */
ember-900: #7c2d12   /* Darkest */
```

### Accent: Golden Hour

For highlights, success states, and warmth.

```css
gold-50:  #fffbeb
gold-100: #fef3c7
gold-200: #fde68a
gold-300: #fcd34d
gold-400: #fbbf24   /* Accent color */
gold-500: #f59e0b
gold-600: #d97706
gold-700: #b45309
gold-800: #92400e
gold-900: #78350f
```

### Neutral: Slate (but warmer)

For text, borders, and backgrounds. Slightly warmed to match palette.

```css
neutral-50:  #fafaf9
neutral-100: #f5f5f4
neutral-200: #e7e5e4
neutral-300: #d6d3d1
neutral-400: #a8a29e
neutral-500: #78716c
neutral-600: #57534e
neutral-700: #44403c
neutral-800: #292524   /* Dark mode background */
neutral-900: #1c1917   /* Darkest dark mode */
```

### Semantic Colors

```css
/* Success - Soft green (not bright) */
success: #10b981

/* Warning - Amber */
warning: #f59e0b

/* Error - Red (not pink) */
error: #ef4444

/* Info - Teal (not blue) */
info: #14b8a6
```

---

## Typography

### Font Stack

```css
/* Sans - Modern, readable */
font-sans: Inter, system-ui, -apple-system, sans-serif

/* Mono - Code and data */
font-mono: 'JetBrains Mono', 'Fira Code', Consolas, monospace
```

### Type Scale

```css
text-xs:   0.75rem  (12px) - Small labels
text-sm:   0.875rem (14px) - Body small
text-base: 1rem     (16px) - Body text
text-lg:   1.125rem (18px) - Emphasized
text-xl:   1.25rem  (20px) - Headings H4
text-2xl:  1.5rem   (24px) - Headings H3
text-3xl:  1.875rem (30px) - Headings H2
text-4xl:  2.25rem  (36px) - Headings H1
text-5xl:  3rem     (48px) - Hero text
```

### Font Weights

```css
font-normal:    400
font-medium:    500 - UI elements
font-semibold:  600 - Headings
font-bold:      700 - Emphasis
```

---

## Glassmorphism

The signature visual effect of this dashboard.

### Glass Layers

```css
/* Light glass (for dark backgrounds) */
.glass-light {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}

/* Medium glass (cards, widgets) */
.glass-medium {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}

/* Heavy glass (modals, overlays) */
.glass-heavy {
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}
```

### Usage Guidelines

- Use glass effects on dark backgrounds for best effect
- Layer glass elements for depth
- Add subtle gradients behind glass for color
- Keep blur consistent (12-20px range)

---

## Spacing Scale

Following 8px grid for consistency.

```css
0:   0px
1:   0.25rem (4px)
2:   0.5rem  (8px)
3:   0.75rem (12px)
4:   1rem    (16px)  - Base spacing
6:   1.5rem  (24px)
8:   2rem    (32px)
12:  3rem    (48px)
16:  4rem    (64px)
20:  5rem    (80px)
24:  6rem    (96px)
```

---

## Component Patterns

### Widget Card

```jsx
<div className="glass-medium rounded-2xl p-6 hover:glass-heavy transition-all">
  {/* Widget content */}
</div>
```

### Button (Primary)

```jsx
<button className="bg-ember-500 hover:bg-ember-600 text-white font-medium px-6 py-3 rounded-xl transition-colors">
  Action
</button>
```

### Button (Secondary)

```jsx
<button className="glass-light hover:glass-medium text-neutral-100 font-medium px-6 py-3 rounded-xl transition-all">
  Secondary
</button>
```

### Input

```jsx
<input className="glass-light border-neutral-700 focus:border-ember-500 rounded-lg px-4 py-2 text-neutral-100 placeholder-neutral-500" />
```

---

## Dark Mode (Default)

```css
Background gradient:
  - Top: #1c1917 (neutral-900)
  - Bottom: #292524 (neutral-800)
  - Accent gradient behind glass: radial-gradient(circle at top right, rgba(249, 115, 22, 0.1), transparent)

Text:
  - Primary: #fafaf9 (neutral-50)
  - Secondary: #d6d3d1 (neutral-300)
  - Muted: #78716c (neutral-500)

Borders:
  - Subtle: rgba(255, 255, 255, 0.1)
  - Visible: rgba(255, 255, 255, 0.2)
```

## Light Mode (Adapted)

```css
Background:
  - Base: #fafaf9 (neutral-50)
  - Secondary: #f5f5f4 (neutral-100)

Glass (inverted for light mode):
  - background: rgba(255, 255, 255, 0.7)
  - backdrop-filter: blur(12px)
  - border: 1px solid rgba(0, 0, 0, 0.1)

Text:
  - Primary: #1c1917 (neutral-900)
  - Secondary: #44403c (neutral-700)
  - Muted: #78716c (neutral-500)

Borders:
  - Subtle: rgba(0, 0, 0, 0.05)
  - Visible: rgba(0, 0, 0, 0.1)
```

---

## Animation & Transitions

### Durations

```css
transition-fast:   150ms - Hover states
transition-normal: 300ms - Default
transition-slow:   500ms - Page transitions
```

### Easings

```css
ease-smooth: cubic-bezier(0.4, 0, 0.2, 1)  - Default
ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55) - Playful
ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275) - Elastic
```

---

## Layout Grid

### Dashboard Grid

```css
/* 12-column grid for flexible layouts */
grid-cols-12

/* Responsive breakpoints */
sm:  640px  - Mobile landscape
md:  768px  - Tablet
lg:  1024px - Desktop
xl:  1280px - Large desktop
2xl: 1536px - Ultra-wide
```

### Widget Sizes

```css
small:  4 columns  (1/3 width)
medium: 6 columns  (1/2 width)
large:  8 columns  (2/3 width)
full:   12 columns (full width)
```

---

## Accessibility

### Contrast Ratios

- Normal text: Minimum 4.5:1
- Large text: Minimum 3:1
- UI elements: Minimum 3:1

### Focus States

```css
focus:outline-none
focus:ring-2
focus:ring-ember-500
focus:ring-offset-2
focus:ring-offset-neutral-900
```

### Motion

Respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Design Inspirations

**NOT copying**:
- ❌ Vercel (purple/blue gradients)
- ❌ Linear (purple theme)
- ❌ Stripe (typical tech blue)

**Inspired by**:
- ✅ Fire and warm light
- ✅ Sunset gradients
- ✅ Frosted glass in nature
- ✅ Premium dashboard aesthetics (Bloomberg Terminal warmth)

---

## Implementation Checklist

- [ ] Set up Tailwind config with custom colors
- [ ] Create glassmorphic utility classes
- [ ] Implement dark mode toggle
- [ ] Create component library (buttons, inputs, cards)
- [ ] Add Inter font via next/font
- [ ] Test contrast ratios
- [ ] Verify glassmorphic effects on different backgrounds

---

**Result**: A dashboard that feels warm, premium, and unique - not another purple gradient solo dev app.
