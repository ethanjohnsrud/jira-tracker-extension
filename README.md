# Jira Tracking Extension

The **Jira Tracking Extension** is a Chrome extension designed to enhance productivity for development teams by providing an efficient way to track recently visited Jira links and development websites. The extension offers the following key features:

- **Track Recent Jira Links**: Automatically records and organizes recently visited Jira links, making it easy to revisit relevant issues and tasks.
- **Save and Rename Links**: Users can save important Jira links and development URLs for quick access. The extension allows for renaming saved links for better organization.
- **Link to Development Websites**: Easily link and navigate between Jira issues and related development websites, streamlining the workflow between tracking tasks and working on the code.
- **Convenient Navigation**: Users can filter and navigate through development websites based on region, environment, and common pages, providing a tailored and efficient browsing experience.

This extension is designed to improve the workflow for development teams, making it easier to manage and access the most relevant project information in real-time.


## Development
1. Install node modules, run `yarn`
2. Build extension dev mode, run `yarn dev`
3. Install the extension in the dist folder on Google Chrome

## Production
1. To build the extension in production mode using the webpack.prod config, run
  `yarn build`. This will minify the code.
2. You can then install the extension file inside the dist folder on Google Chrome

## Install the Extension in Chrome

1. Open **Google Chrome** and go to:  chrome://extensions/
2. Enable **Developer mode** (toggle in the top-right corner).  
3. Click on **"Load unpacked"**.  
4. Select the **dist/** folder in your project.  
5. The extension should now be installed and visible in Chrome.  

## Additional Information
This extension is built with ReactJs, Tailwind and webpack.

- The cache clear URL and the time interval are located in the `background.jsx` file.
- All the values for the dropdowns are located in the `constants` folder.

### Colors
- Primary color is set in the `tailwind.config.js` file.
- The background color is set in `src/index.css` file `line 20`

### Config

 You should mention the JavaScript files that you want to be in the extension as following in **webpack.config.js**
```
  entry: {
    popup: "./src/popup.jsx",
    content: "./src/content.jsx",
    background: "./src/background.jsx",
  },
```

### Author
**Ethan Johnsrud**
- [Github](https://github.com/ethanjohnsrud)
- [Portfolio](https://ethanjohnsrud.com/)
 