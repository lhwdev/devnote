import { NodeTag } from 'posthtml-parser'
import { highlighterFuture } from './highlight'


export default async function highlightToNode(code: string, language: string): Promise<NodeTag> {
	const highlighter = await highlighterFuture.get()
	const tokens = highlighter.codeToThemedTokens(code, language, { includeExplanation: true /* later */ })

	const nodes = []
	for(const line of tokens) {
		for(const token of line) {
			nodes.push({ tag: 'span', attrs: { style: `color: ${token.color}` }, content: [token.content] })
		}
		nodes.push('\n')
	}
	return { tag: 'pre', attrs: { class: 'shiki block-code scroller' }, content: [
		{ tag: 'code', content: nodes }
	] }
}
