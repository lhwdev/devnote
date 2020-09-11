import webpack from 'webpack'
import webpackConfig from './webpack.config'


const handler: webpack.Compiler.Handler = (err, stats) => {
  if (err) {
    console.error(err.stack || err)
    if ('details' in err) {
      console.error((err as any).details)
    }
    return;
  }

  const info = stats.toJson()

  if (stats.hasErrors()) {
    console.error(info.errors)
  }

  if (stats.hasWarnings()) {
    console.warn(info.warnings);
  }

  // Log result...
}

webpack(webpackConfig, handler)
