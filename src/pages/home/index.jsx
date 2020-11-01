import locals from '$root/locals'

import React, { Component } from 'react'
import Button from '@material-ui/core/Button'
import Card from '@material-ui/core/Card'
import CardActions from '@material-ui/core/CardActions'
import CardContent from '@material-ui/core/CardContent'
import Typography from '@material-ui/core/Typography'


export default class Home extends Component {
	constructor(props) {
		super(props)
	}

	render = () => <>
		<header className="center-big">
			<h1>{locals.title}</h1>
			<span className="faded-text-on-surface">{locals.description}</span>
			<span className="fix-right-bottom" style={{
				fontSize: '14px'
			}}>@lhwdev</span>
		</header>
		<main>
			<Card style={{
				maxWidth: 275
			}}>
				<CardContent>
					<Typography variant="h5" component="h2">Hello, world!</Typography>
				</CardContent>
				<CardActions>
					<Button style={{
						marginLeft: 'auto'
					}} size="small">Okay</Button>
				</CardActions>
			</Card>
		</main>
	</>
}
