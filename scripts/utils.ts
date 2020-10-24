export function launchAsync(fun: () => Promise<void>) {
	fun()
}


// a very simple future
export class Future<T> {
	private static initial = Symbol('initial')
	private static noError = Symbol('noError')

	private value?: T
	private error: any = Future.initial
	private handler: ((err: any, data: T) => void)[] = []


	constructor(promise: Promise<T>) {
		promise.then(result => {
			this.value = result
			this.error = Future.noError
			if(this.handler !== null) this.handler.forEach(h => h(null, result))
		}, reason => {
			this.error = reason
			if(this.handler !== null) this.handler.forEach(h => h(reason, null))
		})
	}

	get(): Promise<T> {
		// completed without error
		if(this.error === Future.noError)
			return new Promise((resolve, _) => resolve(this.value))

		// not completed yet
		if(this.error === Future.initial)
			return new Promise((resolve, reject) => {
				this.handler.push((err, data) => {
					if(err) reject(err)
					else resolve(data)
				})
			})

		// completed with error
		return new Promise((_, reject) => reject(this.error))
	}

	get isCompleted() { return this.error !== Future.initial }

	get isSuccessful() { return this.error === Future.noError }
}

export function future<T>(promise: Promise<T>): Future<T> {
	return new Future(promise)
}
