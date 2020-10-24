import posthtml from 'posthtml'
import { NodeTag, Tree } from 'posthtml-parser'

const processor = posthtml()


export async function posthtmlTree(content: string): Promise<Tree> {
	const tree = [...(await processor.process(content)).tree as any]
	return tree
}

export async function posthtmlNode(content: string, preferredRootTag = 'span'): Promise<NodeTag> {
	const tree = await posthtmlTree(content)
	if(tree.length === 1 && typeof tree[0] !== 'string') return tree[0]
	else return { tag: preferredRootTag, content: tree }
}

export function posthtmlTreeSync(content: string): Tree {
	const tree = [...(processor.process(content, { sync: true }) as any).tree]
	return tree
}

export function posthtmlNodeSync(content: string, preferredRootTag = 'span'): NodeTag {
	const tree = posthtmlTreeSync(content)
	if(tree.length === 1 && typeof tree[0] !== 'string') return tree[0]
	else return { tag: preferredRootTag, content: tree }
}
