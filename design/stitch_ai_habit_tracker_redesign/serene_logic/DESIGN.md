---
name: Serene Logic
colors:
  surface: '#f7fafc'
  surface-dim: '#d7dadc'
  surface-bright: '#f7fafc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f6'
  surface-container: '#ebeef0'
  surface-container-high: '#e5e9eb'
  surface-container-highest: '#e0e3e5'
  on-surface: '#181c1e'
  on-surface-variant: '#464653'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eef1f3'
  outline: '#767684'
  outline-variant: '#c7c5d5'
  surface-tint: '#4c51bf'
  primary: '#3337a6'
  on-primary: '#ffffff'
  primary-container: '#4c51bf'
  on-primary-container: '#d4d5ff'
  inverse-primary: '#bfc1ff'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d1e1fa'
  on-secondary-container: '#556479'
  tertiary: '#2d4e32'
  on-tertiary: '#ffffff'
  tertiary-container: '#456648'
  on-tertiary-container: '#bce2bc'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#bfc1ff'
  on-primary-fixed: '#03006d'
  on-primary-fixed-variant: '#3337a6'
  secondary-fixed: '#d4e4fc'
  secondary-fixed-dim: '#b8c8e0'
  on-secondary-fixed: '#0d1c2e'
  on-secondary-fixed-variant: '#39485c'
  tertiary-fixed: '#c6ecc6'
  tertiary-fixed-dim: '#abd0ab'
  on-tertiary-fixed: '#01210a'
  on-tertiary-fixed-variant: '#2d4e32'
  background: '#f7fafc'
  on-background: '#181c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.08em
  stats-num:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  gutter: 24px
  margin-mobile: 16px
  max-width: 1200px
---

## Brand & Style

This design system blends the high-performance utility of modern SaaS with the restorative clarity of a wellness retreat. The aesthetic is centered on **Corporate Modern** polish with a **Minimalist** soul, specifically targeting high-achievers who value mental space as much as productivity.

The goal is to evoke a sense of "quiet intelligence." Every interaction should feel intentional and calm, reducing the cognitive load of habit tracking through generous whitespace, high-quality typography, and a "Glassmorphic" layer strategy for complex information. The UI does not shout; it breathes. 

Key visual principles:
- **Clarity over Density**: Information is spaced to avoid overwhelming the user.
- **Intentional Polish**: Subtle gradients and blurs provide a premium feel without sacrificing accessibility.
- **Sophisticated AI**: Intelligence is represented by "Deep Indigo" glows rather than flashy robotic motifs, suggesting a wise companion rather than a tool.

## Colors

The palette is rooted in a soft, neutral foundation that provides a restful canvas for data. 

- **Primary (Deep Indigo)**: Used for AI-driven insights, primary actions, and branding. It signifies intelligence and deep focus.
- **Secondary (Slate)**: Used for secondary text and structural borders.
- **Success/Growth (Sage Green)**: A muted, premium green for habit completion and positive trends.
- **Energy (Terracotta)**: Reserved for high-priority habits, streaks, and "action-needed" states.
- **Surface Strategy**: In light mode, surfaces use off-whites and cool grays to prevent eye strain. In dark mode, deep slate tones provide depth without being pitch black, maintaining a "midnight" premium feel.

## Typography

The design system utilizes **Inter** for its systematic reliability and exceptional legibility across all sizes.

- **Tracking**: Headings use a slight negative letter-spacing for a "tight," professional look, while small labels use generous tracking (0.08em) for a high-end, editorial feel.
- **Hierarchy**: Clear distinction is made between "Display" (for milestones), "Headlines" (for navigation/sections), and "Stats" (for data visualization). 
- **Body**: Standard body text is optimized for long-form reading of AI habit summaries, using a 1.6 line-height to ensure maximum breathing room.

## Layout & Spacing

This system follows a **4px base unit** with a rhythmic progression designed to create a sense of openness.

- **Grid Strategy**: A 12-column fluid grid for desktop and a single-column flow for mobile.
- **Margins**: Generous 24px internal margins for cards ensure content never feels cramped.
- **Rhythm**: Use 32px (xl) or 48px (xxl) vertical gaps between major functional sections to clearly delineate the user's focus.
- **Safe Zones**: On mobile, content is strictly constrained within 16px side margins to ensure clarity on smaller displays.

## Elevation & Depth

Hierarchy is established through **Tonal Layers** and **Glassmorphism**, avoiding heavy shadows in favor of light.

- **Base Layer**: The background is a solid off-white or deep slate.
- **Surface Layer**: Cards use a 1px border in a slightly darker/lighter neutral tone (low-contrast outline) with a very soft, high-diffusion shadow (8% opacity).
- **Glass Layer**: Overlays, navigation bars, and AI insight modals use a 20px backdrop blur with a 70% opacity white/slate fill. This creates a "frosted" effect that keeps the user grounded in their current context.
- **AI Focus**: Elements specifically generated by AI use a subtle `Deep Indigo` outer glow (4px blur) to differentiate "calculated" data from "raw" input.

## Shapes

The shape language is consistently **Rounded**, reflecting the soft, approachable nature of wellness.

- **Standard Elements**: Buttons and input fields use a 0.5rem (8px) radius.
- **Content Containers**: Cards and modular sections use a `rounded-xl` (1.5rem / 24px) radius to create a soft, modern silhouette.
- **Interactive Indicators**: Success badges and chips use a full-pill shape (3rem radius) to contrast against the more structured cards.

## Components

- **Buttons**: Primary buttons are solid Deep Indigo. Secondary buttons are ghost-style with 1px neutral borders. All buttons have a high-contrast label and 16px horizontal padding.
- **Habit Cards**: Borderless with a soft shadow. They feature a Sage Green progress bar (2px height) at the bottom.
- **AI Insights**: A specialized card variant with a Glassmorphic background and a Deep Indigo "Spark" icon. Use high-contrast labels for the AI's "recommendation" text.
- **Data Visualization**: Charts use soft area fills with 10% opacity of the line color. Data points are 4px solid circles. No grid lines are used; only 3-4 horizontal reference lines in ultra-low contrast.
- **Inputs**: Minimalist fields with only a bottom border that transitions to a 2px Deep Indigo line on focus. Labels sit 4px above the input in `label-caps` style.
- **Chips**: Small, pill-shaped tags used for habit categories (e.g., "Mindfulness", "Fitness") using muted tonal backgrounds of the accent colors.