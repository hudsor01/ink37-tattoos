# Phase 15: UI Foundations - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 15-ui-foundations
**Areas discussed:** Loading & empty states, Mobile responsiveness, Form UX & validation, Accessibility & consistency

---

## Loading & Empty States

### Q1: Loading skeleton approach?
| Option | Description | Selected |
|--------|-------------|----------|
| Per-page loading.tsx with layout-matched skeletons | Each route gets own loading.tsx mimicking page layout | ✓ |
| Shared generic loading component | One reusable LoadingState with variants | |
| You decide | | |

### Q2: Empty state pattern?
| Option | Description | Selected |
|--------|-------------|----------|
| Shared EmptyState component with icon + text + CTA | Reusable component, each page passes own content | ✓ |
| Per-page custom empty states | Each page designs its own | |
| You decide | | |

### Q3: Error boundary scope?
| Option | Description | Selected |
|--------|-------------|----------|
| Root error.tsx + per-page where needed | Catch-all + specific where unique recovery needed | ✓ |
| Every sub-route gets error.tsx | Maximum granularity | |
| You decide | | |

---

## Mobile Responsiveness

### Q1: Table mobile behavior?
| Option | Description | Selected |
|--------|-------------|----------|
| Card view collapse | Tables collapse to stacked cards at md breakpoint | ✓ |
| Horizontal scroll | Tables scroll sideways | |
| You decide | | |

### Q2: Sidebar mobile behavior?
| Option | Description | Selected |
|--------|-------------|----------|
| Sheet-based sidebar | Hamburger menu, Sheet slide-in from left | ✓ |
| Bottom navigation bar | Tab bar replacing sidebar | |
| You decide | | |

---

## Form UX & Validation

### Q1: Form wiring approach?
| Option | Description | Selected |
|--------|-------------|----------|
| useActionState + inline errors | React 19 hook, server-side Zod, FieldError component | ✓ |
| react-hook-form + zod resolver | Client-side validation, extra dependencies | |
| You decide | | |

### Q2: Toast library?
| Option | Description | Selected |
|--------|-------------|----------|
| Sonner | Lightweight, shadcn built-in, toast.promise() | ✓ |
| shadcn Toast (Radix-based) | Heavier API, more control | |
| You decide | | |

### Q3: Destructive action confirmations?
| Option | Description | Selected |
|--------|-------------|----------|
| AlertDialog for all destructive actions | Every delete uses AlertDialog, no confirm() | ✓ |
| AlertDialog for critical, inline for minor | Split by severity | |
| You decide | | |

### Q4: Date picker component?
| Option | Description | Selected |
|--------|-------------|----------|
| shadcn DatePicker (Popover + Calendar) | react-day-picker, consistent with shadcn | ✓ |
| You decide | | |

---

## Accessibility & Consistency

### Q1: Accessibility depth?
| Option | Description | Selected |
|--------|-------------|----------|
| Essential ARIA + keyboard nav | aria-labels, keyboard nav, sr-only, chart alt text. WCAG 2.1 AA basics. | ✓ |
| Full WCAG 2.1 AA compliance | Comprehensive audit | |
| You decide | | |

### Q2: StatusBadge theming?
| Option | Description | Selected |
|--------|-------------|----------|
| CSS variables via shadcn color tokens | Semantic vars, dark mode auto | ✓ |
| Tailwind dark: variants | Keep classes, add dark variants | |
| You decide | | |

### Q3: Breadcrumb approach?
| Option | Description | Selected |
|--------|-------------|----------|
| Dynamic from route segments | Auto-generate from URL path | ✓ |
| Keep hardcoded, fix per-page | Manual per page | |
| You decide | | |

---

## Claude's Discretion
- Which pages need their own error.tsx
- Exact skeleton layouts per page
- Card view layout for mobile tables
- Toast copy per mutation
- beforeunload hook details
- Chart alt-text generation

## Deferred Ideas
None
