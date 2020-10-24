import marked, { Renderer } from 'marked'
import { Tree } from 'posthtml-parser'
import { promisify } from 'util'
import highlight from './highlight'
import  { MarkedPosthtml } from './markedParser'
import { launchAsync } from './utils'

const indentRegex = /^( |\t)+/
const markedAsync = promisify<string, marked.MarkedOptions, string>(marked)

// due to the error: "TypeError: Class constructor Renderer cannot be invoked without 'new'"
// so explicitly call 'new' Renderer() and extend it
const CustomRenderer = Object.assign(new Renderer(), {
	// https://github.com/markedjs/marked/blob/master/src/Renderer.js
	code(code, _infostring, _escaped) {
		// do not surround with extra pre/code
		return code // handled by highlighter: we use async highlighting so don't have to handle
	},

	codespan(code) {
		return `<code class="inline-code">${code}</code>`
	}
})


export async function markdown(str: string) {
	// remove indents
	const lines = str.split(/(?:\r\n|\r|\n)/)
	if(lines.length == 0) return ''
	let firstLine = 0
	for(; firstLine < lines.length; firstLine++) {
		if(lines[firstLine].replace(indentRegex, '') !== '') break
	}
	const indents = lines[firstLine].match(indentRegex)
	const indent = indents === null ? '' : indents[0]

	for(let i = 0; i < lines.length; i++) {
		const line = lines[i]
		lines[i] = line.startsWith(indent) ? line.substring(indent.length) : line
	}
	const content = lines.join('\n')

	return await markedAsync(content, {
		highlight: (code, language, callback) => launchAsync(async () => {
			callback(null, await highlight(code, language))
		}),
		renderer: CustomRenderer
	})
}

export async function markdownTree(tree: Tree): Promise<Tree> {
	const parser = new MarkedPosthtml(tree, {}, true)
	const result = await parser.parse()
	console.dir(result, { depth: 10 })
	return [...result, 'and original: <br/>', await markdown(tree.join(''))]
}
