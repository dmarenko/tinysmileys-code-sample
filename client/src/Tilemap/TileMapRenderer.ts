import App from './App'
import Sprite from './Sprite'
import LayerRenderer from './LayerRenderer'

export default class TileMapRenderer {
	
	private App: App
	private readonly Renderers: LayerRenderer[]

	constructor(app: App, mapWidth: number, mapHeight: number, layers: Uint16Array[]) {
		this.App = app
		this.Renderers = layers.map(array => new LayerRenderer(app, array, mapWidth, mapHeight))
	}

	SetMap(layers: Uint16Array[]) {
		if (layers.length != this.Renderers.length) {
			throw 'Illegal layer count'
		}
		for (let i = 0; i < layers.length; i++) {
			const renderer = this.Renderers[i]
			const layer = layers[i]
			renderer.SetMap(layer)
		}
	}

	AddSprite(layerId: number, sprite: Sprite) {
		this.Renderers[layerId].AddSprite(sprite)
	}

	RemoveSprite(layerId: number, sprite: Sprite) {
		this.Renderers[layerId].RemoveSprite(sprite)
	}

	SetTile(layerId: number, x: number, y: number, tileId: number) {
		return this.Renderers[layerId].SetTile(x, y, tileId)
	}

	GetTile(layerId: number, x: number, y: number) {
		return this.Renderers[layerId].GetTile(x, y)
	}

	SetOpacityAnimation(layerId: number, x: number, y: number, duration: number) {
		this.Renderers[layerId].SetOpacityAnimation(x, y, duration)
	}

	Tick() {
		for (const renderer of this.Renderers) {
			renderer.Tick()
		}
	}
	
	Render(layerId: number, cameraX: number, cameraY: number) {
		this.Renderers[layerId].Render(cameraX, cameraY)
	}

	SetChunkOfTileAsDirty(layerId: number, x: number, y: number) {
		this.Renderers[layerId].SetChunkOfTileAsDirty(x, y)
	}

	SetAllChunksAsDirty(layerId: number) {
		this.Renderers[layerId].SetAllChunksAsDirty()
	}

	GetMapReference() {
		return this.Renderers.map(renderer => renderer.GetMapReference())
	}

	Destroy() {
		for (const renderer of this.Renderers) {
			renderer.Destroy()
		}
	}

	get HighestLayerId() {
		return this.Renderers.length - 1
	}
}