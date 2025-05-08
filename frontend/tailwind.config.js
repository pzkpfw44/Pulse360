// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Make sure this covers all relevant files
  ],
  theme: {
    extend: {
      // Define semantic colors using CSS variables for Tailwind classes
      colors: {
        // Brand Colors
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',

        // Text Colors
        'text-base': 'var(--color-text-base)',
        'text-muted': 'var(--color-text-muted)',
        'text-inverted': 'var(--color-text-inverted)',
        'text-accent': 'var(--color-text-accent)',
        'on-primary': 'var(--color-text-on-primary)',
        'on-secondary': 'var(--color-text-on-secondary)',
        'on-accent': 'var(--color-text-on-accent)',

        // Background Colors
        'bg-primary': 'var(--color-bg-primary)',
        'bg-secondary': 'var(--color-bg-secondary)',
        'bg-accent': 'var(--color-bg-accent)',
        'bg-surface': 'var(--color-bg-surface)', // Main content background
        'bg-muted': 'var(--color-bg-muted)',   // Subtle background areas
        'bg-sidebar': 'var(--color-bg-sidebar)', // Base sidebar color

        // Border Colors
        'border-base': 'var(--color-border-base)',
        'border-muted': 'var(--color-border-muted)',
        'border-accent': 'var(--color-border-accent)',

        // Interactive States (for hover/focus utilities IF NOT using DaisyUI components)
        'primary-hover': 'var(--color-primary-hover)',
        'secondary-hover': 'var(--color-secondary-hover)',
        'accent-hover': 'var(--color-accent-hover)',
      },
      // Define ring colors using CSS vars (for focus rings IF NOT using DaisyUI components)
      ringColor: {
         primary: 'var(--color-primary-focus-ring)',
         secondary: 'var(--color-secondary-focus-ring)',
         accent: 'var(--color-accent-focus-ring)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      backgroundImage: {
         'gradient-brand': 'linear-gradient(to right, var(--color-primary), var(--color-secondary))',
         'gradient-sidebar': 'linear-gradient(to bottom, var(--color-primary), var(--color-secondary))',
      }
    },
  },
  // Add DaisyUI plugin and ensure @tailwindcss/forms is also present
  plugins: [
    require('@tailwindcss/forms')({ strategy: 'class' }),
    require("daisyui")
  ],

  // Add DaisyUI theme configuration
  daisyui: {
      themes: [
        {
          // Define your custom theme name
          pulse360theme: {
              // Map DaisyUI's theme keys to your CSS variables
              "primary": "var(--color-primary)", // Primary color for buttons, links, etc.
              "primary-content": "var(--color-text-on-primary)", // Text on primary elements

              "secondary": "var(--color-secondary)", // Secondary color
              "secondary-content": "var(--color-text-on-secondary)", // Text on secondary

              "accent": "var(--color-accent)", // Accent color
              "accent-content": "var(--color-text-on-accent)", // Text on accent

              "neutral": "var(--color-text-base)", // Neutral color (can adjust)
              "neutral-content": "var(--color-text-inverted)", // Text on neutral

              "base-100": "var(--color-bg-surface)", // Base background (cards, page)
              "base-200": "var(--color-bg-muted)",   // Slightly darker background
              "base-300": "var(--color-border-base)", // Used for borders sometimes
              "base-content": "var(--color-text-base)", // Default text on base backgrounds

              // Map semantic colors if desired, otherwise DaisyUI uses defaults
              // "info": "#...",
              // "success": "#16a34a", // Example green
              // "warning": "#facc15", // Example yellow
              // "error": "#dc2626",   // Example red

              // Define border radius, etc., if needed to match overall style
               "--rounded-btn": "0.375rem", // Matches Tailwind rounded-md
               "--rounded-box": "0.5rem",  // Matches Tailwind rounded-lg
          },
        },
        // You can include other DaisyUI themes here if you want to allow switching
        // "light", "dark",
      ],
      // Set your custom theme as the active theme
      // If you only have one theme defined, DaisyUI might pick it automatically,
      // but explicitly setting it is safer.
      // Note: DaisyUI uses data-theme attribute on <html> tag. Ensure your :root vars work.
      // We might need to set the theme attribute on the html tag in App.jsx or index.html
      // For now, defining the theme values should be the priority.
      // Let's assume :root variables will be inherited correctly.
      // themes: ["pulse360theme"], // Alternative way to specify just your theme
      darkTheme: "", // Set your dark theme name here if you create one
      base: true,
      styled: true,
      utils: true,
      prefix: "", // No prefix for daisy classes like 'btn', 'card'
      logs: true,
      themeRoot: ":root" // Apply theme variables to the root element
    },
}