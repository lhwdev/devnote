module.exports = {
	presets: [
		"@babel/preset-env",
		[
			"@babel/preset-react",
			{
				"flow": false,
				"typescript": true
			}
		],
		[
			"@babel/preset-typescript",
			{
				isTSX: true,
				allExtensions: true
			}
		]
	],
	plugins: [
		"@babel/plugin-transform-runtime",
		["@babel/plugin-proposal-decorators", { legacy: true }],
		["@babel/plugin-proposal-class-properties", { loose: true }],
		"@babel/plugin-proposal-object-rest-spread",
		"@babel/plugin-proposal-optional-chaining",
		"@babel/plugin-transform-typescript",
	]
}
