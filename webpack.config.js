const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
	entry: {
		popup: "./src/popup.tsx",
		content: "./src/content.ts",
		background: "./src/background.ts",
	},
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "[name].js",
	},
	module: {
		rules: [
			{
				test: /\.(js|jsx|ts|tsx)$/,
				exclude: /node_modules/,
				use: {
					loader: "babel-loader",
					options: {
						presets: [
							"@babel/preset-env",
							"@babel/preset-react",
							"@babel/preset-typescript",
						],
					},
				},
			},
			{
				test: /\.(png|jpe?g|gif|svg)$/i,
				use: [
					{
						loader: "file-loader",
						options: {
							name: "/assets/images/[name].[ext]",
						},
					},
				],
			},
			{
				test: /\.css$/i,
				use: [
					"style-loader",
					"css-loader",
					{
						loader: "postcss-loader",
						options: {
							postcssOptions: {
								plugins: ["tailwindcss", "autoprefixer"],
							},
						},
					},
				],
			},
		],
	},
	resolve: {
		extensions: [".ts", ".tsx", ".js", ".jsx"],
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: "./src/popup.html",
			filename: "popup.html",
		}),
		new CopyPlugin({
			patterns: [{ from: "public" }, { from: "src/assets/", to: "assets" }],
		}),
	],
	target: ["web", "es5"],
};
