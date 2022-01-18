import App from './App'
import { SmoothPath } from './Utils/SmoothPath'

interface Callbacks {
	OnDown(tileX: number, tileY: number): void // happens once
	OnMove(tileX: number, tileY: number): void
	OnUp(): void
}

export default class Interface {
	private App: App
	private WhichMouseButton: number = 0
	private MouseDown: boolean = false
	private MouseWorldX: number = -1
	private MouseWorldY: number = -1
	private CameraX: number = 0
	private CameraY: number = 0
	private Callbacks: Callbacks
	private RemoveListeners: () => void

	constructor(app: App, callbacks: Callbacks) {
		this.App = app
		this.Callbacks = callbacks
		const onMouseDown = this.OnMouseDown.bind(this)
		const onMouseMove = this.OnMouseMove.bind(this)
		const onMouseUp = this.OnMouseUp.bind(this)
		app.Canvas.addEventListener('mousedown', onMouseDown)
		app.Canvas.addEventListener('mousemove', onMouseMove)
		document.addEventListener('mouseup', onMouseUp)
		app.Canvas.addEventListener('blur', onMouseUp)
		this.RemoveListeners = () => {
			app.Canvas.removeEventListener('mousedown', onMouseDown)
			app.Canvas.removeEventListener('mousemove', onMouseMove)
			document.removeEventListener('mouseup', onMouseUp)
			app.Canvas.removeEventListener('blur', onMouseUp)
		}

	}

	SetCamera(cameraX: number, cameraY: number) { // must be called every App render
		// re-calculate mouse world position to use new camera position
		this.SetMouseWorld(this.MouseWorldX - this.CameraX + cameraX, this.MouseWorldY - this.CameraY + cameraY)
		this.CameraX = cameraX
		this.CameraY = cameraY
	}

	private OnMouseDown(e: MouseEvent) {
		if (e.button != 0) {
			return
		}
		this.MouseDown = true
		const fullScreenFactorX = this.App.Canvas.clientWidth / this.App.Canvas.width
		const fullScreenFactorY = this.App.Canvas.clientHeight / this.App.Canvas.height
		const mouseX = e.offsetX / fullScreenFactorX
		const mouseY = e.offsetY / fullScreenFactorY
		this.MouseWorldX = mouseX + this.CameraX
		this.MouseWorldY = mouseY + this.CameraY
		const tileX = Math.floor(this.MouseWorldX / this.App.TileSize)
		const tileY = Math.floor(this.MouseWorldY / this.App.TileSize)
		this.Callbacks.OnDown(tileX, tileY)
	}

	private OnMouseMove(e: MouseEvent) {
		if (!this.MouseDown) {
			return
		}
		const fullScreenFactorX = this.App.Canvas.clientWidth / this.App.Canvas.width
		const fullScreenFactorY = this.App.Canvas.clientHeight / this.App.Canvas.height
		const mouseX = e.offsetX / fullScreenFactorX
		const mouseY = e.offsetY / fullScreenFactorY
		this.SetMouseWorld(mouseX + this.CameraX, mouseY + this.CameraY)
	}

	private OnMouseUp() {
		this.MouseDown = false
		this.Callbacks.OnUp()
	}

	private SetMouseWorld(x: number, y: number) {
		if (!this.MouseDown) {
			return
		}
		const path = SmoothPath(this.MouseWorldX, this.MouseWorldY, x, y, this.App.TileSize)
		for (let i = 0; i < path.length; i += 2) {
			const tileX = Math.floor(path[i] / this.App.TileSize)
			const tileY = Math.floor(path[i + 1] / this.App.TileSize)
			this.Callbacks.OnMove(tileX, tileY)
		}
		this.MouseWorldX = x
		this.MouseWorldY = y
	}

	Destroy() {
		this.RemoveListeners()
	}
}