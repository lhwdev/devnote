import './main.scss'
import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import Home from './pages/home'


console.log('hOI!!!!!!')


class App extends Component<void, { page: ReactNode }> {
	constructor(props) {
		super(props)
		this.state = { page: Home }
	}

	render() {
		return React.createElement(this.state.page)
	}
}

document.addEventListener('load', () => {
	document.querySelector('#splasher').remove()
})

ReactDOM.render(<App />, document.getElementById('main-container'))
