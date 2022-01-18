import { EClient, ClientPacketType } from './../Common/Encoder';
import Tex from '../Tex'
import State from '../State';
import App from '../Tilemap/App';
import TileHandler from '../Tilemap/TileHandler';
import TileDefault from './TileDefault';

const DISAPPEAR = 600
const REAPPEAR = 3500

export default class TileVanish extends TileDefault {

	private Map: Set<number> = new Set()
	private TimeOutIds: Set<number> = new Set()

	OnAdd(x: number, y: number, tileId: number) {
		this.SetMeta(x, y, 0)
	}

	OnDelete(x: number, y: number, tileId: number) {
		this.SetMeta(x, y, 0)
		this.App.SetOpacityAnimation(1, x, y, Infinity)
		for (const id of this.TimeOutIds) {
			window.clearTimeout(id)
		}
		this.Map = new Set()
		this.TimeOutIds = new Set()
	}

	OnTouch(x: number, y: number, tileId: number) {
		const pos = y * this.App.MapWidth + x
		if (!this.Map.has(pos)) {
			this.Map.add(pos)
			this.App.SetOpacityAnimation(1, x, y, DISAPPEAR)
			let disappearId: number
			disappearId = window.setTimeout(() => {
				this.TimeOutIds.delete(disappearId)
				this.SetMeta(x, y, 1)
				let reappearId: number
				reappearId = window.setTimeout(() => {
					this.TimeOutIds.delete(reappearId)
					this.App.SetOpacityAnimation(1, x, y, Infinity)
					this.SetMeta(x, y, 0)
					this.Map.delete(pos)
				}, REAPPEAR)
				this.TimeOutIds.add(reappearId)
			}, DISAPPEAR)
			this.TimeOutIds.add(disappearId)
		}
	}

	IsSolid(x: number, y: number, tileId: number) {
		return this.GetMeta(x, y) == 0
	}

}