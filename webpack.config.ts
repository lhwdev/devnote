import * as path from 'path'
import webpack from 'webpack'
import * as webpackDevServer from 'webpack-dev-server'
import PnpWebpackPlugin from 'pnp-webpack-plugin'


// https://github.com/DefinitelyTyped/DefinitelyTyped/issues/27570#issuecomment-474628163
interface Configuration extends webpack.Configuration {
  devServer?: webpackDevServer.Configuration
}

const result: webpack.ConfigurationFactory = (env: any, argv): Configuration => {

  const loader = (name: string) => require.resolve(name)

  const isProduction = env.production
  const isDevelopment = !isProduction

  // paths
  const rootDir = __dirname
  const srcDir = path.resolve(rootDir, 'src')

  // tests
  const tsTest = /\.(tsx?)$/i


  const rules: webpack.RuleSetRule[] = [
    // tslint
    {
      enforce: 'pre',
      test: /\.(js|jsx|ts|tsx)$/i,
      loader: loader('eslint-loader'),
      options: {
        cache: '.yarn/otherCache/eslint-loader-cache'
      },
    },

    // typescript
    {
      test: tsTest,
      loader: loader('ts-loader'),
      options: {
        configFile: 'tsconfig.json'
      },
    },
  ]

  return {
    mode: isProduction ? 'production' : 'development',
    entry: {
      index: path.resolve(srcDir, './index.ts'),
    },
    module: { rules },

    output: {
      path: path.resolve(rootDir, './public'),
      filename: 'bundle.[name].[hash].js',
      publicPath: '/',
    },

    resolve: {
      plugins: [ PnpWebpackPlugin ],
    },

    resolveLoader: {
      plugins: [ PnpWebpackPlugin.moduleLoader(module) ]
    },

    // development
    devtool: isDevelopment ? 'source-map' : false,

    // devServer
    devServer: {
      contentBase: path.join(rootDir, 'public'),
      hot: true,
    },
  }
}


export default result
