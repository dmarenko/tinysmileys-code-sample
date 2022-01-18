import { solidTiles } from './../Common/Encoder';
import TileHandler from '../Tilemap/TileHandler'
import TextureCoordinates from '../Tilemap/Types/TextureCoordinates'
import TileKey from './TileKey'
import { GetKeyOfGate, GetActiveStateOfGate } from '../Common/Encoder'
import Tex from '../Tex'
import TileDefault from './TileDefault'

export default class TileGate extends TileDefault {

	GetTexture(x: number, y: number, tileId: number) {
		const keyId = GetKeyOfGate(tileId)
		const tileKey = this.App.GetTileHandler(keyId) as TileKey
		if (tileKey.IsKeyActive(keyId)) {
			return Tex.Coords[GetActiveStateOfGate(tileId)]
		}
		return Tex.Coords[tileId]
	}

	IsSolid(x: number, y: number, tileId: number) {
		const keyId = GetKeyOfGate(tileId)
		const tileKey = this.App.GetTileHandler(keyId) as TileKey
		const off = tileId
		const on = GetActiveStateOfGate(tileId)
		const isActive = tileKey.IsKeyActive(keyId)
		return solidTiles.has(isActive ? on : off)
	}
}