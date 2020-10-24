
import { resolve } from 'path'
import { NodeTag, Tree } from 'posthtml-parser'
import { posthtmlTree } from '../posthtml'
import { posthtmlSimplifyAsync as posthtmlSimplifyAsync } from '../posthtml-simplify'


type UserExtensionHandler = (str: string) => Promise<string | Tree>

type UserOptions = {
  root: string,
  encoding?: BufferEncoding,
  extensionHandlers: Record<string, UserExtensionHandler> & { default: UserExtensionHandler }
}

export default function posthtmlInclude(options: UserOptions) {
	options = Object.assign({
		encoding: 'utf-8'
	}, options)

	const handleExtension = (src: string) => {
		let index = src.lastIndexOf('.')
		if(index == -1) index = src.length
		const handler = options.extensionHandlers[src.slice(index)]
		return handler ? handler(src) : options.extensionHandlers.default(src)
	}

	return posthtmlSimplifyAsync(async (tree: any, helper) => {
		for(const value of helper.withTag('include')) {
			const element = value.value as NodeTag
			const path = element.attrs.src
			const realPath = require.resolve(path, { paths: [resolve(tree.options.from, '../')] })

			helper.dependency(realPath)
			const result = await handleExtension(realPath)
			const newElement = typeof result === 'string' ? await posthtmlTree(result) : result

			value.replaceMerge(newElement)
		}
	})
}
