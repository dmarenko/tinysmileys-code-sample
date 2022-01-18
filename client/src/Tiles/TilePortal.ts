import { EClient, ClientPacketType } from './../Common/Encoder';
import Tex from '../Tex'
import State from '../State';
import App from '../Tilemap/App';
import TileHandler from '../Tilemap/TileHandler';
import TileDefault from './TileDefault';

export default class TilePortal extends TileDefault {

	private Map: Map<number, { TileX: number, TileY: number }> = new Map()

	private MetaToPortal(meta: number) {
		const mask = 2 ** 16 - 1
		return {
			Src: (meta >> 16) & mask,
			Dst: meta & mask
		}
	}

	OnAdd(x: number, y: number, tileId: number) {
		const src = this.MetaToPortal(this.GetMeta(x, y)).Src
		this.Map.set(src, { TileX: x, TileY: y })
	}

	OnDelete(x: number, y: number, tileId: number) {
		const src = this.MetaToPortal(this.GetMeta(x, y)).Src
		this.Map.delete(src)
		this.SetMeta(x, y, 0)
	}

	OnHalfTouch(x: number, y: number, tileId: number) {
		const portal = this.MetaToPortal(this.GetMeta(x, y))
		const dst = portal.Dst
		const pos = this.Map.get(dst)
		const p = State.Player
		const pointsToSelf = portal.Src == portal.Dst
		if (pos && p && !pointsToSelf) { // found dst portal
			p.MoveToPortal(pos.TileX, pos.TileY)
		}
	}

}