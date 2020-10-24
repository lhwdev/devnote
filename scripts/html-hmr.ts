// Referenced https://stackoverflow.com/questions/52464975/webpack-hmr-not-reloading-html-file

import HtmlWebpackPlugin from 'html-webpack-plugin'
import { Compiler } from 'webpack'
import WebpackDevServer from 'webpack-dev-server'


export default class HtmlWebpackHmrPlugin {
	static devServer: WebpackDevServer


	apply(compiler: Compiler) {
		const cache = {}
		const plugin = { name: 'HtmlWebpackHmrPlugin' }
		compiler.hooks.compilation.tap(plugin, compilation => {
			HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapAsync(plugin, (data, callback) => {
				const orig = cache[data.outputName]
				const html = data.html
				if(orig && orig !== html) {
					console.log('HtmlWebpackHmrPlugin: reload invoked by HtmlWebpackPlugin')
					const devServer = HtmlWebpackHmrPlugin.devServer
					devServer.sockWrite(devServer.sockets, 'content-changed')
				}
				cache[data.outputName] = html
				callback(null, data)
			})
		})
	}
}
