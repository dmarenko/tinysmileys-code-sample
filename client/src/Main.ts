import { SmartBuffer } from 'smart-buffer';
import * as UI from './UI'
import { Home, Play, SignIn, SignUp } from './DOM'
import { changeState } from './UI'
import { GetFps } from './Utils/FPS'
import * as Config from './Config'
import App from './Tilemap/App'
import Input from './Tilemap/Input'
import Player from './Player'
import State, { resetState } from './State'
import { Ids } from './Ids'
import Minimap from './Minimap'
import { LoadAtlas, LoadNumAtlas } from './Packer/LoadAtlas'
import { EClient, EServer, solidTiles, tileToLayer, ServerPacketType, ClientPacketType, bufferToWorld } from './Common/Encoder'
import Socket from './Socket'
import Avatar from './Avatar'
import * as DOM from './DOM'
import Auth from './Auth'
import XHR, { IWorld } from './XHR'
import Chat from './Chat'
import World from './World'
import TileDefault from './Tiles/TileDefault';
import TileKey from './Tiles/TileKey';
import TileGate from './Tiles/TileGate';
import TileCoin from './Tiles/TileCoin';
import Modal from './Modal';
import TileCoinGate from './Tiles/TileCoinGate';
import TileVanish from './Tiles/TileVanish';
import TilePortal from './Tiles/TilePortal';
import TileSign from './Tiles/TileSign';
import { World as FuckYou } from './Common/Encoder'

async function Init() {

	const atlas = await LoadAtlas() // must happen OUTSIDE of connect handler: otherwise, if we wait for atlas to load, the avatars won't be added to avatar list immediately, and then we won't be able to process the avatars' initial position
	const numAtlas = await LoadNumAtlas()

	UI.Init(atlas)

	const renderUserList = () => {
		function create(avatar: Avatar) {
			const template = `
				<div class="user">
					<div>
						${avatar.Username}
					</div>
				</div>
			`

			const dom = document.createElement('div')
			dom.innerHTML = template
			const userEl = dom.firstElementChild! as HTMLDivElement

			if (avatar.Username == State.WorldCreator) {
				const icon = document.createElement('i')
				icon.className = 'fas fa-crown'
				userEl.appendChild(icon)
			} else if (avatar.Editor) {
				const icon = document.createElement('i')
				icon.className = 'fas fa-pen'
				userEl.appendChild(icon)
			}

			return userEl
		}

		
		DOM.Play.WorldInfo.UserList.innerHTML = ''
		
		State.Avatars.forEach(avatar => {
			DOM.Play.WorldInfo.UserList.appendChild(
				create(avatar)
			)
		})
	}
	let ownId: number = -1
	let editor: boolean = false
	
	// never do asynchronous operations inside ServerPacketReader because packets can be order sensitive
	const onmsg = async (data: any) => { // ws .onmessage callback
		const buf = SmartBuffer.fromBuffer(new window.Buffer(data))
		while (buf.remaining() > 0) { // packets can be merged
			const t: number = buf.readUInt8()
			if (t == ServerPacketType.JOIN_WORLD) {
				const d = EServer[t].Decode(buf)
				ownId = d.OwnId
				editor = d.Editor
				State.ServerTime = d.ServerTime
				State.WorldCreator = d.Creator
				DOM.Play.WorldInfo.Title.textContent = d.Title
				DOM.Play.WorldInfo.Creator.textContent = d.Creator
			} else if (t == ServerPacketType.SET_MAP) {

				const world = await bufferToWorld(window.zlib, buf.readBuffer())

				State.Signs = world.signs

				if (State.Player == null) { // first-time connecting
			
					const handlers = new Map()

					handlers.set(Ids.Foreground.Gate.RedKey, TileKey)
					handlers.set(Ids.Foreground.Gate.GreenKey, TileKey)
					handlers.set(Ids.Foreground.Gate.BlueKey, TileKey)

					handlers.set(Ids.Foreground.Gate.RedGateOff, TileGate)
					handlers.set(Ids.Foreground.Gate.GreenGateOff, TileGate)
					handlers.set(Ids.Foreground.Gate.BlueGateOff, TileGate)

					handlers.set(Ids.Foreground.Gate.InverseRedGateOff, TileGate)
					handlers.set(Ids.Foreground.Gate.InverseGreenGateOff, TileGate)
					handlers.set(Ids.Foreground.Gate.InverseBlueGateOff, TileGate)

					handlers.set(Ids.Foreground.Coin.YellowCoin, TileCoin)
					handlers.set(Ids.Foreground.Coin.BlueCoin, TileCoin)

					handlers.set(Ids.Foreground.CoinGate.YellowOff, TileCoinGate)
					handlers.set(Ids.Foreground.CoinGate.BlueOff, TileCoinGate)
					handlers.set(Ids.Foreground.CoinGate.InverseYellowOff, TileCoinGate)
					handlers.set(Ids.Foreground.CoinGate.InverseBlueOff, TileCoinGate)

					handlers.set(Ids.Foreground.Vanish.GreenOff, TileVanish)

					handlers.set(Ids.Foreground.Portal.Cyan, TilePortal)

					handlers.set(Ids.Foreground.Sign.Brown, TileSign)

					const app = new World(atlas, numAtlas, TileDefault, handlers, world.width, world.height, world.layers, new Uint32Array(world.width * world.height))

					let targetLayer = -1

					app.On('tilepress', (x, y) => {
						if (!State.Player!.Editor || State.TilePressMap.Has(targetLayer, x, y) || State.App.IsOutOfBounds(x, y)) {
							return
						}
						const app = State.App
						const selected = State.SelectedTile
						const nothing = Ids.Foreground.Gravity.Nothing
						if (selected == nothing) { // delete tile
							if (targetLayer == -1) { // find possible layer
								for (let i = app.HighestLayerId; i > 0; i--) { // exclude i=0 because most behind layer cannot be deleted
									if (app.GetTile(i, x, y) != nothing) { // found tile to delete
										targetLayer = i
										break
									}
								}
							}
						} else { // set tile
							if (targetLayer == -1) {
								targetLayer = tileToLayer(selected)!
								if (targetLayer == undefined) {
									targetLayer = -1
									console.log('You forgot to map it')
								}
							}
						}
						if (targetLayer == -1) {
							return
						}
						if (app.GetTile(targetLayer, x, y) == selected) {
							return
						}
						const layer = targetLayer
						function send(meta: number = 0) {
							const buf = EClient[ClientPacketType.SET_TILE].Encode(layer, x, y, selected, meta)
							State.Ws.send(buf)
							State.TilePressMap.Add(layer, x, y)
						}
						if (selected == Ids.Foreground.Sign.Brown) {
							Modal.SignTextPrompt('').then(text => {
								send()
								const buf = EClient[ClientPacketType.ADD_SIGN_TEXT].Encode(x, y, text)
								State.Ws.send(buf)
							})
						} else if (selected == Ids.Foreground.CoinGate.YellowOff ||
									selected == Ids.Foreground.CoinGate.BlueOff ||
									selected == Ids.Foreground.CoinGate.InverseYellowOff ||
									selected == Ids.Foreground.CoinGate.InverseBlueOff) {
							Modal.CoinGatePrompt().then(num => {
								send(num)
							})
						} else if (selected == Ids.Foreground.Portal.Cyan) {
							Modal.PortalPrompt().then(({Src, Dst}) => {
								const meta = (Src << 16) | Dst
								send(meta)
							})
						} else {
							send()
						}
						
					})

					app.On('tileup', () => {
						targetLayer = -1
					})

					DOM.Play.Container.insertBefore(app.Canvas, DOM.Play.Container.firstChild)

					State.App = app
					State.Minimap = new Minimap(app, Play.MinimapRenderer)
					
					const player: Player = new Player(app, ownId, State.Username, editor, Ids.Avatar.Basic.Peaceful)
					
					// This causes jittery spawn. The spawn position should be sent
					// by server to everyone.
					// player.X = app.TileSize
					// player.Y = app.TileSize
					State.Player = player
					
					State.Avatars.push(player)
					
					app.AddSprite(1, player)

					app.SetCameraTarget(player)

					app.On('enterframe', (elapsed) => {
						DOM.Play.SignTextPanel.style.display = 'none'
						if (State.App.Input.IsKeyJustPressed('g')) {
							State.Player!.ToggleGodMode()
							// State.Player!.Godmode = !State.Player!.Godmode
						}
						if (State.App.Input.IsKeyJustPressed('m')) {
							DOM.Play.ToolBar.MinimapButton.click()
						}
					})

					app.On('exitframe', (elapsed) => {
						State.Minimap.RenderAvatarTrails([...State.Avatars, player])
						player.SendMovement()
						Play.FpsCounter.textContent = 'Fps: ' + GetFps()
						State.ServerTime += elapsed
					})

					if (editor) {
						Play.ToolBar.EditorTools.style.display = ''
					} else {
						Play.ToolBar.EditorTools.style.display = 'none'
					}

					renderUserList()

					Play.Chat.Log.innerHTML = ''

					Chat.AddSystemMessage('If this is your world, type /help')

					changeState('play')
				} else {
					State.App.SetMap(world.layers, world.meta)
					State.Minimap = new Minimap(State.App, Play.MinimapRenderer)
				}
			} else if (t == ServerPacketType.ADD_AVATAR) {
				const { LocalId, Username, Editor } = EServer[t].Decode(buf)
				const avatar = new Avatar(State.App, LocalId, Username, Editor, Ids.Avatar.Basic.Happy)
				State.Avatars.push(avatar)
				State.App.AddSprite(1, avatar)
				renderUserList()
			} else if (t == ServerPacketType.DELETE_AVATAR) {
				const { LocalId } = EServer[t].Decode(buf)
				const idx = State.Avatars.findIndex(avatar => avatar.LocalId == LocalId)
				State.App.RemoveSprite(1, State.Avatars[idx], { destroy: true })
				State.Avatars.splice(idx, 1)
				renderUserList()
			} else if (t == ServerPacketType.SET_TILE) {
				const { LayerId, X, Y, TileId, Meta } = EServer[t].Decode(buf)
				State.App.SetTile(LayerId, X, Y, TileId, Meta)
				State.TilePressMap.Delete(LayerId, X, Y)
			} else if (t == ServerPacketType.ADD_SIGN_TEXT) {
				const { X, Y, Text } = EServer[t].Decode(buf)
				const pos = Y * State.App.MapWidth + X
				State.Signs.set(pos, Text)
			} else if (t == ServerPacketType.TOUCH_KEY) {
				const { TileId, Duration } = EServer[t].Decode(buf)
				const tileKey = State.App.GetTileHandler(TileId) as TileKey
				tileKey.Activate(TileId, Duration)
			} else if (t == ServerPacketType.MOVE) {
				const d = EServer[t].Decode(buf)
				const avatar = State.Avatars.find(avatar => avatar.LocalId == d.LocalId)!
				avatar.X = d.X
				avatar.Y = d.Y
				avatar.DirX = d.DirX
				avatar.DirY = d.DirY
				avatar.Jumping = d.HoldingJump
				avatar.VelocityX = d.VelocityX
				avatar.VelocityY = d.VelocityY
				avatar.AccelerationX = d.AccelerationX
				avatar.AccelerationY = d.AccelerationY
			} else if (t == ServerPacketType.GRANT_EDIT) {
				const { LocalId } = EServer[t].Decode(buf)
				if (State.Player!.LocalId == LocalId) {
					Play.ToolBar.EditorTools.style.display = ''
					// edge case: if you tried to place tiles when on client you had edit, but on server you did not (your edit was revoked mid drawing); clear these tiles.
					State.TilePressMap.Clear()
				}
				const avatar = State.Avatars.find(avatar => avatar.LocalId == LocalId)!
				avatar.Editor = true
				renderUserList()
			} else if (t == ServerPacketType.REVOKE_EDIT) {
				const { LocalId } = EServer[t].Decode(buf)
				if (State.Player!.LocalId == LocalId) {
					Play.ToolBar.EditorTools.style.display = 'none'
				}
				const avatar = State.Avatars.find(avatar => avatar.LocalId == LocalId)!
				avatar.Editor = false
				renderUserList()
			} else if (t == ServerPacketType.CHAT) {
				const { LocalId, Msg } = EServer[t].Decode(buf)
				const avatar = State.Avatars.find(avatar => avatar.LocalId == LocalId)!
				avatar.SpeechBubble(Msg)
				Chat.AddMessage(avatar.Username, Msg)
			} else if (t == ServerPacketType.SYSTEM_CHAT) {
				const { Msg } = EServer[t].Decode(buf)
				Chat.AddSystemMessage(Msg)
			} else if (t == ServerPacketType.WORLD_TITLE) {
				const { Title } = EServer[t].Decode(buf)
				DOM.Play.WorldInfo.Title.textContent = Title
			} else {
				console.error('Unhandled type', t)
				break
			}
		}
	}

	const renderWorldList = (target: Element, worlds: IWorld[]) => {
		target.innerHTML = ''
		worlds.forEach(world => {
			const template = `
			<div class="world">
				<div class="thumb" style="background-image: url(/thumb?id=${world.id})"></div>
				<div class="title">${world.title}</div>
				<div class="size">${world.size || ''}</div>
				<div class="subtitle"><span style="color: lime;">${world.online}</span> online</div>
			</div>
			`
			const dom = document.createElement('div')
			dom.innerHTML = template
			const item = dom.firstElementChild! as HTMLDivElement
			if (world.online == 0) {
				const el = item.querySelector('.subtitle')! as HTMLDivElement
				el.textContent = `By ${world.creator}`
			}
			item.onclick = () => {
				changeState('loading')
				const isLocal = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
				const domain = isLocal ? 'localhost' : 'tinysmileys.com'
				const ws = new Socket(`wss://${domain}/join-world?token=${Auth.GetToken()}&id=${world.id}`)
				State.Ws = ws
				ws.onmessage = onmsg
				ws.onopen = () => {
					Play.LostConnection.style.display = 'none'
				}
				ws.onclose = ws.onerror = () => {
					Play.LostConnection.style.display = ''
				}
			}
			target.appendChild(item)
		})

	}

	const clear = () => {
		Home.ToolBar.HomeButton.classList.remove('selected')
		Home.ToolBar.MyWorldsButton.classList.remove('selected')
		Home.ToolBar.ShopButton.classList.remove('selected')
	}

	Home.ToolBar.HomeButton.onclick = () => {
		clear()
		Home.ToolBar.HomeButton.classList.add('selected')
		Home.WorldList.innerHTML = ''
		XHR.getWorlds().then(worlds => {
			renderWorldList(Home.WorldList, worlds)
		})
	}

	Home.ToolBar.HomeButton.click()

	Home.ToolBar.MyWorldsButton.onclick = () => {
		clear()
		Home.ToolBar.MyWorldsButton.classList.add('selected')
		Home.WorldList.innerHTML = ''
		const token = Auth.GetToken()!
		XHR.getMyWorlds(token).then((worlds: any) => {
			renderWorldList(Home.WorldList, worlds)
		})
	}

	Home.ToolBar.ShopButton.onclick = () => {
		clear()
		Home.ToolBar.ShopButton.classList.add('selected')
	}

	

	SignIn.GuestButton.onclick = () => {
		changeState('home-guest')
	}

	Home.GuestToolBar.SignInButton.onclick = () => {
		resetState()
		changeState('signin')
	}

	SignUp.CreateButton.onclick = async () => {
		changeState('loading')
		const username = SignUp.UsernameInput.value
		const token = Auth.GetToken()!
		const res = await XHR.signup(token, username)
		if (res.error) {
			changeState('signup')
			alert(res.error)
		} else {
			// for simplicity, reload page.
			// the newly created user profile will be processed by social callback sign-in handler.
			location.reload(true)
		}
	}
	
	SignUp.CancelButton.onclick = Home.ToolBar.SignOutButton.onclick = () => {
		changeState('loading')
		// resetState()
		Auth.SignOut()
	}

	Play.WorldInfo.ExitLevelButton.onclick = () => {

		State.Ws.close()

		State.App.Destroy()

		Play.ToolBar.WorldInfoButton.click()

		Home.ToolBar.HomeButton.click() // applicable for guests too

		resetState({ SoftReset: true })

		if (State.Guest) {
			changeState('home-guest')
		} else {
			changeState('home')
		}
	}
	
	Auth.Init({
		OnGuest() {
			changeState('signin')
		},
		OnMember() {
			const token = Auth.GetToken()!
			XHR.getProfile(token).then((profile: any) => {
				if (profile == null) {
					DOM.SignUp.UsernameInput.value = ''
					changeState('signup')
				} else {
					DOM.Home.ToolBar.Username.textContent = profile.username
					State.Username = profile.username
					State.Guest = false
					changeState('home')
				}
			}).catch(() => {
				console.error('unexpected error')
			})
		}
	})
} // Init

Init()