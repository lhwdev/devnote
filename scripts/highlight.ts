import * as shiki from 'shiki'
import { future } from './utils'

import { posthtmlSimplifyAsync } from './posthtml-simplify'

import highlightToNode from './shikiHighlighter'


export const highlightProcessor = posthtmlSimplifyAsync(async (_, helper) => {
	for(const { value: pre } of helper.matchTag({ tag: 'pre', attrs: { class: 'shiki' } })) {
		pre.attrs.class = pre.attrs.class + ' block-code scroller'
	}
})


export const highlighterFuture = future(
	shiki.getHighlighter({ theme: 'material-theme-default' })
)


export default async function highlight(code: string, language: string) {
	const highlighter = await highlighterFuture.get()
	const result = highlighter.codeToHtml(code, language)
	return result
}

export async function highlightTree(code: string, language: string) {
	// const highlighter = await highlighterFuture.get()
	// const result = highlighter.codeToHtml(code, language)
	// return await posthtmlNode(result)
	return highlightToNode(code, language)
}
