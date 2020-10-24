import React, { Component } from 'react'
import Card from '../../components/card'


import locals from '$root/locals'


export default class Home extends Component {
	constructor(props) {
		super(props)
	}

	render = () => <>
		<header className="center-big">
			<h1>{locals.title}</h1>
			<span className="faded-text-on-surface">{locals.description}</span>
			<span className="fix-right-bottom">@lhwdev</span>
		</header>
		<main>
			<Card>
				Hello, world!
			</Card>
		</main>
	</>
}
