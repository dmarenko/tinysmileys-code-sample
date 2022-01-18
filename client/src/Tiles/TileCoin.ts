import TileHandler from '../Tilemap/TileHandler'
import { Ids } from '../Ids'
import App from '../Tilemap/App'
import Tex from '../Tex'
import Sound from '../Sound'
import * as DOM from '../DOM'
import TileDefault from './TileDefault'
import { GetShadowOfCoin } from '../Common/Encoder'

export default class TileCoin extends TileDefault {

	public NumOfCoins: Map<number, number> = new Map()
	public NumOfCollectedCoins: Map<number, number> = new Map()
	private DOMCounters: Map<number, Element> = new Map()

	constructor(app: App) {
		super(app)
		function createCounter(tileId: number) {
			const container = document.createElement('div')
			container.className = 'counter'
			const icon = new Image()
			icon.src = app.Atlas.BlobUrls[tileId]
			container.appendChild(icon)
			const counter = document.createElement('span')
			container.appendChild(counter)
			DOM.Play.CoinCounter.appendChild(container)
			return counter
		}
		DOM.Play.CoinCounter.innerHTML = ''
		const ids = [Ids.Foreground.Coin.YellowCoin, Ids.Foreground.Coin.BlueCoin]
		for (const id of ids) {
			this.DOMCounters.set(id, createCounter(id))
			this.RenderCounter(id)
		}
	}

	GetTexture(x: number, y: number, tileId: number) {
		const collected = this.GetMeta(x, y) == 1
		return Tex.Coords[collected ? GetShadowOfCoin(tileId) : tileId]
	}

	OnAdd(x: number, y: number, tileId: number) {
		const sum = this.NumOfCoins.get(tileId) || 0
		this.NumOfCoins.set(tileId, sum + 1)
		this.SetMeta(x, y, 0)
		this.RenderCounter(tileId)
	}

	OnDelete(x: number, y: number, tileId: number) {
		const collected = this.GetMeta(x, y) == 1
		if (collected) { // deleted a collected coin, rmeove it from our sum
			const sum = this.NumOfCollectedCoins.get(tileId)! // >= 1
			this.NumOfCollectedCoins.set(tileId, sum - 1)
		}
		const sum = this.NumOfCoins.get(tileId)! // >= 1
		this.NumOfCoins.set(tileId, sum - 1)
		// this.Meta[y][x] = 0 // clean-up. not really necessary. because any new meta-data is set upon OnAdd
		this.RenderCounter(tileId)
	}

	OnHalfTouch(x: number, y: number, tileId: number) {
		const collected = this.GetMeta(x, y) == 1
		if (!collected) {
			const sum = this.NumOfCollectedCoins.get(tileId) || 0
			this.NumOfCollectedCoins.set(tileId, sum + 1)
			this.SetMeta(x, y, 1)
			Sound.Coin()
			this.App.SetAllChunksAsDirty(1)
			this.RenderCounter(tileId)
			// this.Broadcast()
		}
	}

	private RenderCounter(tileId: number) {
		const total = this.NumOfCoins.get(tileId) || 0
		const collected = this.NumOfCollectedCoins.get(tileId) || 0
		this.DOMCounters.get(tileId)!.textContent = `${collected}/${total}`
	}

}