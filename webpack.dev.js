const ExtReloader = require("webpack-ext-reloader-mv3");
const { merge } = require("webpack-merge");
const config = require("./webpack.config.js");

module.exports = merge(config, {
	mode: "development",
	devtool: "cheap-module-source-map",
	plugins: [
		new ExtReloader({
			reloadPage: true,
			entries: {
				background: "background",
				contentScript: "content",
				extensionPage: "popup",
			},
		}),
	],
});
