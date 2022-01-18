import { SmartBuffer } from 'smart-buffer'
import { Ids } from '../Ids'

export enum ClientPacketType {
	SET_TILE,
	ADD_SIGN_TEXT,
	MOVE,
	CHANGE_SMILEY,
	CHAT,
	TOUCH_KEY,
}

export enum ServerPacketType {
	JOIN_WORLD,
	SET_MAP,
	SET_TILE,
	ALL_SIGN_TEXTS,
	ADD_SIGN_TEXT,
	TOO_MUCH_TEXT,
	ADD_AVATAR,
	DELETE_AVATAR,
	MOVE,
	GRANT_EDIT,
	REVOKE_EDIT,
	CHANGE_SMILEY,
	CHAT,
	SYSTEM_CHAT,
	WORLD_TITLE,
	TOUCH_KEY,
}

namespace Server {
	export interface AvatarBase {
		x: number
		y: number
		dirX: number
		dirY: number
		holdingJump: boolean
		velocityX: number
		velocityY: number
		accelerationX: number
		accelerationY: number
	}
	
	export interface Avatar extends AvatarBase {
		localId: number
		username: string
		editor: boolean
	}
}

namespace Client {
	export interface AvatarBase {
		X: number
		Y: number
		DirX: number
		DirY: number
		HoldingJump: boolean
		VelocityX: number
		VelocityY: number
		AccelerationX: number
		AccelerationY: number
	}
	
	export interface Avatar extends AvatarBase {
		LocalId: number
		Username: string
		Editor: boolean
	}
}

const packDirection = (dirX: number, dirY: number, holdingJump: boolean) => {
	/*
		byte: AA BB C- --

		dirX = -1, 0, 1				2 bit
		dirY = -1, 0, 1				2 bit
		holdingJump = boolean		1 bit

		total: 5 used bits, 3 unused bits (marked as -)
	*/
	return ((dirX + 1) << 6) | ((dirY + 1) << 4) | ((holdingJump ? 1 : 0) << 3) | 0x00
}

const unpackDirection = (byte: number) => {
	byte >>>= 0 // ensure byte is unsigned (in case the byte was read from buffer as int8 instead of uint8 for whatever reason)
	return {
		dirX: ((byte >> 6) & 0b11) - 1,
		dirY: ((byte >> 4) & 0b11) - 1,
		holdingJump: ((byte >> 3) & 0b1) == 1 ? true : false
	}
}

const chunks = (buffer: any, chunkSize: number) => {
	const result: any[] = []
	let i = 0
	while (i < buffer.length) {
		const buf = new Uint8Array(chunkSize)
		for (let j = 0; j < chunkSize; j++) {
			buf[j] = buffer[j + i]
		}
		result.push(buf)
		i += chunkSize
	}
	return result
}

type Buffer = any

export interface World {
	width: number
	height: number
	layers: Uint16Array[]
	meta: Uint32Array
	signs: Map<number, string>
}

export const worldToBuffer = (zlib: any, world: World) => {
	return new Promise<Buffer>((resolve, reject) => {
		const buffer = new SmartBuffer()
		buffer.writeUInt16LE(world.width)
		buffer.writeUInt16LE(world.height)
		buffer.writeUInt8(world.layers.length)
		// align memory to multiple of 4 (limitation of typed array start offset)
		// uint16 needs start offset (and of course length) of multiple of 2
		// uint32 needs start offset (and of course length) of multiple of 4
		// NOTE: I am assuming ArrayBuffer of smartbuffer will not have any other
		// memory besides mine... but it's probably fine
		buffer.writeUInt8(0)
		buffer.writeUInt8(0)
		buffer.writeUInt8(0)
		for (const layer of world.layers) {
			buffer.writeBuffer(Buffer.from(layer.buffer, layer.byteOffset, layer.length * Uint16Array.BYTES_PER_ELEMENT))
		}
		buffer.writeBuffer(Buffer.from(world.meta.buffer, world.meta.byteOffset, world.meta.length * Uint32Array.BYTES_PER_ELEMENT))
		buffer.writeUInt32LE(world.signs.size)
		for (const [pos, text] of world.signs.entries()) {
			buffer.writeUInt32LE(pos)
			buffer.writeStringNT(text)
		}
		const mapData = buffer.toBuffer()
		zlib.deflate(mapData, (err: any, buf: any) => {
			if (err) {
				reject()
				return
			}
			resolve(buf)
		})
	})
}

export const bufferToWorld = (zlib: any, buffer: Buffer) => {
	return new Promise<World>((resolve, reject) => {
		zlib.inflate(buffer, (err: any, buf: any) => {
			if (err) {
				reject()
				return
			}
			const buffer = SmartBuffer.fromBuffer(buf)
			const width = buffer.readUInt16LE()
			const height = buffer.readUInt16LE()
			const numOfLayers = buffer.readUInt8()
			buffer.readUInt8()
			buffer.readUInt8()
			buffer.readUInt8()
			const layers: Uint16Array[] = []
			for (let i = 0; i < numOfLayers; i++) {
				const uint8array = buffer.readBuffer(width * height * Uint16Array.BYTES_PER_ELEMENT)
				layers.push(
					new Uint16Array(uint8array.buffer, uint8array.byteOffset, width * height)
				)
			}
			const metaBuf = buffer.readBuffer(width * height * Uint32Array.BYTES_PER_ELEMENT)
			const meta = new Uint32Array(metaBuf.buffer, metaBuf.byteOffset, width * height)
			const numOfSigns = buffer.readUInt32LE()
			const signs = new Map()
			for (let i = 0; i < numOfSigns; i++) {
				const pos = buffer.readUInt32LE()
				const text = buffer.readStringNT()
				signs.set(pos, text)
			}
			resolve({
				width,
				height,
				layers,
				meta,
				signs
			})
		})
	})
}

export const EClient = {
	[ClientPacketType.SET_TILE]: {
		Encode(layerId: number, x: number, y: number, tileId: number, meta: number = 0) {
			const buffer = new SmartBuffer()
			buffer.writeUInt8(ClientPacketType.SET_TILE)
			buffer.writeUInt8(layerId)
			buffer.writeUInt16LE(x)
			buffer.writeUInt16LE(y)
			buffer.writeUInt8(tileId)
			buffer.writeUInt32LE(meta)
			return buffer.toBuffer()
		},
		Decode(buffer: any) {
			const b = SmartBuffer.fromBuffer(buffer)
			return {
				layerId: b.readUInt8(),
				x: b.readUInt16LE(),
				y: b.readUInt16LE(),
				tileId: b.readUInt8(),
				meta: b.readUInt32LE()
			}
		}
	},
	[ClientPacketType.ADD_SIGN_TEXT]: {
		Encode(x: number, y: number, text: string) {
			const buffer = new SmartBuffer()
			buffer.writeUInt8(ClientPacketType.ADD_SIGN_TEXT)
			buffer.writeUInt16LE(x)
			buffer.writeUInt16LE(y)
			buffer.writeStringNT(text)
			return buffer.toBuffer()
		},
		Decode(buffer: any) {
			const b = SmartBuffer.fromBuffer(buffer)
			return {
				x: b.readUInt16LE(),
				y: b.readUInt16LE(),
				text: b.readStringNT()
			}
		}
	},
	[ClientPacketType.MOVE]: {
		Encode(avatar: Client.AvatarBase) {
			const buffer = new SmartBuffer()
			buffer.writeUInt8(ClientPacketType.MOVE)
			buffer.writeFloatLE(avatar.X)
			buffer.writeFloatLE(avatar.Y)
			buffer.writeUInt8(packDirection(avatar.DirX, avatar.DirY, avatar.HoldingJump))
			buffer.writeFloatLE(avatar.VelocityX)
			buffer.writeFloatLE(avatar.VelocityY)
			buffer.writeFloatLE(avatar.AccelerationX)
			buffer.writeFloatLE(avatar.AccelerationY)
			return buffer.toBuffer()
		},
		Decode(buffer: any): Server.AvatarBase {
			const b = SmartBuffer.fromBuffer(buffer)
			const x = b.readFloatLE()
			const y = b.readFloatLE()
			const packedDirection = unpackDirection(b.readUInt8())
			const dirX = packedDirection.dirX
			const dirY = packedDirection.dirY
			const holdingJump = packedDirection.holdingJump
			const velocityX = b.readFloatLE()
			const velocityY = b.readFloatLE()
			const accelerationX = b.readFloatLE()
			const accelerationY = b.readFloatLE()
			return {
				x,
				y,
				dirX,
				dirY,
				holdingJump,
				velocityX,
				velocityY,
				accelerationX,
				accelerationY
			}
		}
	},
	[ClientPacketType.CHANGE_SMILEY]: {
		Encode(smileyId: number) { // smileyId should be on AvatarBase ..
			const buffer = new SmartBuffer()
			buffer.writeUInt8(ClientPacketType.CHANGE_SMILEY)
			buffer.writeUInt8(smileyId)
			return buffer.toBuffer()
		},
		Decode(buffer: any) {
			const b = SmartBuffer.fromBuffer(buffer)
			return {
				id: b.readUInt8()
			}
		}
	},
	[ClientPacketType.CHAT]: {
		Encode(msg: string) {
			const buffer = new SmartBuffer()
			buffer.writeUInt8(ClientPacketType.CHAT)
			buffer.writeStringNT(msg)
			return buffer.toBuffer()
		},
		Decode(buffer: any) {
			const b = SmartBuffer.fromBuffer(buffer)
			return {
				msg: b.readStringNT()
			}
		}
	},
	[ClientPacketType.TOUCH_KEY]: {
		Encode(tileId: number, duration: number) {
			const buffer = new SmartBuffer()
			buffer.writeUInt8(ClientPacketType.TOUCH_KEY)
			buffer.writeUInt8(tileId)
			buffer.writeDoubleLE(duration)
			return buffer.toBuffer()
		},
		Decode(buffer: any) {
			const b = SmartBuffer.fromBuffer(buffer)
			return {
				tileId: b.readUInt8(),
				duration: b.readDoubleLE()
			}
		}
	}
}

export const EServer = {
	[ServerPacketType.JOIN_WORLD]: {
		Encode(serverTime: number, ownId: number, title: string, creator: string, editor: boolean) {
			const buffer = new SmartBuffer()
			buffer.writeUInt8(ServerPacketType.JOIN_WORLD)
			buffer.writeDoubleLE(serverTime)
			buffer.writeUInt8(ownId)
			buffer.writeStringNT(title)
			buffer.writeStringNT(creator)
			buffer.writeUInt8(Number(editor))
			return buffer.toBuffer()
		},
		Decode(buffer: SmartBuffer) {
			return {
				ServerTime: buffer.readDoubleLE(),
				OwnId: buffer.readUInt8(),
				Title: buffer.readStringNT(),
				Creator: buffer.readStringNT(),
				Editor: Boolean(buffer.readUInt8())
			}
		}
	},
	[ServerPacketType.SET_MAP]: {
		Encode(inflatedMap: Buffer) {
			const buffer = new SmartBuffer()
			buffer.writeUInt8(ServerPacketType.SET_MAP)
			buffer.writeBuffer(inflatedMap)
			return buffer.toBuffer()
		},
		Decode(buffer: SmartBuffer) {
			const inflatedMap = buffer.toBuffer().slice(1)
			return inflatedMap
		}
	},
	[ServerPacketType.ADD_AVATAR]: {
		Encode(buffer: SmartBuffer, avatar: Server.Avatar) {
			buffer.writeUInt8(ServerPacketType.ADD_AVATAR)
			buffer.writeUInt8(avatar.localId)
			buffer.writeStringNT(avatar.username)
			buffer.writeUInt8(Number(avatar.editor))
		},
		Decode(buffer: SmartBuffer) {
			return {
				LocalId: buffer.readUInt8(),
				Username: buffer.readStringNT(),
				Editor: Boolean(buffer.readUInt8())
			}
		}
	},
	[ServerPacketType.DELETE_AVATAR]: {
		Encode(buffer: SmartBuffer, avatar: Server.Avatar) {
			buffer.writeUInt8(ServerPacketType.DELETE_AVATAR)
			buffer.writeUInt8(avatar.localId)
		},
		Decode(buffer: SmartBuffer) {
			return {
				LocalId: buffer.readUInt8()
			}
		}
	},
	[ServerPacketType.MOVE]: {
		Encode(buffer: SmartBuffer, avatar: Server.Avatar) {
			buffer.writeUInt8(ServerPacketType.MOVE)
			buffer.writeUInt8(avatar.localId)
			buffer.writeFloatLE(avatar.x)
			buffer.writeFloatLE(avatar.y)
			buffer.writeUInt8(packDirection(avatar.dirX, avatar.dirY, avatar.holdingJump))
			buffer.writeFloatLE(avatar.velocityX)
			buffer.writeFloatLE(avatar.velocityY)
			buffer.writeFloatLE(avatar.accelerationX)
			buffer.writeFloatLE(avatar.accelerationY)
		},
		Decode(buffer: SmartBuffer) {
			const localId = buffer.readUInt8()
			const x = buffer.readFloatLE()
			const y = buffer.readFloatLE()
			const packed = unpackDirection(buffer.readUInt8())
			const dirX = packed.dirX
			const dirY = packed.dirY
			const holdingJump = packed.holdingJump
			const velocityX = buffer.readFloatLE()
			const velocityY = buffer.readFloatLE()
			const accelerationX = buffer.readFloatLE()
			const accelerationY = buffer.readFloatLE()
			return {
				LocalId: localId,
				X: x,
				Y: y,
				DirX: dirX,
				DirY: dirY,
				HoldingJump: holdingJump,
				VelocityX: velocityX,
				VelocityY: velocityY,
				AccelerationX: accelerationX,
				AccelerationY: accelerationY
			}
		}
	},
	[ServerPacketType.SET_TILE]: {
		Encode(buffer: SmartBuffer, layerId: number, x: number, y: number, tileId: number, meta: number) {
			buffer.writeUInt8(ServerPacketType.SET_TILE)
			buffer.writeUInt8(layerId)
			buffer.writeUInt16LE(x)
			buffer.writeUInt16LE(y)
			buffer.writeUInt8(tileId)
			buffer.writeUInt32LE(meta)
		},
		Decode(buffer: SmartBuffer) {
			return {
				LayerId: buffer.readUInt8(),
				X: buffer.readUInt16LE(),
				Y: buffer.readUInt16LE(),
				TileId: buffer.readUInt8(),
				Meta: buffer.readUInt32LE()
			}
		}
	},
	[ServerPacketType.ADD_SIGN_TEXT]: {
		Encode(buffer: SmartBuffer, x: number, y: number, text: string) {
			buffer.writeUInt8(ServerPacketType.ADD_SIGN_TEXT)
			buffer.writeUInt16LE(x)
			buffer.writeUInt16LE(y)
			buffer.writeStringNT(text)
		},
		Decode(buffer: SmartBuffer) {
			return {
				X: buffer.readUInt16LE(),
				Y: buffer.readUInt16LE(),
				Text: buffer.readStringNT()
			}
		}
	},
	[ServerPacketType.GRANT_EDIT]: {
		Encode(buffer: SmartBuffer, avatar: Server.Avatar) {
			buffer.writeUInt8(ServerPacketType.GRANT_EDIT)
			buffer.writeUInt8(avatar.localId)
		},
		Decode(buffer: SmartBuffer) {
			return {
				LocalId: buffer.readUInt8()
			}
		}
	},
	[ServerPacketType.REVOKE_EDIT]: {
		Encode(buffer: SmartBuffer, avatar: Server.Avatar) {
			buffer.writeUInt8(ServerPacketType.REVOKE_EDIT)
			buffer.writeUInt8(avatar.localId)
		},
		Decode(buffer: SmartBuffer) {
			return {
				LocalId: buffer.readUInt8(),
			}
		}
	},
	[ServerPacketType.CHANGE_SMILEY]: {
		Encode(buffer: SmartBuffer, avatar: Server.Avatar, smileyId: number) { // smileyId should be on Avatar interf. instead
			buffer.writeUInt8(ServerPacketType.CHANGE_SMILEY)
			buffer.writeUInt8(avatar.localId)
			buffer.writeUInt8(smileyId)
		},
		Decode(buffer: SmartBuffer) {
			return {
				LocalId: buffer.readUInt8(),
				Id: buffer.readUInt8(),
			}
		}
	},
	[ServerPacketType.WORLD_TITLE]: {
		Encode(buffer: SmartBuffer, title: string) {
			buffer.writeUInt8(ServerPacketType.WORLD_TITLE)
			buffer.writeStringNT(title)
		},
		Decode(buffer: SmartBuffer) {
			return {
				Title: buffer.readStringNT(),
			}
		}
	},
	[ServerPacketType.CHAT]: {
		Encode(buffer: SmartBuffer, sender: Server.Avatar, msg: string) {
			buffer.writeUInt8(ServerPacketType.CHAT)
			buffer.writeUInt8(sender.localId)
			buffer.writeStringNT(msg)
		},
		Decode(buffer: SmartBuffer) {
			return {
				LocalId: buffer.readUInt8(),
				Msg: buffer.readStringNT(),
			}
		}
	},
	[ServerPacketType.SYSTEM_CHAT]: {
		Encode(buffer: SmartBuffer, msg: string) {
			buffer.writeUInt8(ServerPacketType.SYSTEM_CHAT)
			buffer.writeStringNT(msg)
		},
		Decode(buffer: SmartBuffer) {
			return {
				Msg: buffer.readStringNT()
			}
		}
	},
	[ServerPacketType.TOUCH_KEY]: {
		Encode(buffer: SmartBuffer, tileId: number, duration: number) {
			buffer.writeUInt8(ServerPacketType.TOUCH_KEY)
			buffer.writeUInt8(tileId)
			buffer.writeDoubleLE(duration)
		},
		Decode(buffer: SmartBuffer) {
			return {
				TileId: buffer.readUInt8(),
				Duration: buffer.readDoubleLE()
			}
		}
	}
}

function jsonMap(map: Map<number, any>, json: any, value: any) {
	if (typeof json != 'object') {
		map.set(json, value)
		return
	}
	for (const key in json) {
		jsonMap(map, json[key], value)
	}
}

export function GetShadowOfCoin(tileId: number) {
	switch (tileId) {
		case Ids.Foreground.Coin.YellowCoin:
			return Ids.Foreground.Coin.YellowCoinShadow
		case Ids.Foreground.Coin.BlueCoin:
			return Ids.Foreground.Coin.BlueCoinShadow
	}
	throw 'gsoc'
}

export function GetCoinOfCoinGate(tileId: number) {
	switch (tileId) {
		case Ids.Foreground.CoinGate.YellowOff:
		case Ids.Foreground.CoinGate.InverseYellowOff:
			return Ids.Foreground.Coin.YellowCoin
		case Ids.Foreground.CoinGate.BlueOff:
		case Ids.Foreground.CoinGate.InverseBlueOff:
			return Ids.Foreground.Coin.BlueCoin
	}
	throw 'gcocg'
}

export function GetActiveStateOfCoinGate(tileId: number) {
	switch (tileId) {
		case Ids.Foreground.CoinGate.YellowOff:
				return Ids.Foreground.CoinGate.YellowOn
		case Ids.Foreground.CoinGate.BlueOff:
			return Ids.Foreground.CoinGate.BlueOn
		case Ids.Foreground.CoinGate.InverseYellowOff:
			return Ids.Foreground.CoinGate.InverseYellowOn
		case Ids.Foreground.CoinGate.InverseBlueOff:
			return Ids.Foreground.CoinGate.InverseBlueOn
	}
	throw 'gasocg'
}

export function GetKeyOfGate(tileId: number) {
	switch (tileId) {
		case Ids.Foreground.Gate.RedGateOff:
		case Ids.Foreground.Gate.InverseRedGateOff:
			return Ids.Foreground.Gate.RedKey
		case Ids.Foreground.Gate.GreenGateOff:
		case Ids.Foreground.Gate.InverseGreenGateOff:
			return Ids.Foreground.Gate.GreenKey
		case Ids.Foreground.Gate.BlueGateOff:
		case Ids.Foreground.Gate.InverseBlueGateOff:
			return Ids.Foreground.Gate.BlueKey
	}
	throw 'gkog'
}

export function GetActiveStateOfGate(tileId: number) {
	switch (tileId) {
		case Ids.Foreground.Gate.RedGateOff:
			return Ids.Foreground.Gate.RedGateOn
		case Ids.Foreground.Gate.InverseRedGateOff:
			return Ids.Foreground.Gate.InverseRedGateOn

		case Ids.Foreground.Gate.GreenGateOff:
			return Ids.Foreground.Gate.GreenGateOn
		case Ids.Foreground.Gate.InverseGreenGateOff:
			return Ids.Foreground.Gate.InverseGreenGateOn

		case Ids.Foreground.Gate.BlueGateOff:
			return Ids.Foreground.Gate.BlueGateOn
		case Ids.Foreground.Gate.InverseBlueGateOff:
			return Ids.Foreground.Gate.InverseBlueGateOn
	}
	throw 'gasog'
}

const layerMap = new Map<number, number>()
jsonMap(layerMap, Ids.Background, 0)
jsonMap(layerMap, Ids.Foreground, 1)
layerMap.delete(Ids.Foreground.Gravity.Nothing) // doesn't belong to a single layer id
jsonMap(layerMap, Ids.Decoration, 2)

export const tileToLayer = (tileId: number) => {
	return layerMap.get(tileId)
}

const solidMap = new Map<number, boolean>()
jsonMap(solidMap, Ids.Foreground.Basic, true)
jsonMap(solidMap, Ids.Foreground.Brick, true)
jsonMap(solidMap, Ids.Foreground.Gate.RedGateOff, true)
jsonMap(solidMap, Ids.Foreground.Gate.GreenGateOff, true)
jsonMap(solidMap, Ids.Foreground.Gate.BlueGateOff, true)
jsonMap(solidMap, Ids.Foreground.Gate.InverseRedGateOn, true)
jsonMap(solidMap, Ids.Foreground.Gate.InverseGreenGateOn, true)
jsonMap(solidMap, Ids.Foreground.Gate.InverseBlueGateOn, true)
jsonMap(solidMap, Ids.Foreground.Metal, true)
jsonMap(solidMap, Ids.Foreground.Misc, true)
jsonMap(solidMap, Ids.Foreground.Vanish.GreenOff, true)
jsonMap(solidMap, Ids.Foreground.CoinGate.YellowOff, true)
jsonMap(solidMap, Ids.Foreground.CoinGate.BlueOff, true)
jsonMap(solidMap, Ids.Foreground.CoinGate.InverseYellowOn, true)
jsonMap(solidMap, Ids.Foreground.CoinGate.InverseBlueOn, true)

export const solidTiles = new Set(solidMap.keys())

const validTilesMap = new Map<number, boolean>()
jsonMap(validTilesMap, Ids, true)

export const isTileValid = (tileId: number) => {
	return validTilesMap.has(tileId)
}

export const minimapColorsKV = [
	[Ids.Foreground.Basic.Gray, 0x707070],
	[Ids.Foreground.Basic.Blue, 0x3761B9],
	[Ids.Foreground.Basic.Purple, 0x9A2EB9],
	[Ids.Foreground.Basic.Red, 0xB73065],
	[Ids.Foreground.Basic.Yellow, 0x9CB12D],
	[Ids.Foreground.Basic.Green, 0x42B32D],
	[Ids.Foreground.Basic.Cyan, 0x32ABAF],
	[Ids.Foreground.Metal.Silver, 0xC6C5C6],
	[Ids.Foreground.Metal.Bronze, 0xCE2B17],
	[Ids.Foreground.Metal.Gold, 0xF8E254],
	[Ids.Background.Basic.Gray, 0x000000],//0x343434
	[Ids.Background.Basic.Blue, 0x1a2955],
	[Ids.Background.Basic.Purple, 0x4a1751],
	[Ids.Background.Basic.Red, 0x551a2a],
	[Ids.Background.Basic.Yellow, 0x465217],
	[Ids.Background.Basic.Green, 0x1e5218],
	[Ids.Background.Basic.Cyan, 0x174f53],
	[Ids.Foreground.Brick.Brown, 0x8b3e09],
	[Ids.Foreground.Brick.DarkGreen, 0x246f4d],
	[Ids.Foreground.Brick.Green, 0x438310],
	[Ids.Foreground.Brick.Purple, 0x4e246f],
	[Ids.Foreground.Misc.Yellow, 0xcf9022],
	[Ids.Foreground.Gate.RedGateOff, 0x9c2d46],
	[Ids.Foreground.Gate.RedGateOn, 0x9c2d46],
	[Ids.Foreground.Gate.InverseRedGateOff, 0x9c2d46],
	[Ids.Foreground.Gate.InverseRedGateOn, 0x9c2d46],
	[Ids.Foreground.Gate.GreenGateOff, 0x379c30],
	[Ids.Foreground.Gate.GreenGateOn, 0x379c30],
	[Ids.Foreground.Gate.InverseGreenGateOff, 0x379c30],
	[Ids.Foreground.Gate.InverseGreenGateOn, 0x379c30],
	[Ids.Foreground.Gate.BlueGateOff, 0x2d439c],
	[Ids.Foreground.Gate.BlueGateOn, 0x2d439c],
	[Ids.Foreground.Gate.InverseBlueGateOff, 0x2d439c],
	[Ids.Foreground.Gate.InverseBlueGateOn, 0x2d439c],
	[Ids.Foreground.CoinGate.YellowOff, 0xb88e15],
	[Ids.Foreground.CoinGate.YellowOn, 0xb88e15],
	[Ids.Foreground.CoinGate.InverseYellowOff, 0xb88e15],
	[Ids.Foreground.CoinGate.InverseYellowOn, 0xb88e15],
	[Ids.Foreground.CoinGate.BlueOff, 0x1c60f4],
	[Ids.Foreground.CoinGate.BlueOn, 0x1c60f4],
	[Ids.Foreground.CoinGate.InverseBlueOff, 0x1c60f4],
	[Ids.Foreground.CoinGate.InverseBlueOn, 0x1c60f4]
]
