import React, { PropsWithChildren } from 'react'


export function computeElevation(elevation: number): string {
	 return `0 0px ${elevation * 8 - 4}px rgba(0, 0, 0, ${0.08 + 0.04 * Math.min((elevation / 1), 6)}), 0 ${elevation * 0.9}px ${elevation * 3 - 2}px rgba(0, 0, 0, ${elevation * 0.01 + 0.15})`
}


export default function Shadow(props: PropsWithChildren<{ elevation: number }>) {
	return <div style={{
		boxShadow: computeElevation(props.elevation)
	}}>{props.children}</div>
}
