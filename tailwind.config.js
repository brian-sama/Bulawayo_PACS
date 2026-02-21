/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./views/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'bcc-navy': '#003366',
                'bcc-slate': '#1E293B',
                'bcc-background': '#F9FAFB',
                'bcc-success': '#059669', // Emerald 600
                'bcc-warning': '#D97706', // Amber 600
                'bcc-danger': '#DC2626',  // Red 600
                'bcc-info': '#2563EB',    // Blue 600
            },
            fontFamily: {
                interface: ['Inter', 'Public Sans', 'sans-serif'],
            },
            borderRadius: {
                'bcc': '8px',
                'bcc-lg': '16px',
                'bcc-xl': '24px',
            },
            boxShadow: {
                'bcc-card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                'bcc-elevated': '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
            }
        },
    },
    plugins: [],
}
