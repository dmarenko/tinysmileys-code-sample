import App from './App'
import TextureCoordinates from './Types/TextureCoordinates'
import TileSprite from './TileSprite'

export type THandler = new (app: App) => TileHandler

export default abstract class TileHandler {

	protected App: App

	constructor(app: App) {
		this.App = app
	}

	protected SetMeta(x: number, y: number, meta: number) {
		this.App.SetMeta(x, y, meta)
	}

	protected GetMeta(x: number, y: number) {
		return this.App.GetMeta(x, y)
	}

	protected SetNumberOnTile(x: number, y: number, value: number) {
		this.App.NumRenderer.SetTile(x, y, value)
	}

	abstract OnAdd(x: number, y: number, tileId: number): void

	abstract OnDelete(x: number, y: number, tileId: number): void

	abstract GetTexture(x: number, y: number, tileId: number): TextureCoordinates

	abstract IsSolid(x: number, y: number, tileId: number): boolean

	abstract OnTouch(x: number, y: number, tileId: number, toucher: TileSprite): void

	abstract OnHalfTouch(x: number, y: number, tileId: number, toucher: TileSprite): void

	abstract OnMetaChange(x: number, y: number, tileId: number): void

}
