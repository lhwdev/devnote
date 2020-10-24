import { readFileSync } from 'fs'
import { promises as fsPromise } from 'fs'
import { Options } from 'posthtml'

import { Node, NodeTag, Tree } from 'posthtml-parser'


export type NodeRef<T> = {
	value: T,
	merge(array: T[]): void
	replaceMerge(array: T[]): void
}

export type WalkContext = {
	parents: NodeTag[],
	value: Node
}

export type Matcher = string | {
	tag?: string | RegExp,
	attrs?: Record<string, string | RegExp>,
	content?: ((tree: Tree) => boolean) | Matcher[]
}

type Message = {
	type: string,
	file: string,
	from?: string
}

type RootTree = {
	messages: Message[],
	options: {
		from: string
	} & Options
} & Node[]


function iterable<T>(iterator: () => Iterator<T>): Iterable<T> {
	return {
		[Symbol.iterator]: iterator
	}
}

function transformIterable<T, R>(original: Iterable<T>, transform: (arg: T) => (R | undefined)): Iterable<R> {
	return {
		[Symbol.iterator]() {
			const iterator = original[Symbol.iterator]()

			return {
				next() {
					while(true) {
						const iteratorResult = iterator.next()
						if(iteratorResult.done) return { done: true, value: undefined }
						const value = transform(iteratorResult.value)
						if(value !== undefined) return {
							done: false,
							value
						}
					}
				}
			}
		}
	}
}


// \u001b[1;2;3;4m
function esc(...numbers) {
	return '\u001b[' + numbers.join(';') + 'm'
}

export function nodeToShortString(node: Node): string {
	if(typeof node === 'object') {
		const attrs = node.attrs === undefined || node.attrs === {} ?
			'' : ' ' + Object.keys(node.attrs).map(key => `${key}="${node.attrs[key]}"`).join(' ')
		if(node.content?.length != 0) return `<${node.tag}${attrs}>...</${node.tag}>`
		else return `<${node.tag}${attrs} />`
	}
	else return `"${node.replace('\r', '\\r').replace('\n', '\\n')}"`
}

export function nodeToShortStringRecursive(node: Node, options: any = {}, currentDepth = 0): string {
	let indent = ''
	for(let i = 0; i < currentDepth; i++) indent += '  '
	if(typeof node === 'object') {
		const attrs = node.attrs === undefined || node.attrs === {} ?
			'' : ' ' + Object.keys(node.attrs).map(key => `${esc(95)}${key}${esc(36)}="${esc(92)}${node.attrs[key]}${esc(36)}"`).join(' ')
		if('content' in node && node.content.length != 0) {
			let children
			if(options.depth && options.depth >= currentDepth)
				children = node.content.filter(node => typeof node !== 'string' || !/\s*(\r|\n|\r\n)\s*/.test(node)).map(node => nodeToShortStringRecursive(node, options, currentDepth + 1)).join('\n')
			else children = `${indent}...`
			return `${indent}${esc(36)}<${esc(91)}${node.tag}${attrs}${esc(36)}>\n${children}\n${indent}${esc(36)}</${esc(91)}${node.tag}${esc(36)}>`
		}
		else return `${indent}${esc(36)}<${esc(91)}${node.tag}${attrs} ${esc(36)}/>`
	}
	const original = node.replace('\r', `${esc(36)}\\r${esc(97)}`).replace('\n', `${esc(36)}\\n${esc(97)}`).trim()
	const content = `${indent}${esc(97)}${original}`
	if(original.startsWith('<!--')) return `${esc(32)}${content}`
	else return content
}

export class Helper {
	constructor(public node: NodeTag, public rootTree: RootTree) {}

	dependency(path: string) {
		this.rootTree.messages.push({
			type: 'dependency',
			file: path,
			from: this.rootTree.options.from
		})
	}

	readFileSync(path: string, encoding: BufferEncoding = 'utf-8'): string {
		this.dependency(path)
		return readFileSync(path, encoding)
	}

	async readFile(path: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
		this.dependency(path)
		return await fsPromise.readFile(path, encoding)
	}

	private static matchesText(string: string, matcher: string | RegExp): boolean {
		return typeof matcher === 'string' ? string === matcher : matcher.test(string)
	}

	static matches(matcher: Matcher, node: Node): boolean {
		if(typeof node === 'string' || typeof matcher === 'string') {
			if(matcher === node) return true
			return false
		}

		if('tag' in matcher)
			if(!Helper.matchesText(node.tag, matcher.tag)) return false

		if('attrs' in matcher) {
			if(!node.attrs) return false
			for(const [key, rule] of Object.entries(matcher.attrs)) {
				if(!(key in node.attrs)) return false
				const value = node.attrs[key]
				if(!Helper.matchesText(value, rule)) return false
			}
		}

		if('content' in matcher) {
			const content = matcher.content
			if(Array.isArray(content)) {
				if(content.length !== node.content.length) return false
				for(let i = 0; i < matcher.content.length; i++) {
					if(!Helper.matches(content[i], node.content[i])) return false
				}
			} else if(!content(node.content)) return false
		}

		return true
	}

	*match(matcher: Matcher): Iterable<NodeRef<Node>> {
		for(const node of this.walk()) {
			if(Helper.matches(matcher, node.value)) yield node
		}
	}

	*matchTag(matcher: Matcher): Iterable<NodeRef<NodeTag>> {
		for(const node of this.walk()) {
			if(Helper.matches(matcher, node.value)) yield node as NodeRef<NodeTag>
		}
	}

	*walk(): Iterable<NodeRef<Node>> {
		const self = this
		const node = self.node

		function* traverse(tree: NodeTag): Iterable<NodeRef<Node>> {
			const list = tree.content
			let haveEmbed = false

			if(list !== undefined) {
				for(let i = 0; i < list.length; i++) {
					const item = list[i]

					yield {
						get value() { return item },
						set value(newItem) {
							list[i] = newItem
						},
						merge(array) {
							haveEmbed = true
							const newList: any[] = [...tree.content]
							const last = newList[i]
							if(Array.isArray(last)) newList[i] = [...last, ...array] // multiple embed; merge
							else newList[i] = [last, ...array]
							tree.content = newList
						},
						replaceMerge(array) {
							haveEmbed = true
							const newList: any[] = [...tree.content]
							newList[i] = array
							tree.content = newList
						}
					}
					if(typeof item === 'object')
						yield* traverse(item)
				}

			}

			if(haveEmbed) {
				// flatten
				let newList = []
				for(const element of list) {
					if(Array.isArray(element)) newList = [...newList, ...element]
					else newList.push(element)
				}
			}
		}

		yield* traverse(node)
	}

	*walkTag(): Iterable<NodeRef<Node>> {
		for(const node of this.walk()) {
			if(typeof node !== 'string') yield node
		}
	}

	*walkWithContext(): Iterable<WalkContext> {
		const self = this
		const node = self.node

		function* traverse(tree: NodeTag, parents: NodeTag[]): Iterable<WalkContext> {
			const list = tree.content

			if(list !== undefined) {
				for(let i = 0; i < list.length; i++) {
					const item = list[i]

					yield {
						parents: parents,
						get value() { return item },
						set value(newItem) {
							list[i] = newItem
						}
					}
					if(typeof item === 'object')
						yield* traverse(item, [...parents, tree])
				}

			}
		}

		yield* traverse(node, [])
	}

	withTag(tag: string): Iterable<NodeRef<Node>> {
		return transformIterable(this.walk(), node =>
			typeof node.value !== 'string' && node.value.tag === tag ? node : undefined
		)
	}

	withAttrKey(key: string): Iterable<NodeRef<Node>> {
		return transformIterable(this.walk(), node => typeof node.value !== 'string' &&
			Object.keys(node.value.attrs).includes(key) ?	node : undefined
		)
	}
}


type Handler = (tree: RootTree, helper: Helper) => void


function rootNode(tree: Tree): NodeTag {
	return { tag: '__root', content: tree }
}

export default function posthtmlSimplify(handler: Handler) {
	return (tree) => {
		const helper = new Helper(rootNode(tree), tree)
		try {
			handler(tree, helper)
		} catch(e) {
			console.error(e)
			throw e
		}
		return helper.node
	}
}

type AsyncHandler = (tree: RootTree, helper: Helper) => Promise<void>

export function posthtmlSimplifyAsync(handler: AsyncHandler) {
	return async (tree) => {
		const helper = new Helper(rootNode(tree), tree)
		try {
			await handler(tree, helper)
		} catch(e) {
			console.error(e)
			throw e
		}
		return helper.node.content
	}
}

