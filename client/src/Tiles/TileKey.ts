import { EClient, ClientPacketType } from './../Common/Encoder';
import Tex from '../Tex'
import State from '../State';
import App from '../Tilemap/App';
import TileHandler from '../Tilemap/TileHandler';
import TileDefault from './TileDefault';

const GATE_TIME = 3000

export default class TileKey extends TileDefault {
	private ActiveKeys: Map<number, number> = new Map()

	OnHalfTouch(x: number, y: number, tileId: number) {
		this.Activate(tileId, GATE_TIME)
		const buf = EClient[ClientPacketType.TOUCH_KEY].Encode(tileId, GATE_TIME)
		State.Ws.send(buf)
	}

	Activate(tileId: number, duration: number) {
		if (this.ActiveKeys.has(tileId)) { // re-hit key before timeout
			window.clearTimeout(this.ActiveKeys.get(tileId))
		}
		const timeoutId = window.setTimeout(() => {
			this.ActiveKeys.delete(tileId)
			this.App.SetAllChunksAsDirty(1)
		}, duration)
		this.ActiveKeys.set(tileId, timeoutId)
		this.App.SetAllChunksAsDirty(1)
	}

	IsKeyActive(tileId: number) {
		return this.ActiveKeys.has(tileId)
	}
}