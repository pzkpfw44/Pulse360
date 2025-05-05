/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Define semantic colors using CSS variables
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
        'bg-surface': 'var(--color-bg-surface)', // Main background (e.g., cards)
        'bg-muted': 'var(--color-bg-muted)',   // Body background, subtle areas
        'bg-sidebar': 'var(--color-bg-sidebar)',

        // Border Colors
        'border-base': 'var(--color-border-base)',
        'border-muted': 'var(--color-border-muted)',
        'border-accent': 'var(--color-border-accent)',

        // Interactive States (for hover/focus classes)
         'primary-hover': 'var(--color-primary-hover)',
         'secondary-hover': 'var(--color-secondary-hover)',
         'accent-hover': 'var(--color-accent-hover)',
      },
      // Define ring colors using CSS vars (for focus rings)
      ringColor: {
         primary: 'var(--color-primary-focus-ring)',
         secondary: 'var(--color-secondary-focus-ring)',
         accent: 'var(--color-accent-focus-ring)',
      },
      // Keep original font family if desired
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
       // Extend background gradients
      backgroundImage: {
         'gradient-brand': 'linear-gradient(to right, var(--color-primary), var(--color-secondary))',
         'gradient-sidebar': 'linear-gradient(to bottom, var(--color-primary), var(--color-secondary))',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      // Use class strategy for forms plugin to avoid conflicts
      strategy: 'class', // Use 'class' strategy
    }),
  ],
}