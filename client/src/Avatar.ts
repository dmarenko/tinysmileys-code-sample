import { solidTiles } from './Common/Encoder'
import App from './Tilemap/App'
import TileSprite from './Tilemap/TileSprite'
import * as Config from './Config'
import { Ids } from './Ids'
import ExtraSprite from './Tilemap/ExtraSprite'
import { CreateSpeechBubble } from './Utils/CreateSpeechBubble'
import SpeechBubbleSprite from './SpeechBubbleSprite'
import UsernameSprite from './UsernameSprite'

export default class Avatar extends TileSprite {
	public TrailColor = { R: 255, G: 255, B: 255 }
	public readonly LocalId: number
	public readonly Username: string
	public readonly Guest: boolean
	public Editor: boolean
	public DirX: number = 0
	public DirY: number = 0
	protected MX: number = 0 // mx
	protected MY: number = 0
	public Jumping: boolean = false
	protected _VelocityX: number = 0 // speedX
	protected _VelocityY: number = 0
	protected _AccelerationX: number = 0 // modifierX
	protected _AccelerationY: number = 0
	protected Drag: number = Config.Physics.BaseDrag
	public Godmode: boolean = false
	private Queue: number[] = [0, 0]

	private Bubbles: ExtraSprite[] = []
	private UsernameSprite: ExtraSprite

	private AuraSprite: TileSprite

	constructor(app: App, localId: number, username: string, editor: boolean, tileId: number) {
		super(app, tileId)
		this.LocalId = localId
		this.Username = (username == '') ? 'Guest' : username
		this.Guest = (username == '')
		this.Editor = editor
		this.UsernameSprite = new UsernameSprite(this.App, this.Username)
		this.X = 32
		this.Y = 32
		this.App.AddSprite(2, this.UsernameSprite)
		this.AuraSprite = new TileSprite(app, Ids.Aura.Aura)
	}

	ToggleGodMode() {
		if (this.Godmode) {
			this.DisableGodMode()
		} else {
			this.EnableGodMode()
		}
	}

	EnableGodMode() {
		this.Godmode = true
		this.App.AddSprite(2, this.AuraSprite)
		console.log('added wtf')
	}

	DisableGodMode() {
		this.Godmode = false
		this.App.RemoveSprite(2, this.AuraSprite, { destroy: false })
	}

	Destroy() {
		super.Destroy()
		this.App.RemoveSprite(2, this.UsernameSprite, { destroy: true })
		for (const bubble of this.Bubbles) {
			this.App.RemoveSprite(2, bubble, { destroy: true })
		}
	}

	Tick() {

		const app = this.App, tileSize = app.TileSize

		/*

			Get gravity pull

		*/

		let delayed = this.Queue.shift()

		const centerX = Math.floor((this.X + this.Width / 2) / tileSize)
		const centerY = Math.floor((this.Y + this.Height / 2) / tileSize)
		const current = this.App.GetTile(1, centerX, centerY)

		this.Queue.push(current)

		if (current == Ids.Foreground.Gravity.None)
		{
			delayed = this.Queue.shift()
			this.Queue.push(current)
		}

		const gf = Config.Physics.GravityForce
		let gravityX
		let gravityY

		if (this.Godmode) {
			gravityX = 0
			gravityY = 0
		} else {
			gravityX = 0
			gravityY = gf

			if (delayed == Ids.Foreground.Gravity.Left) {
				gravityX = -gf
				gravityY = 0
			} else if (delayed == Ids.Foreground.Gravity.Up) {
				gravityX = 0
				gravityY = -gf
			} else if (delayed == Ids.Foreground.Gravity.Right) {
				gravityX = gf
				gravityY = 0
			} else if (delayed == Ids.Foreground.Gravity.None) {
				gravityX = 0
				gravityY = 0
			} else if (delayed == Ids.Foreground.BoostedGravity.Left) {
				gravityX = -16
				gravityY = 0
			} else if (delayed == Ids.Foreground.BoostedGravity.Up) {
				gravityX = 0
				gravityY = -16
			} else if (delayed == Ids.Foreground.BoostedGravity.Right) {
				gravityX = 16
				gravityY = 0
			} else if (delayed == Ids.Foreground.BoostedGravity.Down) {
				gravityX = 0
				gravityY = 16
			}
		}

		const r = 0.01
		const padding = 200

		if (this.X < 0 || this.X + this.Width > this.App.MapWidth * this.App.TileSize ||
			this.Y < 0 || this.Y + this.Height > this.App.MapHeight * this.App.TileSize) {
				gravityX = 0
				gravityY = 0
				this.Jumping = true
		}

		if (this.X < -padding) {
			gravityX = (this.X + padding) * -r
		} else if (this.X + this.Width > this.App.MapWidth * this.App.TileSize + padding) {
			gravityX = -r
		}
		
		if (this.Y < -padding) {
			gravityY = r
		} else if (this.Y + this.Height > this.App.MapHeight * this.App.TileSize + padding) {
			gravityY = -r
		}


		/*

			Handle jumping

		*/

		if (!this.Godmode && this.Jumping && (gravityX || gravityY)) { // optimization: will not run this code if you have no gravity -- you can't jump without gravity

			// Check if can jump


			// do I wanna use Trigger (invoke OnHit) for jump checking? or will it be handled by the movement logic? and then use just issolid here..


			let canJump = false
	
			if (this.VelocityX == 0 && this.X % tileSize == 0) {
				const leftX = Math.floor(this.X / tileSize) - 1
				const rightX = Math.floor(Math.ceil(this.X + this.Width - 1) / tileSize) + 1
				const topY = Math.floor(this.Y / tileSize)
				const bottomY = Math.floor(Math.ceil(this.Y + this.Height - 1) / tileSize)
				if (current == Ids.Foreground.Gravity.Left && (this.IsSolid(leftX, topY) || this.IsSolid(leftX, bottomY))) {
					canJump = true
				} else if (current == Ids.Foreground.Gravity.Right && (this.IsSolid(rightX, topY) || this.IsSolid(rightX, bottomY))) {
					canJump = true
				}
			}
	
			if (!canJump && this.VelocityY == 0 && this.Y % tileSize == 0) { // optimization: don't run this code if we already know you can jump
				const leftX = Math.floor(this.X / tileSize)
				const rightX = Math.floor(Math.ceil(this.X + this.Width - 1) / tileSize)
				const topY = Math.floor(this.Y / tileSize) - 1
				const bottomY = Math.floor(Math.ceil(this.Y + this.Height - 1) / tileSize) + 1
				const noChangers = current != Ids.Foreground.Gravity.Left && current != Ids.Foreground.Gravity.Up && current != Ids.Foreground.Gravity.Right && current != Ids.Foreground.Gravity.None
				if (noChangers && (this.IsSolid(leftX, bottomY) || this.IsSolid(rightX, bottomY))) {
					canJump = true
				} else if (current == Ids.Foreground.Gravity.Up && (this.IsSolid(leftX, topY) || this.IsSolid(rightX, topY))) {
					canJump = true
				}
			}

			if (canJump) {
				if (gravityX) {
					this.VelocityX -= this.AccelerationX * Config.Physics.JumpHeight
				} else if (gravityY) {
					this.VelocityY -= this.AccelerationY * Config.Physics.JumpHeight
				}
			}

		}
		
		/*

			Update acceleration

		*/

		// override dirX and dirY to 0 when gravity doesn't permit it (simplifies and avoids a lot of bugs)
		// dont use this.DirX and this.DirY directly (other than here)
		let dirX, dirY

		if (this.Godmode) {
			dirX = this.DirX
			dirY = this.DirY
		} else {
			if (gravityY) {
				dirX = this.DirX
				dirY = 0
			} else if (gravityX) {
				dirX = 0
				dirY = this.DirY
			} else {
				dirX = this.DirX
				dirY = this.DirY
			}
		}

		this.AccelerationX = gravityX + dirX
		this.AccelerationY = gravityY + dirY

		/*

		Add aceleration

		*/

		if (this._VelocityX || this._AccelerationX) {
			this._VelocityX += this._AccelerationX
			this._VelocityX *= this.Drag
			if ((dirX == 0 && gravityY != 0) || (this._VelocityX < 0 && dirX > 0) || (this._VelocityX > 0 && dirX < 0)) {
				this._VelocityX *= Config.Physics.NotMovingDrag
			}
			if (this.DirX == 0 && this.Godmode) {
				this._VelocityX *= Config.Physics.BaseDrag
			}
		}
		if (this._VelocityY || this._AccelerationY) {
			this._VelocityY += this._AccelerationY
			this._VelocityY *= this.Drag
			if ((dirY == 0 && gravityX != 0) || (this._VelocityY < 0 && dirY > 0) || (this._VelocityY > 0 && dirY < 0)) {
				this._VelocityY *= Config.Physics.NotMovingDrag
			}
			if (this.DirY == 0 && this.Godmode) {
				this._VelocityY *= Config.Physics.BaseDrag
			}
		}
		
		// if (this._velocityX > Config.Physics.maxVelocity) {
		// 	this._velocityX = Config.Physics.maxVelocity
		// } else if (this._velocityX < -Config.Physics.maxVelocity) {
		// 	this._velocityX = -Config.Physics.maxVelocity
		// } else if (this._velocityX < Config.Physics.minVelocity && this._velocityX > -Config.Physics.minVelocity) {
		// 	this._velocityX = 0
		// }

		// if (this._velocityY > Config.Physics.maxVelocity) {
		// 	this._velocityY = Config.Physics.maxVelocity
		// } else if (this._velocityY < -Config.Physics.maxVelocity) {
		// 	this._velocityY = -Config.Physics.maxVelocity
		// } else if (this._velocityY < Config.Physics.minVelocity && this._velocityY > -Config.Physics.minVelocity) {
		// 	this._velocityY = 0
		// }

		/*

			Interlaced tile aligned movement

		*/

		// this.X += this._VelocityX
		// this.Y += this._VelocityY

		// return;

		let distX = this._VelocityX * (tileSize / Config.Physics.TileSize)
		let distY = this._VelocityY * (tileSize / Config.Physics.TileSize)

		while (distX || distY) {
			let hitX = false
			let hitY = false

			const oldX = this.X
			const oldY = this.Y

			if (distX > 0) {
				const leftSide = Math.floor(this.X / tileSize)
				const newLeftSide = Math.floor((this.X + distX) / tileSize)
				let newStepX = 0
				if (leftSide != newLeftSide) {
					this.X = (leftSide + 1) * tileSize
					newStepX = distX - (this.X - oldX)
				} else {
					this.X += distX
				}
				if (!this.Godmode && this.IsColliding()) {
					hitX = true
					this.X = leftSide * tileSize
					distX -= this.X - oldX
				} else {
					distX = newStepX
				}
			} else if (distX < 0) {
				const rightSide = Math.floor(Math.ceil(this.X + this.Width - 1) / tileSize)
				const newRightSide = Math.floor(Math.ceil(this.X + distX + this.Width - 1) / tileSize)
				let newStepX = 0
				if (rightSide != newRightSide) {
					this.X = (rightSide - 1) * tileSize
					newStepX = distX - (this.X - oldX)
				} else {
					this.X += distX
				}
				if (!this.Godmode && this.IsColliding()) {
					hitX = true
					this.X = rightSide * tileSize
					distX -= this.X - oldX
				} else {
					distX = newStepX
				}
			}

			if (distY > 0) {
				const topSide = Math.floor(this.Y / tileSize)
				const newTopSide = Math.floor((this.Y + distY) / tileSize)
				let newStepY = 0
				if (topSide != newTopSide) {
					this.Y = (topSide + 1) * tileSize
					newStepY = distY - (this.Y - oldY)
				} else {
					this.Y += distY
				}
				if (!this.Godmode && this.IsColliding()) {
					hitY = true
					this.Y = topSide * tileSize
					distY -= this.Y - oldY
				} else {
					distY = newStepY
				}
			} else if (distY < 0) {
				const bottomSide = Math.floor(Math.ceil(this.Y + this.Height - 1) / tileSize)
				const newBottomSide = Math.floor(Math.ceil(this.Y + distY + this.Height - 1) / tileSize)
				let newStepY = 0
				if (bottomSide != newBottomSide) {
					this.Y = (bottomSide - 1) * tileSize
					newStepY = distY - (this.Y - oldY)
				} else {
					this.Y += distY
				}
				if (!this.Godmode && this.IsColliding()) {
					hitY = true
					this.Y = bottomSide * tileSize
					distY -= this.Y - oldY
				} else {
					distY = newStepY
				}
			}

			if (hitX && distY == 0) {
				distX = 0
				this.VelocityX = 0
			}

			if (hitY && distX == 0) {
				distY = 0
				this.VelocityY = 0
			}

			if (hitX && hitY) {
				distX = 0
				distY = 0
				this.VelocityX = 0
				this.VelocityY = 0
			}

		} // while

		let bubbleOffsetY = 6

		for (let i = this.Bubbles.length - 1; i >= 0; i--) {
			const bubble = this.Bubbles[i]
			bubble.X = this.X - bubble.Width / 2 + this.Width + 6
			bubble.Y = this.Y - bubble.Height + bubbleOffsetY
			bubbleOffsetY -= bubble.Height

			if (bubble.Alpha == 0) {
				this.App.RemoveSprite(2, bubble, { destroy: true })
				this.Bubbles.splice(this.Bubbles.indexOf(bubble), 1)
			}
		}

		this.UsernameSprite.X = this.X - this.UsernameSprite.Width / 2 + this.Width / 2
		this.UsernameSprite.Y = this.Y + this.Height

		if (Math.abs(this.VelocityX) > 0.5 || Math.abs(this.VelocityY) > 0.5) {
			this.UsernameSprite.Alpha = 0
		} else {
			this.UsernameSprite.Alpha = 1
		}

		this.AuraSprite.X = this.X - this.AuraSprite.Width / 2 + this.Width / 2
		this.AuraSprite.Y = this.Y - this.AuraSprite.Height / 2 + this.Height / 2
		
	} // method

	SpeechBubble(msg: string) {
		const bubble = new SpeechBubbleSprite(this.App, msg)

		this.App.AddSprite(2, bubble)

		this.Bubbles.push(bubble)
	}

	get VelocityX() { return this._VelocityX * Config.Physics.Multiplier }
	get VelocityY() { return this._VelocityY * Config.Physics.Multiplier }
	get AccelerationX() { return this._AccelerationX * Config.Physics.Multiplier }
	get AccelerationY() { return this._AccelerationY * Config.Physics.Multiplier }

	set VelocityX(velocityX: number) { this._VelocityX = velocityX / Config.Physics.Multiplier }
	set VelocityY(velocityY: number) { this._VelocityY = velocityY / Config.Physics.Multiplier }
	set AccelerationX(accelerationX: number) { this._AccelerationX = accelerationX / Config.Physics.Multiplier }
	set AccelerationY(accelerationY: number) { this._AccelerationY = accelerationY / Config.Physics.Multiplier }
}