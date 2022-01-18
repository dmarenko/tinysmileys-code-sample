import TextureCoordinates from '../Tilemap/Types/TextureCoordinates'
import Atlas from '../Tilemap/Atlas'
import cropImage from '../Utils/CropImage'
import { Ids } from '../Ids'
import Tex from '../Tex'
import NumTex from '../NumTex'

export async function LoadNumAtlas() {
	return new Promise<Atlas>((resolve, reject) => {
		const img = new Image()
		img.onload = async () => {
			const atlas = new Atlas(img, NumTex.Coords, [])
			resolve(atlas)
		}
		img.onerror = () => {
			reject()
		}
		img.src = 'build/numatlas.png'
	})
}

export async function LoadAtlas() {
	return new Promise<Atlas>((resolve, reject) => {
		const img = new Image()
		const urls: string[] = []
		img.onload = async () => {
			for (const tile of Tex.OriginalCoords) {
				const url = await cropImage(img, tile.X1, tile.Y1, tile.X2, tile.Y2)
				urls.push(url)
			}
			const atlas = new Atlas(img, Tex.Coords, urls)
			resolve(atlas)
		}
		img.onerror = () => {
			reject()
		}
		img.src = 'build/atlas.png'
	})
}