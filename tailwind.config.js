module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx,html}", // Ensures Tailwind scans all files
  ],
  theme: {
    extend: {
      colors: {
        primary: "#7bbd4a",
        background: "#353535",
        "alternative-background": "#292929",

        //Set in indexedDB.css to match Chrome toolbar color
        // background: #353535;
      },
    },
  },
  darkMode: "class",
};
