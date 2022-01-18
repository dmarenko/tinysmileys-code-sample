import { EClient, ClientPacketType } from './../Common/Encoder';
import Tex from '../Tex'
import State from '../State';
import App from '../Tilemap/App';
import TileHandler from '../Tilemap/TileHandler';
import TileDefault from './TileDefault';
import * as DOM from '../DOM'
import Avatar from '../Avatar';
import TileSprite from '../Tilemap/TileSprite';

export default class TileSign extends TileDefault {

	OnAdd(x: number, y: number, tileId: number) {
		
	}

	OnDelete(x: number, y: number, tileId: number) {
		const pos = y * this.App.MapWidth + x
		State.Signs.delete(pos)
	}

	OnTouch(x: number, y: number, tileId: number, toucher: TileSprite) {
		if (toucher != State.Player) {
			return
		}
		const pos = y * this.App.MapWidth + x
		const text = State.Signs.get(pos) || 'No text'
		DOM.Play.SignTextPanel.style.display = ''
		DOM.Play.SignTextPanel.textContent = text
		
		// console.log('show text:', text)
	}

}