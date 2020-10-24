import React, { PropsWithChildren } from 'react'
import  { computeElevation } from '../shadow'


export default function Card(props: PropsWithChildren<{ elevation?: number, noPadding?: booelan }>) {
	return <div style={{
		boxShadow: computeElevation(props.elevation || 1),
		padding: props.noPadding ? 0 : '8px',
		margin: '8px',
		borderRadius: '4px'
	}}>
		{props.children}
	</div>
}
