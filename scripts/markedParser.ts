// markedParser.ts
// convert marked tokens into posthtml tree(directly)
// this does not do santinizing: use this for internal purpose only
import {  MarkedOptions, Slugger, Token, Tokenizer, Tokens, TokensList } from 'marked'
import { escape } from 'marked/src/helpers'
import { NodeTag, Tree } from 'posthtml-parser'
import { highlightTree } from './highlight'
import MarkedPosthtmlLexer from './markedLexer'



// fake type; I don't know why, but @types/marked is quite different from the source of marked
type RealToken = (Token | {
  type: 'list', // changed
  raw: string,
  ordered: boolean,
  start: number, // changed
  loose: boolean,
	items: Tokens.ListItem[]
})

const newLineRegex = /\r\n|\r|\n/
const fake = '<fake />'


export class MarkedPosthtml {
	private strings: string[]
	private length: number
	private htmls: Record<number, NodeTag>
	private htmlIndexes: number[]
	private tokenizer: Tokenizer

	constructor(public tree: Tree, public options?: MarkedOptions, public removeIndents = false) {
		// super(options)

		let indent = ''
		if(removeIndents) {
			const firstStr = tree.find(node => typeof node === 'string') as string
			if(firstStr !== undefined) {
				const match = firstStr.match(/^(?:\s*(?:\r\n|\n|\r))*([\t ]*)\S/)
				if(match) {
					indent = match[1]
				}
			}
		}

		let index = 0
		const strings = []
		const htmls = {}
		const htmlIndexes = []
		for(const node of tree) {
			if(typeof node === 'string') {
				const lines = node.split(newLineRegex)
					.map(line => line.startsWith(indent) ? line.substring(indent.length) : line)
				strings.push(lines.join('\n'))
				index += lines.length
			} else {
				htmls[index] = node
				htmlIndexes.push(index)
				strings.push(fake)
				index += fake.length
			}
		}
		this.strings = strings
		this.length = index
		this.htmls = htmls
		this.htmlIndexes = htmlIndexes // itself sorted; index is ascending
		console.dir(this, { depth: 10 })

		const self = this
		this.tokenizer = new class extends Tokenizer {
			html(_src: string) {
				if(!super.html(_src)) return null
				console.log('html')
				// length of src == length of original text - index
				// const index = this.length - src.length
				const indexes = self.htmlIndexes
				// if(indexes.length === 0 || indexes[0] !== index) return null
				const node = self.htmls[indexes[0]]
				indexes.shift()
				return { // fake token
					type: 'html',
					raw: fake,
					pre: ['pre', 'script', 'style'].includes(node.tag),
					text: fake,
					node: node
				} as Tokens.HTML
			}

			tag(_src: string, inLink: boolean, inRawBlock: boolean): Tokens.Tag {
				if(!super.tag(_src, inLink, inRawBlock)) return null
				console.log('html')
				// length of src == length of original text - index
				// const index = this.length - src.length
				const indexes = self.htmlIndexes
				// if(indexes.length === 0 || indexes[0] !== index) return null
				const node = self.htmls[indexes[0]]
				indexes.shift()
				return { // fake token
					type: 'html',
					raw: fake,
					inLink, inRawBlock,
					pre: ['pre', 'script', 'style'].includes(node.tag),
					text: fake,
					node: node
				} as Tokens.Tag
			}
		}
	}

	async parse(): Promise<Tree> {
		const options = {
			...this.options,
			tokenizer: this.tokenizer as Tokenizer
		}
		const parser = new MarkedPosthtmlParser(options)
		const lexer = new MarkedPosthtmlLexer(options)

		return await parser.parse(lexer.lex(this.strings.join('')))
	}
}


export class MarkedPosthtmlParser {
	private slugger = new Slugger()

	constructor(
		public options: MarkedOptions = {} // many of this options are ignored
	) {}

	async parse(tokens: TokensList, top = true): Promise<Tree> {
		console.dir(tokens, { depth: 10 })
		const tree: Tree = []
		const length = tokens.length
		for(let i = 0; i < length; i++) {
			const t = tokens[i] as RealToken
			if(!('type' in t)) continue // in case of def: this is not rendered
			switch(t.type) {
				case 'space': continue
				case 'hr': {
					tree.push({ tag: 'hr' })
					break
				}
				case 'heading': {
					tree.push({
						tag: `h${t.depth}`,
						attrs: {
							id: this.options.headerIds?
								this.options.headerPrefix + this.slugger.slug(t.raw) : undefined
						},
						content: this.parseInline((t as any).tokens)
					})
					break
				}
				case 'code': {
					tree.push(t.lang ? await highlightTree(t.text, t.lang) : {
						tag: 'pre',
						attrs: { class: 'block-code scroller' },
						content: [{ tag: 'code', content: [t.text] }]
					})
					break
				}
				case 'table': {
					const table = []
					const childTokens = (t as any).tokens
					table.push({
						tag: 'thead',
						content: [{
							tag: 'tr',
							content: t.header.map((_, index) => ({
								tag: 'th',
								attrs: { align: t.align[index] },
								content: this.parseInline(childTokens.header[index])
							}))
						}]
					})
					const tableBody = []
					t.cells.forEach((_, index) => {
						const cell = []
						const row = childTokens.cells[index]
						for(let rowIndex = 0; rowIndex < row.length; rowIndex++) {
							cell.push({
								tag: 'td',
								attrs: { align: t.align[rowIndex] },
								content: this.parseInline(row[rowIndex])
							})
						}

						tableBody.push({
							tag: 'tr',
							content: cell
						})
					})

					table.push({
						tag: 'tbody',
						content: tableBody
					})

					tree.push({
						tag: 'table',
						content: tableBody
					})
					break
				} // end case table
				case 'blockquote': {
					tree.push({
						tag: 'blockquote',
						content: await this.parse((t as any).tokens)
					})
					break
				}
				case 'list': {
					const body = []
					const items = t.items
					for(let i = 0; i < items.length; i++) {
						const item = items[i]
						const itemBody = []
						const tokens = (item as any).tokens

						if(item.task) {
							const checkBox = {
								tag: 'input',
								attrs: {
									checked: item.checked,
									disabled: '',
									type: 'checkbox'
								}
							}
							// TODO
							// if(t.loose) {
							// 	if(tokens.length > 0 && tokens[0].type === 'text') {
							// 		tokens[0].tokens =
							// 	}
							// }
							itemBody.push(checkBox)
						}
						itemBody.push(...await this.parse(tokens, t.loose))

						body.push({
							tag: 'li',
							content: itemBody
						})
					}

					tree.push({
						tag: t.ordered? 'ol' : 'ul',
						attrs: { start: t.ordered && t.start !== 1 ? '' + t.start : '' },
						content: body
					})
					break
				} // end case 'list'
				case 'html': {
					tree.push((t as any).node)
					break
				}
				case 'paragraph': {
					tree.push({
						tag: 'p',
						content: this.parseInline((t as any).tokens)
					})
					break
				}
				case 'text': {
					const body = ['tokens' in t ? (t as any).tokens : t.text]
					while(i + 1 < length && (tokens[i + 1] as any).type === 'text') {
						const t2 = tokens[++i] as any
						body.push('tokens' in t2 ? t2.tokens : t2.text)
					}
					if(top) tree.push({
						tag: 'p',
						content: body
					})
					else tree.push(...body)
				}
				default: throw new Error(`Token with ${t.type} type was not found`)
			}
		}

		return tree
	}

	parseInline(tokens: TokensList): Tree {
		const tree: Tree = []
		const length = tokens.length
		for(let i = 0; i < length; i++) {
			const t = tokens[i]
			if(!('type' in t)) continue
			switch(t.type) {
				case 'escape':
					tree.push(t.text)
					break
				case 'html':
					tree.push((t as any).node)
					break
				case 'link':
					tree.push(t.href === null? t.title : {
						tag: 'a',
						attrs: { href: escape(t.href), title: t.title },
						content: [t.text]
					})
					break
				case 'image':
					tree.push({
						tag: 'image',
						attrs: { src: t.href, alt: t.text, title: t.title }
					})
					break
				case 'strong':
					tree.push({
						tag: 'strong',
						content: this.parseInline((t as any).tokens)
					})
					break
				case 'em':
					tree.push({
						tag: 'em',
						content: this.parseInline((t as any).tokens)
					})
					break
				case 'codespan':
					tree.push({
						tag: 'code',
						attrs: { class: 'inline-code' },
						content: [t.text]
					})
					break
				case 'br':
					tree.push({ tag: 'br' })
					break
				case 'del':
					tree.push({
						tag: 'del',
						content: this.parseInline((t as any).tokens)
					})
					break
				case 'text':
					tree.push(t.text)
					break
				default:
					throw new Error(`Token with ${t.type} type was not found`)
			}
		}

		return tree
	}
}
