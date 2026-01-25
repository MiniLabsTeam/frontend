# Shared Components Guide

Quick wins implementation for MiniGarage Base Mini App. All components are optimized for mobile-first, Base Mini App context.

## 📦 Components Overview

### 1. EmptyState
Engaging empty states with clear CTAs.

```jsx
import { EmptyState } from "@/components/shared";
import { Car } from "lucide-react";

// Basic usage
<EmptyState
  icon={Car}
  title="No Cars Yet"
  description="Open your first gacha box to start your collection!"
  actionLabel="Go to Gacha"
  actionHref="/gacha"
/>

// With custom action
<EmptyState
  icon={Package}
  title="Inventory Empty"
  description="You don't have any cars yet."
  actionLabel="Get Started"
  onAction={() => router.push("/gacha")}
  iconClassName="text-orange-500"
/>
```

**Props:**
- `icon` - Lucide icon component
- `title` - Main heading (required)
- `description` - Supporting text
- `actionLabel` - CTA button text
- `actionHref` - Route to navigate to
- `onAction` - Custom action handler
- `iconClassName` - Custom icon styling
- `containerClassName` - Custom container styling

---

### 2. Skeleton Loaders
Smooth shimmer loading states.

```jsx
import {
  SkeletonCard,
  SkeletonGrid,
  SkeletonListItem,
  SkeletonStats,
  SkeletonPage
} from "@/components/shared";

// Replace loading spinners with skeletons
function InventoryPage() {
  const { cars, isLoading } = useCars();

  if (isLoading) {
    return <SkeletonGrid count={6} />;
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {cars.map(car => <CarCard key={car.id} car={car} />)}
    </div>
  );
}

// For lists
if (isLoading) return <SkeletonListItem />;

// For dashboard stats
if (isLoading) return <SkeletonStats />;

// For full page
if (isLoading) return <SkeletonPage />;
```

**Available Components:**
- `SkeletonCard` - Single card skeleton
- `SkeletonGrid` - Grid of cards (customizable count)
- `SkeletonListItem` - List item with icon
- `SkeletonStats` - Stats/dashboard skeleton
- `SkeletonPage` - Full page skeleton

---

### 3. Button
Animated button with variants.

```jsx
import { Button } from "@/components/shared";

// Primary button (default)
<Button onClick={handleClick}>
  Open Gacha
</Button>

// Variants
<Button variant="secondary">Cancel</Button>
<Button variant="ghost">View Details</Button>
<Button variant="danger">Delete</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium (default)</Button>
<Button size="lg">Large</Button>

// Disabled
<Button disabled={isLoading}>
  {isLoading ? "Loading..." : "Submit"}
</Button>
```

**Props:**
- `variant` - "primary" | "secondary" | "ghost" | "danger"
- `size` - "sm" | "md" | "lg"
- `disabled` - boolean
- `onClick` - click handler
- `className` - additional classes

**Features:**
- Hover scale effect (105%)
- Active press effect (95%)
- Focus ring
- Disabled state handling

---

### 4. AnimatedCard
Card with smooth hover animations.

```jsx
import { AnimatedCard } from "@/components/shared";

// Hoverable card (default)
<AnimatedCard onClick={() => router.push(`/car/${car.id}`)}>
  <img src={car.image} />
  <h3>{car.name}</h3>
</AnimatedCard>

// Non-hoverable
<AnimatedCard hoverable={false}>
  <p>Static content</p>
</AnimatedCard>
```

**Props:**
- `hoverable` - Enable hover effect (default: true)
- `onClick` - Click handler
- `className` - Additional classes

**Features:**
- Hover scale (105%)
- Shadow transition
- Rounded corners
- White background

---

### 5. Animation Wrappers
Page-level animations.

```jsx
import { AnimatedContainer, SlideUp, ScaleIn } from "@/components/shared";

function MyPage() {
  return (
    <AnimatedContainer>
      <h1>Welcome</h1>

      <SlideUp delay={100}>
        <p>This slides up after 100ms</p>
      </SlideUp>

      <ScaleIn delay={200}>
        <Button>This scales in after 200ms</Button>
      </ScaleIn>
    </AnimatedContainer>
  );
}
```

**Components:**
- `AnimatedContainer` - Fade in animation
- `SlideUp` - Slide up from bottom
- `ScaleIn` - Scale in from 95%

**Props:**
- `delay` - Animation delay in ms
- `className` - Additional classes

---

### 6. Share Buttons
Social sharing with Farcaster SDK integration.

```jsx
import {
  ShareButton,
  ShareCarButton,
  ShareCollectionButton
} from "@/components/shared";

// Generic share button
<ShareButton
  text="Check out MiniGarage!"
  url="https://minigarage.app"
  variant="primary"
  size="md"
>
  Share App
</ShareButton>

// Share specific car
<ShareCarButton
  car={car}
  variant="ghost"
  size="sm"
/>

// Share collection
<ShareCollectionButton
  totalCars={inventory.length}
  rareCount={rareCarCount}
  variant="primary"
/>
```

**Features:**
- Farcaster SDK integration (native share in Base app)
- Fallback to Web Share API
- Fallback to clipboard copy
- Toast notifications
- Loading states

**Props (ShareButton):**
- `text` - Share text/message
- `url` - URL to share
- `embeds` - Array of embed URLs
- `variant` - Button variant
- `size` - Button size
- `showIcon` - Show share icon (default: true)

---

## 🎨 Usage Examples

### Example 1: Inventory Page with Empty State

```jsx
"use client";

import { useState, useEffect } from "react";
import { EmptyState, SkeletonGrid } from "@/components/shared";
import { Car } from "lucide-react";

export default function InventoryPage() {
  const [cars, setCars] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCars();
  }, []);

  if (isLoading) {
    return <SkeletonGrid count={6} />;
  }

  if (cars.length === 0) {
    return (
      <EmptyState
        icon={Car}
        title="No Cars in Garage"
        description="Open a gacha box to start your collection!"
        actionLabel="Go to Gacha"
        actionHref="/gacha"
        iconClassName="text-orange-500"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cars.map(car => <CarCard key={car.id} car={car} />)}
    </div>
  );
}
```

### Example 2: Car Card with Animations

```jsx
import { AnimatedCard, ShareCarButton } from "@/components/shared";

export default function CarCard({ car }) {
  return (
    <AnimatedCard onClick={() => router.push(`/car/${car.id}`)}>
      <img src={car.image} className="w-full h-48 object-cover" />

      <div className="p-4">
        <h3 className="font-bold text-lg">{car.name}</h3>
        <p className="text-gray-600">{car.rarity}</p>

        <div className="mt-4 flex gap-2">
          <Button size="sm" className="flex-1">
            View Details
          </Button>
          <ShareCarButton car={car} />
        </div>
      </div>
    </AnimatedCard>
  );
}
```

### Example 3: Dashboard with Loading States

```jsx
import {
  AnimatedContainer,
  SlideUp,
  SkeletonStats,
  ShareCollectionButton
} from "@/components/shared";

export default function Dashboard() {
  const { stats, isLoading } = useStats();

  return (
    <AnimatedContainer>
      <h1 className="text-2xl font-bold mb-6">My Collection</h1>

      {isLoading ? (
        <SkeletonStats />
      ) : (
        <SlideUp delay={100}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Cars" value={stats.total} />
            <StatCard label="Legendary" value={stats.legendary} />
            <StatCard label="Rare" value={stats.rare} />
            <StatCard label="Common" value={stats.common} />
          </div>
        </SlideUp>
      )}

      <SlideUp delay={200}>
        <div className="mt-6">
          <ShareCollectionButton
            totalCars={stats.total}
            rareCount={stats.legendary + stats.rare}
          />
        </div>
      </SlideUp>
    </AnimatedContainer>
  );
}
```

---

## 🎯 Quick Migration Guide

### Replace Loading Spinners

**Before:**
```jsx
{isLoading && <div className="animate-spin">Loading...</div>}
```

**After:**
```jsx
{isLoading && <SkeletonGrid count={6} />}
```

### Replace Empty Divs

**Before:**
```jsx
{cars.length === 0 && <div>No cars found</div>}
```

**After:**
```jsx
{cars.length === 0 && (
  <EmptyState
    icon={Car}
    title="No Cars Yet"
    description="Start collecting!"
    actionLabel="Open Gacha"
    actionHref="/gacha"
  />
)}
```

### Add Animations to Cards

**Before:**
```jsx
<div className="bg-white rounded-lg p-4">
  {content}
</div>
```

**After:**
```jsx
<AnimatedCard>
  {content}
</AnimatedCard>
```

### Add Share Functionality

**Before:**
```jsx
<button onClick={copyLink}>Share</button>
```

**After:**
```jsx
<ShareButton text="Check this out!" url={shareUrl} />
```

---

## 🚀 Performance Tips

1. **Use Skeleton Loaders Early**
   - Call them as soon as `isLoading` is true
   - Don't delay skeleton appearance

2. **Lazy Load Animation Wrappers**
   - Only use page-level animations on important pages
   - Avoid over-animating (causes fatigue)

3. **Share Button Optimization**
   - Pre-generate share URLs at build time when possible
   - Cache share text to avoid recalculation

4. **Animation Delays**
   - Keep delays < 300ms for UX
   - Stagger multiple elements by 100ms increments

---

## 🎨 Customization

All components support `className` prop for custom styling:

```jsx
<Button className="w-full mt-4">
  Full Width Button
</Button>

<EmptyState
  containerClassName="min-h-screen flex items-center"
  iconClassName="text-blue-500"
/>
```

---

## 📱 Mobile Optimization

All components are mobile-optimized:
- Touch-friendly button sizes (min 44px)
- Responsive grid layouts
- Safe area respect (use in conjunction with viewport meta)
- Optimized animations (GPU-accelerated)

---

## 🔧 Troubleshooting

**Animations not working?**
- Ensure Tailwind config has been updated with keyframes
- Check that `animate-` classes are in Tailwind's safelist

**Share button not working?**
- Farcaster SDK only works in Base Mini App context
- Fallback to Web Share API or clipboard copy automatically

**Skeleton shimmer not showing?**
- Ensure parent has proper overflow handling
- Check that skeleton components have width/height

---

Good luck building! 🚀
