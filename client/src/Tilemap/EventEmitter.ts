export default class EventEmitter {
	private Listeners: Map<string, Function[]>

	constructor() {
		this.Listeners = new Map()
	}

	public On(eventName: string, listener: Function) {
		const listeners = this.Listeners.get(eventName) || []
		listeners.push(listener)
		this.Listeners.set(eventName, listeners)
	}

	public Emit(eventName: string, ...parameters: unknown[]) {
		const listeners = this.Listeners.get(eventName) || []
		listeners.forEach(listener => listener(...parameters))
	}
}