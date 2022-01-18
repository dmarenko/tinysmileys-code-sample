import { solidTiles } from './../Common/Encoder';
import TileHandler from '../Tilemap/TileHandler'
import { Ids } from '../Ids'
import App from '../Tilemap/App'
import Tex from '../Tex'
import Sound from '../Sound'
import * as DOM from '../DOM'
import TileDefault from './TileDefault'
import TileCoin from './TileCoin'
import { GetCoinOfCoinGate, GetActiveStateOfCoinGate } from '../Common/Encoder'

export default class TileCoinGate extends TileDefault {

	constructor(app: App) {
		super(app)
	}

	OnDelete(x: number, y: number, tileId: number) {
		// this.Meta[y][x] = 0
		this.SetNumberOnTile(x, y, 0)
	}

	GetTexture(x: number, y: number, tileId: number) {
		const coinId = GetCoinOfCoinGate(tileId)
		const tileCoin = this.App.GetTileHandler(coinId) as TileCoin
		const collected = tileCoin.NumOfCollectedCoins.get(coinId) || 0
		const leftToCollect = Math.max(this.GetMeta(x, y) - collected, 0)
		this.SetNumberOnTile(x, y, leftToCollect)
		return Tex.Coords[leftToCollect > 0 ? tileId : GetActiveStateOfCoinGate(tileId)]
	}

	IsSolid(x: number, y: number, tileId: number) {
		const coinId = GetCoinOfCoinGate(tileId)
		const tileCoin = this.App.GetTileHandler(coinId) as TileCoin
		const collected = tileCoin.NumOfCollectedCoins.get(coinId) || 0
		const leftToCollect = Math.max(this.GetMeta(x, y) - collected, 0)
		const off = tileId
		const on = GetActiveStateOfCoinGate(tileId)
		return solidTiles.has(leftToCollect == 0 ? on : off)
	}

}