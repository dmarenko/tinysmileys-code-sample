import { SmartBuffer } from 'smart-buffer';
import { solidTiles } from './../Common/Encoder';
import TileHandler from '../Tilemap/TileHandler'
import { Ids } from '../Ids'
import Tex from '../Tex';
import App from '../Tilemap/App';
import TileSprite from '../Tilemap/TileSprite';

export default class TileDefault extends TileHandler {
	
	Init(buffer: SmartBuffer) {
		const tileId = buffer.readUInt8()
		const x = buffer.readUInt16LE()
		const y = buffer.readUInt16LE()
	}

	OnAdd(x: number, y: number, tileId: number) {
		
	}
	
	OnDelete(x: number, y: number, tileId: number) {
		
	}
	
	GetTexture(x: number, y: number, tileId: number) {
		return Tex.Coords[tileId]
	}

	IsSolid(x: number, y: number, tileId: number) {
		return solidTiles.has(tileId)
	}

	OnTouch(x: number, y: number, tileId: number, toucher: TileSprite) {

	}

	OnHalfTouch(x: number, y: number, tileId: number, toucher: TileSprite) {

	}

	OnMetaChange(x: number, y: number, tileId: number) {
		
	}

}