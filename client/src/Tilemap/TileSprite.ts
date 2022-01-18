import App from './App'
import Sprite from './Sprite'
import { Ids } from '../Ids'
import Tex from '../Tex'

export default class TileSprite extends Sprite {

	constructor(app: App, tileId: number) {
		super(app, app.Texture, Tex.Coords[tileId])

		this.SetTile(tileId)
	}

	CheckHalfTouch(tileX: number, tileY: number, tileId: number) {
		this.App.GetTileHandler(tileId).OnHalfTouch(tileX, tileY, tileId, this)
	}

	IsSolid(tileX: number, tileY: number) {
		const tileId = this.App.GetTile(1, tileX, tileY)
		return this.App.GetTileHandler(tileId).IsSolid(tileX, tileY, tileId)
	}

	IsColliding() {
		const app = this.App
		const startX = Math.floor(this.X / app.TileSize)
		const endX = Math.floor(Math.ceil(this.X + this.Width - 1) / app.TileSize)
		const startY = Math.floor(this.Y / app.TileSize)
		const endY = Math.floor(Math.ceil(this.Y + this.Height - 1) / app.TileSize)
		let solid = false
		for (let y = startY; y <= endY; y++) {
			for (let x = startX; x <= endX; x++) {
				const tileId = app.GetTile(1, x, y)
				const isSolid = app.GetTileHandler(tileId).IsSolid(x, y, tileId)
				if (isSolid) {
					solid = true
				}
				this.App.GetTileHandler(tileId).OnTouch(x, y, tileId, this)
			}
		}
		return solid
	}

	SetTile(tileId: number) {
		const texCoords = this.App.Atlas.TexCoords[tileId]

		this.SetTextureCoordinates(texCoords)
	}

}