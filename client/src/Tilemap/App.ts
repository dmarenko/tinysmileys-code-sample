import { CompileShader, CreateProgram } from './Utils/WebGL'
import { getVertexShader } from './Shaders/VertexShader'
import { getFragShader } from './Shaders/FragmentShader'
import Sprite from './Sprite'
import EventEmitter from './EventEmitter'
import Atlas from './Atlas'
import Interactive from './Interactive'
import TileMapRenderer from './TileMapRenderer'
import { GL } from './Types/Constants'
import Input from './Input'
import Camera from './Camera'
import TextureCoordinates from './Types/TextureCoordinates'
import { Ids } from '../Ids'
import TileHandler, { THandler } from './TileHandler'
import LayerRenderer from './LayerRenderer'

export default interface App {
	On(eventName: 'tilechange', callback: (layerId: number, x: number, y: number, tileId: number) => void): void;
	Emit(eventName: 'tilechange', layerId: number, x: number, y: number, tileId: number): void;
	
	On(eventName: 'tiledown', callback: (x: number, y: number) => void): void;
	Emit(eventName: 'tiledown', x: number, y: number): void;

	On(eventName: 'tilemove', callback: (x: number, y: number) => void): void;
	Emit(eventName: 'tilemove', x: number, y: number): void;

	On(eventName: 'tileup', callback: () => void): void;
	Emit(eventName: 'tileup'): void;

	On(eventName: 'tilepress', callback: (x: number, y: number) => void): void;
	Emit(eventName: 'tilepress', x: number, y: number): void;

	On(eventName: 'mapchange', callback: (layers: Uint16Array[]) => void): void;
	Emit(eventName: 'mapchange', layers: Uint16Array[]): void;

	On(eventName: 'enterframe', callback: (elapsed: number) => void): void;
	Emit(eventName: 'enterframe', elapsed: number): void;

	On(eventName: 'exitframe', callback: (elapsed: number) => void): void;
	Emit(eventName: 'exitframe', elapsed: number): void;
}

export default class App extends EventEmitter {

	public readonly Canvas: HTMLCanvasElement
	public readonly GL: WebGLRenderingContext
	private ResolutionUniformLocation: WebGLUniformLocation
	private TranslationUniformLocation: WebGLUniformLocation
	private TimeUniformLocation: WebGLUniformLocation
	public readonly PositionAttributeLocation: number
	public readonly TexCoordAttributeLocation: number
	public readonly AnimationAttributeLocation: number
	public readonly TexSizeAttributeLocation: number
	public readonly OpacityAnimationAttributeLocation: number
	public readonly Program: WebGLProgram
	public readonly Texture: WebGLTexture
	public readonly NumTexture: WebGLTexture

	public readonly MapWidth: number
	public readonly MapHeight: number
	public readonly Atlas: Atlas
	public readonly NumAtlas: Atlas
	public readonly NumLayerZIndex: number
	public readonly Tilemap: TileMapRenderer
	public readonly NumRenderer: LayerRenderer
	private Interactive: Interactive
	public readonly Input: Input
	private readonly Camera: Camera

	public readonly MsPerTick: number

	private RequestAnimationFrameId: number = -1

	private PrevTime: number

	public Meta: Uint32Array
	private TileHandlers: Map<number, TileHandler> = new Map()
	private DefaultTileHandler: TileHandler

	constructor(width: number, height: number, msPerTick: number, atlas: Atlas, numAtlas: Atlas, numLayerZIndex: number, defaultTileHandler: THandler, tileHandlers: Map<number, THandler>, mapWidth: number, mapHeight: number, layers: Uint16Array[], meta: Uint32Array) {
		super()
		this.Canvas = document.createElement('canvas')
		this.Canvas.width = width
		this.Canvas.height = height
		this.Canvas.tabIndex = 0
		this.MapWidth = mapWidth
		this.MapHeight = mapHeight
		
		const options = { antialias: false, alpha: false }
		this.GL = (this.Canvas.getContext('webgl2', options) || this.Canvas.getContext('webgl', options) || this.Canvas.getContext('experimental-webgl', options)) as WebGLRenderingContext

		// https://webglfundamentals.org/webgl/lessons/webgl-and-alpha.html

		this.GL.frontFace(GL.CCW)
		this.GL.cullFace(GL.BACK)
		this.GL.blendFunc(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA)
		this.GL.enable(GL.BLEND)

		const vertexShader = CompileShader(this.GL, getVertexShader(atlas.Img.width, atlas.Img.height), GL.VERTEX_SHADER)
		const fragmentShader = CompileShader(this.GL, getFragShader(), GL.FRAGMENT_SHADER)
		this.Program = CreateProgram(this.GL, vertexShader, fragmentShader)

		this.PositionAttributeLocation = this.GL.getAttribLocation(this.Program, 'a_position')
		this.GL.enableVertexAttribArray(this.PositionAttributeLocation)
		this.TexCoordAttributeLocation = this.GL.getAttribLocation(this.Program, 'a_texCoord')
		this.GL.enableVertexAttribArray(this.TexCoordAttributeLocation)
		this.AnimationAttributeLocation = this.GL.getAttribLocation(this.Program, 'a_animation')
		this.GL.enableVertexAttribArray(this.AnimationAttributeLocation)
		this.TexSizeAttributeLocation = this.GL.getAttribLocation(this.Program, 'a_texSize')
		this.GL.enableVertexAttribArray(this.TexSizeAttributeLocation)
		this.OpacityAnimationAttributeLocation = this.GL.getAttribLocation(this.Program, 'a_opacityAnimation')
		this.GL.enableVertexAttribArray(this.OpacityAnimationAttributeLocation)

		this.ResolutionUniformLocation = this.GL.getUniformLocation(this.Program, 'u_resolution')!
		this.TranslationUniformLocation = this.GL.getUniformLocation(this.Program, 'u_translation')!
		this.TimeUniformLocation = this.GL.getUniformLocation(this.Program, 'u_time')!

		this.GL.useProgram(this.Program)

		this.GL.uniform2f(this.ResolutionUniformLocation, this.Canvas.width, this.Canvas.height)

		this.Texture = this.GL.createTexture()!
		this.GL.bindTexture(GL.TEXTURE_2D, this.Texture)
		this.GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, atlas.Img)
		this.GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE) // pixelated
		this.GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE)
		this.GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR)
		this.GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR)

		this.NumTexture = this.GL.createTexture()!
		this.GL.bindTexture(GL.TEXTURE_2D, this.NumTexture)
		this.GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, numAtlas.Img)
		this.GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE) // pixelated
		this.GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE)
		this.GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR)
		this.GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR)

		this.Atlas = atlas
		this.NumAtlas = numAtlas
		this.NumLayerZIndex = numLayerZIndex

		this.Meta = meta

		this.DefaultTileHandler = new defaultTileHandler(this)
		{
			const classes: THandler[] = []
			const instances: TileHandler[] = []
			for (const [tileId, tileClass] of tileHandlers.entries()) {
				/* do not re-instantiate same tile class (so instance will be shared).
				this way, we don't re-run the constructor logic, and the classes behave as singletons. */
				const idx = classes.indexOf(tileClass)
				if (idx == -1) {
					const handler = new tileClass(this)
					this.TileHandlers.set(tileId, handler)
					classes.push(tileClass), instances.push(handler)
				} else { // class already instantiated
					this.TileHandlers.set(tileId, instances[idx])
				}
			}
		}
		
		this.Tilemap = new TileMapRenderer(this, mapWidth, mapHeight, layers)

		this.NumRenderer = new LayerRenderer(this, new Uint16Array(mapWidth * mapHeight), mapWidth, mapHeight, true)

		this.ProcessOnAdd(layers)

		const app = this
		this.Interactive = new Interactive(this, {
			OnDown(x, y) {
				app.Emit('tiledown', x, y)
				app.Emit('tilepress', x, y)
			},
			OnMove(x, y) {
				app.Emit('tilemove', x, y)
				app.Emit('tilepress', x, y)
			},
			OnUp() {
				app.Emit('tileup')
			}
		})

		this.Camera = new Camera(this, 1 / 12)

		this.Input = new Input(this.Canvas)

		this.MsPerTick = msPerTick

		this.PrevTime = performance.now()
		
		this.Render()
	}

	GetTileHandler(tileId: number) {
		return this.TileHandlers.get(tileId) || this.DefaultTileHandler
	}

	public Destroy() { // https://stackoverflow.com/a/23606581/6069017
		// unbind all bind points
		const numOfTextureUnits = this.GL.getParameter(this.GL.MAX_TEXTURE_IMAGE_UNITS)
		for (let unit = 0; unit < numOfTextureUnits; unit++) {
			this.GL.activeTexture(this.GL.TEXTURE0 + unit)
			this.GL.bindTexture(this.GL.TEXTURE_2D, null)
			this.GL.bindTexture(this.GL.TEXTURE_CUBE_MAP, null)
		}
		this.GL.bindBuffer(this.GL.ARRAY_BUFFER, null)
		this.GL.bindBuffer(this.GL.ELEMENT_ARRAY_BUFFER, null)
		this.GL.bindRenderbuffer(this.GL.RENDERBUFFER, null)
		this.GL.bindFramebuffer(this.GL.FRAMEBUFFER, null)
		// delete textures and buffers
		this.GL.deleteTexture(this.Texture) // delete main atlas texture
		this.Tilemap.Destroy() // delete chunk buffers, sprite buffers, sprite textures
		// unbind buffers from attributes
		const buf = this.GL.createBuffer()
		this.GL.bindBuffer(this.GL.ARRAY_BUFFER, buf)
		const attributes: number = this.GL.getParameter(this.GL.MAX_VERTEX_ATTRIBS)
		for (let attrib = 0; attrib < attributes; attrib++) {
			this.GL.vertexAttribPointer(attrib, 1, this.GL.FLOAT, false, 0, 0)
		}
		// release some more memory
		this.GL.canvas.width = 1
		this.GL.canvas.height = 1
		// remove from DOM
		this.Canvas.remove()
		// remove keyboard listeners
		this.Input.Destroy()
		// remove mouse listeners
		this.Interactive.Destroy()
		// stop game logic loop
		cancelAnimationFrame(this.RequestAnimationFrameId)
	}

	public SetCameraTarget(target: Sprite) {
		this.Camera.SetTarget(target)
	}

	public ClearCameraLag() {
		this.Camera.ClearLag()
	}

	get Time() {
		return Math.round(performance.now())
	}

	private Render() {
		const perf = performance.now()
		const elapsed = (Math.round(perf - this.PrevTime))

		this.Emit('enterframe', elapsed)

		for (let i = 0; i < elapsed; i += this.MsPerTick) {
			this.Tilemap.Tick() // run sprite logic
			this.Camera.Tick()
		}

		const x = Math.round(this.Camera.X)
		const y = Math.round(this.Camera.Y)
		this.GL.uniform2f(this.TranslationUniformLocation, -x, -y)
		this.GL.uniform1f(this.TimeUniformLocation, this.Time)
		// render main tilemap
		let i = 0
		this.GL.bindTexture(GL.TEXTURE_2D, this.Texture)
		for (; i < this.NumLayerZIndex; i++) {
			this.Tilemap.Render(i, x, y)
		}
		// render numbers layer
		this.GL.bindTexture(GL.TEXTURE_2D, this.Texture)
		for (; i <= this.Tilemap.HighestLayerId; i++) {
			this.Tilemap.Render(i, x, y)
		}

		this.Interactive.SetCamera(x, y)

		this.Emit('exitframe', elapsed)

		this.Input.ExitFrame()
		
		this.PrevTime = perf

		this.RequestAnimationFrameId = requestAnimationFrame(this.Render.bind(this))
	}

	SetChunkOfTileAsDirty(layerId: number, x: number, y: number) {
		this.Tilemap.SetChunkOfTileAsDirty(layerId, x, y)
	}

	SetAllChunksAsDirty(layerId: number) {
		this.Tilemap.SetAllChunksAsDirty(layerId)
	}

	ResizeCanvas(width: number, height: number) {
		this.GL.viewport(0, 0, width, height)
		this.Canvas.width = width
		this.Canvas.height = height
		this.GL.uniform2f(this.ResolutionUniformLocation, width, height)
	}

	SetMap(layers: Uint16Array[], meta: Uint32Array) {
		// must be before setmap, so deleted tiles get correct tileId
		this.ProcessOnDelete()
		this.Tilemap.SetMap(layers)
		this.ProcessOnAdd(layers)
		this.Meta = meta
		this.NumRenderer.SetMap(new Uint16Array(this.MapWidth * this.MapHeight))
		this.Emit('mapchange', layers)
	}

	ProcessOnAdd(layers: Uint16Array[]) {
		const l = layers[1]
		for (let y = 0; y < this.MapHeight; y++) {
			for (let x = 0; x < this.MapWidth; x++) {
				const tileId = l[y * this.MapWidth + x]
				this.GetTileHandler(tileId).OnAdd(x, y, tileId)
			}
		}
	}

	ProcessOnDelete() {
		const l = this.GetMapReference()[1]
		for (let y = 0; y < this.MapHeight; y++) {
			for (let x = 0; x < this.MapWidth; x++) {
				const tileId = l[y * this.MapWidth + x]
				this.GetTileHandler(tileId).OnDelete(x, y, tileId)
			}
		}
	}

	AddSprite(layerId: number, sprite: Sprite) {
		this.Tilemap.AddSprite(layerId, sprite)
	}

	RemoveSprite(layerId: number, sprite: Sprite, destroy: { destroy: boolean, keepTexture?: boolean }) {
		this.Tilemap.RemoveSprite(layerId, sprite)
		if (destroy.destroy) {
			sprite.Destroy(!destroy.keepTexture)
		}
	}

	SetTile(layerId: number, x: number, y: number, tileId: number, meta: number) {
		const oldTile = this.Tilemap.GetTile(layerId, x, y)
		if (this.Tilemap.SetTile(layerId, x, y, tileId)) {
			this.GetTileHandler(oldTile).OnDelete(x, y, oldTile)
			this.SetMeta(x, y, meta)
			this.GetTileHandler(tileId).OnAdd(x, y, tileId)
			this.Emit('tilechange', layerId, x, y, tileId)
			return true
		}
		return false
	}

	SetMeta(x: number, y: number, meta: number) {
		this.Meta[y * this.MapWidth + x] = meta
	}

	GetMeta(x: number, y: number) {
		return this.Meta[y * this.MapWidth + x]
	}

	GetTile(layerId: number, x: number, y: number) {
		return this.Tilemap.GetTile(layerId, x, y)
	}

	SetOpacityAnimation(layerId: number, x: number, y: number, duration: number) {
		this.Tilemap.SetOpacityAnimation(layerId, x, y, duration)
	}

	GetMapReference() {
		return this.Tilemap.GetMapReference()
	}

	IsOutOfBounds(x: number, y: number) {
		return x < 0 || x >= this.MapWidth || y < 0 || y >= this.MapHeight
	}

	get TileSize() {
		return 32;
		// return this.Atlas.TileSize
	}

	get HighestLayerId() {
		return this.Tilemap.HighestLayerId
	}
}