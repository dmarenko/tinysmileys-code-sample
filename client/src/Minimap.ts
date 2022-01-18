import { minimapColorsKV } from './Common/Encoder'
import * as Config from './Config'
import Avatar from './Avatar'
import { Ids } from './Ids'
import App from './Tilemap/App'

/*
1. Invoke minimap avatar trail render less -- add system outside to only invoke at 30 fps for example.
2. Avatar movement interpolation should probably be handled outside of this class.
3. Antialias the trail?
*/

const hexToColor8 = (hex: number) => ({
	R: (hex >> 16) & 0xFF,
	G: (hex >> 8) & 0xFF,
	B: hex & 0xFF
})

const hexToColor32 = (hex: number) => ((0xFF << 24) + ((hex & 0xFF) << 16) + (hex & 0xFF00) + ((hex & 0xFF0000) >> 16)) >>> 0

const colors8 = new Map(minimapColorsKV.map(([tileId, color]) => [tileId, hexToColor8(color)]))

const colors32 = new Map(minimapColorsKV.map(([tileId, color]) => [tileId, hexToColor32(color)]))

const BACKGROUND_COLOR = 0x000000
const BACKGROUND_COLOR_8 = hexToColor8(BACKGROUND_COLOR)
const BACKGROUND_COLOR_32 = hexToColor32(BACKGROUND_COLOR)

export default class Minimap {
	private App: App
	private Canvas: HTMLCanvasElement
	private CTX: CanvasRenderingContext2D
	private Layers: Uint16Array[]
	private AvatarHistory: Map<number, {X: number, Y: number, R: number, G: number, B: number, Opacity: number}>
	private Pixel: ImageData // helper to draw single pixels on canvas
	
	constructor(app: App, canvas: HTMLCanvasElement) {
		this.App = app
		this.Canvas = canvas
		this.CTX = canvas.getContext('2d', { alpha: false })!
		this.Layers = app.GetMapReference()
		this.AvatarHistory = new Map()
		this.Pixel = this.CTX.createImageData(1, 1)
		this.Pixel.data[3] = 255 // always opaque

		this.Canvas.width = app.MapWidth
		this.Canvas.height = app.MapHeight

		this.CTX.fillStyle = `rgb(${BACKGROUND_COLOR_8.R}, ${BACKGROUND_COLOR_8.G}, ${BACKGROUND_COLOR_8.B})`
		this.CTX.fillRect(0, 0, app.MapWidth, app.MapHeight)
		
		const imageData = this.CTX.createImageData(this.Canvas.width, this.Canvas.height)
		const buffer = new Uint32Array(imageData.data.buffer) // I'm guessing 32-bit would be more performant
		for (let i = 0; i < this.Layers.length; i++) { // initial one-time draw
			const map = this.Layers[i]
			for (let i = 0; i < map.length; i++) {
				const color = colors32.get(map[i])
				if (color) {
					buffer[i] = color
				}
			}
			this.CTX.putImageData(imageData, 0, 0)
		}

		app.On('tilechange', (layerId, x, y, tileId) => {
			this.ProcessPixel(x, y)
		})
	}
	
	// this function re-renders a pixel at specified position using map and avatar trail data.
	// this function needs to be invoked manually, after a change to either the map or an avatar's position.
	private ProcessPixel(x: number, y: number) {
		const pixelIndex = y * this.App.MapWidth + x
		let rgb = BACKGROUND_COLOR_8
		for (let i = this.Layers.length - 1; i >= 0; i--) { // iterate layers from most foreground to most background
			const tileId = this.Layers[i][pixelIndex]
			const c = colors8.get(tileId)
			if (c != undefined) { // renderable tile id (not transparent)
				rgb = c // needed later, for trail computation
				this.CTX.fillStyle = `rgb(${rgb.R}, ${rgb.G}, ${rgb.B})`
				break // do not process layers with lower index (we already found a visible tile color)
			} else if (i == 0) { // we reached most background layer, so just render a default color.
				this.CTX.fillStyle = `rgb(${rgb.R}, ${rgb.G}, ${rgb.B})`
			}
		}
		const trail = this.AvatarHistory.get(pixelIndex)
		if (trail) { // blend trail color with tile color
			const r = (trail.R * trail.Opacity) + (rgb.R * (1 - trail.Opacity))
			const g = (trail.G * trail.Opacity) + (rgb.G * (1 - trail.Opacity))
			const b = (trail.B * trail.Opacity) + (rgb.B * (1 - trail.Opacity))
			this.CTX.fillStyle = `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`
		}
		this.CTX.fillRect(x, y, 1, 1)
	}

	public RenderAvatarTrails(avatars: Avatar[]) {
		if (this.Open) { // performance optimization: don't process new avatar trails when minimap is closed
			for (const [ position, trail ] of this.AvatarHistory) {
				trail.Opacity *= Config.MinimapFade
				if (trail.Opacity < 0.01) {
					this.AvatarHistory.delete(position)
				}
				this.ProcessPixel(trail.X, trail.Y)
			}
			for (const avatar of avatars) {
				const x = Math.floor((avatar.X + avatar.Width / 2) / this.App.TileSize)
				const y = Math.floor((avatar.Y + avatar.Height / 2) / this.App.TileSize)
				const pixelIndex = y * this.Canvas.width + x
				this.AvatarHistory.set(pixelIndex, {
					X: x, Y: y, // for convenience/efficency when iterating old trails, so I don't have to convert position (key) to x and y
					R: avatar.TrailColor.R,
					G: avatar.TrailColor.G,
					B: avatar.TrailColor.B,
					Opacity: 1 // initial trail alpha
				})
				this.ProcessPixel(x, y)
			}
		}
	}

	public Toggle() {
		/*
		handle adding/removing an .active class to the minimap button (to allow css styling for when minimap is open)?
		should that be handled in this class? or outside?
		*/
		if (this.Open) {
			this.Canvas.classList.remove('visible')
			// performance optimization: fade-out and remove old avatar trails when minimap is closed
			for (const [ position, trail ] of this.AvatarHistory) {
				this.AvatarHistory.delete(position)
				this.ProcessPixel(trail.X, trail.Y)
			}
		} else {
			this.Canvas.classList.add('visible')
		}
	}

	private get Open() {
		return this.Canvas.classList.contains('visible')
	}
}