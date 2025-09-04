/** @type {import('tailwindcss').Config} */
import plugin from 'tailwindcss/plugin';

const pxScale = (vals) =>
  Object.fromEntries(vals.map((v) => [String(v), `${v}px`]));

export default {
  darkMode: 'class',
  content: [
    // NOTE: intentionally minimal; the build script supplies precise --content
    // globs per section and per component to keep CSS tiny.
  ],
  theme: {
    extend: {
      screens: { sm: '480px', md: '768px', lg: '1010px', xl: '1365px' },
      colors: {
        primary: { DEFAULT: '#FB5BA2', dark: '#C30676' },
        accent:  { DEFAULT: '#F40793', dark: '#C30676' }
        // ...rest of your palette
      },
      fontFamily: {
        sans: ['Poppins', 'Inter', 'Montserrat', 'Open Sans', 'arial', 'sans-serif']
      },
      boxShadow: {
        sidebar: '0 0 8px 0 rgba(0, 0, 0, 0.08)'
      }
    }
  },
  plugins: [
    // Custom short utilities — generated on-demand via matchUtilities
    plugin(function({ matchUtilities }) {
      // numeric token sets
      const PB = pxScale([8, 12, 16, 22, 44, 66, 88, 120]);
      const MT = pxScale([8, 16, 24, 32, 48, 64, 120]);
      const FZ = pxScale([10, 12, 14, 16, 18, 20, 22, 24, 32]);
      const LH = pxScale([16, 20, 24, 28, 32, 40]);
      const W  = pxScale([50, 100, 150, 200, 300]);
      const H  = pxScale([50, 100, 150, 200, 300]);

      // with "fs-" prefix
      matchUtilities(
        {
          'fs-pb': (v) => ({ paddingBottom: v }),
          'fs-mt': (v) => ({ marginTop: v }),
          'fs-fz': (v) => ({ fontSize: v }),
          'fs-lh': (v) => ({ lineHeight: v }),
          'fs-w':  (v) => ({ width: v }),
          'fs-h':  (v) => ({ height: v })
        },
        { values: { ...PB, ...MT, ...FZ, ...LH, ...W, ...H } }
      );

      // alias without prefix to support "pb-66" style
      matchUtilities(
        {
          pb: (v) => ({ paddingBottom: v }),
          mt: (v) => ({ marginTop: v }),
          fz: (v) => ({ fontSize: v }),
          lh: (v) => ({ lineHeight: v }),
          w:  (v) => ({ width: v }),
          h:  (v) => ({ height: v })
        },
        { values: { ...PB, ...MT, ...FZ, ...LH, ...W, ...H } }
      );
    })
  ]
};