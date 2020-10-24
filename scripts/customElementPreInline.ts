import fs from 'fs'
import { NodeTag } from 'posthtml-parser'
import { highlightTree } from './highlight'
import { posthtmlSimplifyAsync, Helper } from './posthtml-simplify'

// 	'x-code': async node =>
// 		await highlightTree(node.content, node.attrs.language),
// 	'include-code': async node =>
// 		await highlightTree(await fs.promises.readFile(node.attrs.src, 'utf-8'), node.attrs.language),

const customElements = {
	'include-code': {
		arguments: ['src', 'language'],
		replaceTag: async node =>
			await highlightTree(await fs.promises.readFile(node.attrs.src, 'utf-8'), node.attrs.language)
	},
	'x-code': {
		arguments: ['language'],
		replaceTag: async node =>
			await highlightTree(node.content, node.attrs.language)
	}
}

async function promiseOrResult<T>(value: Promise<T> | T): Promise<T> {
	if(value instanceof Promise) return await value
	else return value
}


const customElementPreInline = [
	posthtmlSimplifyAsync(async (_, helper) => {
		for(const node of helper.walkTag()) {
			const tag = node.value as NodeTag
			const task = customElements[tag.tag]
			if(task && Helper.matches(task, tag)) {
				if(task.replaceContent)
					tag.content = await promiseOrResult(task.replaceContent(tag))
				if(task.replaceTag) { // this preserves left tag
					const result = await promiseOrResult(task.replaceTag(tag))
					if(!result.attrs) result.attrs = {}
					if(task.arguments && tag.attrs) for(const key in tag.attrs) {
						if(!task.arguments.includes(key))
							result.attrs[key] = tag.attrs[key]
					}
					node.value = result
				}
				else if(task.replace)
					node.value = await promiseOrResult(task.replace(tag))
			}
		}
	})
]

export default customElementPreInline
