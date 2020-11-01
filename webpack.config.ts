import * as path from 'path'
import * as fs from 'fs'

import webpack, { Compiler } from 'webpack'
import { Configuration as WebpackDevServerConfiguration } from 'webpack-dev-server'
import PnpWebpackPlugin from 'pnp-webpack-plugin'
import { CleanWebpackPlugin } from 'clean-webpack-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import HtmlWebpackHmrPlugin from './scripts/html-hmr'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'

import locals from './locals'

import posthtmlInclude from './scripts/posthtml-include-all'
import posthtmlExpressions from 'posthtml-expressions'
import { posthtmlSimplifyAsync } from './scripts/posthtml-simplify'
import customElementPreInline from './scripts/customElementPreInline'
import { highlightProcessor } from './scripts/highlight'
import { markdown, markdownTree } from './scripts/markdown'
import { NodeTag } from 'posthtml-parser'




interface Plugin {
	apply(compiler: Compiler): void
}

// https://github.com/DefinitelyTyped/DefinitelyTyped/issues/27570#issuecomment-474628163
interface Configuration extends webpack.Configuration {
	devServer?: WebpackDevServerConfiguration
}


const result = (env: any, options: any): Configuration => {
	const isProduction = options.mode == 'production'
	const isDevelopment = !isProduction

	// paths
	const rootDir = __dirname
	const srcDir = path.resolve(rootDir, 'src')
	const outputDir = path.resolve(rootDir, './dist')

	// posthtml
	const postHtmlPlugins = (() => {

		const read = async (path) => await fs.promises.readFile(path, 'utf-8')

		return [
			// require('posthtml-include')({ root: srcDir }),
			posthtmlInclude({
				root: srcDir,
				extensionHandlers: {
					'.html': read, // as-is
					'.md': async path => await markdown(await read(path)),
					async default(path) {
						const content = await import(path) // TODO: use webpack loader
						if(typeof content !== 'string')
							throw new Error(`the result of import is not string(but ${typeof content}): ${content}`)
						return content
					}
				}
			}),

			// <markdown ..>
			posthtmlSimplifyAsync(async (_, helper) => {
				try {
					for(const value of helper.withTag('markdown')) {
						const node = value.value as NodeTag

						const result = await markdownTree(node.content)
						value.replaceMerge(result)
					}
				} catch(e) { console.error('WOW ERROR!:' + e); throw e }
			}),
			...customElementPreInline,
			highlightProcessor,
			posthtmlExpressions({
				locals: locals
			})
		]
	}) // end postHtmlPlugins = ...


	// tests
	const jsKindTest = /\.(m?jsx?|tsx?)$/i


	// loaders
	const cssBase = [
		isDevelopment ? 'style-loader' : {
			loader: MiniCssExtractPlugin.loader,
			options: {
				publicPath: path.join(outputDir, 'css')
			}
		},
		'css-loader'
	]

	const sass = [
		...cssBase,
		{
			loader: 'sass-loader',
			options: {
				sassOptions: {
					includePaths: [srcDir]
				}
			}
		}
	]


	const rules: webpack.RuleSetRule[] = [
		// lint - js kind
		{
			enforce: 'pre',
			test: jsKindTest,
			loader: 'eslint-loader',
			options: {
				cache: '.yarn/otherCache/eslint-loader-cache'
			}
		},

		// js kind
		{
			test: jsKindTest,
			loader: 'babel-loader',
			type: 'javascript/auto',
			resolve: {
				fullySpecified: false
			}

		},

		// .html
		{
			test: /\.html$/i,
			use: [
				'html-loader',
				{
					loader: 'posthtml-loader',
					options: {
						ident: 'posthtml',
						plugins: postHtmlPlugins
					}
				}
			]
		},

		// .css
		{
			test: /\.css$/i,
			use: cssBase
		},

		// .scss / .sass
		{
			test: /\.(scss|sass)$/i,
			use: sass
		}
	]

	const plugins: Plugin[] = [
		new HtmlWebpackPlugin({
			filename: 'index.html',
			template: path.resolve(srcDir, './index.html')
		}),

		...isDevelopment ? [
			// development
			new webpack.HotModuleReplacementPlugin(),
			new HtmlWebpackHmrPlugin(),
		] : [
			// production
			new CleanWebpackPlugin(),
			new MiniCssExtractPlugin(),
		],
	]

	return {
		mode: isProduction ? 'production' : 'development',
		entry: {
			index: path.resolve(srcDir, './index'),
		},
		module: { rules },

		plugins,

		output: {
			path: outputDir,
			// for preventing html-hmr invoking: if entry has changed, hash also changes
			// and the whole html content is changed
			filename: isProduction ? 'bundle.[name].[hash].js' : 'bundle.[name].js',
			publicPath: '/',
		},

		resolve: {
			alias: { // up-to-date with .eslintrc.yaml
				$root: rootDir
			},
			plugins: [PnpWebpackPlugin],
			extensions: ['.wasm', '.mjs', '.js', '.json', '.jsx', '.ts', '.tsx']
		},

		resolveLoader: {
			plugins: [PnpWebpackPlugin.moduleLoader(module)]
		},

		// development
		devtool: isDevelopment ? 'eval-source-map' : false,

		devServer: {
			before(_, server) {
				HtmlWebpackHmrPlugin.devServer = server
			},
			contentBase: outputDir,
			hot: true,
			inline: true,
		},

		cache: {
  	  // 1. Set cache type to filesystem
			type: 'filesystem',

			buildDependencies: {
  	    // 2. Add your config as buildDependency to get cache invalidation on config change
				config: [__filename]

  	    // 3. If you have other things the build depends on you can add them here
  	    // Note that webpack, loaders and all modules referenced from your config are automatically added
			},
		},


		// production
		optimization: {
			usedExports: isProduction
		},
	}
}


export default result
