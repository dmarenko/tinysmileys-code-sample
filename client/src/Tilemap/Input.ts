
const ShouldPreventDefault = (keyCode: number) => {
	return [32, 37, 38, 39, 40].includes(keyCode);
};

export default class Input {
	private SpaceTime = Infinity
	private Keys: Set<string | number> = new Set()
	private JustPressedKeys: Set<string | number> = new Set()
	
	constructor(gameCanvas: HTMLCanvasElement) {
		document.addEventListener('keydown', this.OnKeyDown.bind(this))
		document.addEventListener('keyup', this.OnKeyUp.bind(this))
	}

	public Destroy() {
		document.removeEventListener('keydown', this.OnKeyDown.bind(this))
		document.removeEventListener('keyup', this.OnKeyUp.bind(this))
	}

	private OnKeyDown(e: KeyboardEvent) {
		if (!this.IsKeyDown(e.keyCode)) {
			this.JustPressedKeys.add(e.key)
			this.JustPressedKeys.add(e.keyCode)
			if (e.keyCode == 32) {
				this.SpaceTime = performance.now()
			}
		}
		this.Keys.add(e.key)
		this.Keys.add(e.keyCode)
		if (ShouldPreventDefault(e.keyCode)) {
			// e.preventDefault();
		}
	}

	private OnKeyUp(e: KeyboardEvent) {
		this.Keys.delete(e.key)
		this.Keys.delete(e.keyCode)
		this.JustPressedKeys.delete(e.key)
		this.JustPressedKeys.delete(e.keyCode)
		if (e.keyCode == 32) {
			this.SpaceTime = Infinity
		}
		if (ShouldPreventDefault(e.keyCode)) {
			// e.preventDefault();
		}
	}

	public ExitFrame() {
		this.JustPressedKeys.clear()
	}

	public get SpaceDown() {
		return performance.now() - this.SpaceTime > 1000
	}

	public IsKeyDown(...keys: (string | number)[]) {
		return keys.some(key => this.Keys.has(key))
	}

	public IsKeyJustPressed(...keys: (string | number)[]) {
		return keys.some(key => this.JustPressedKeys.has(key))
	}

	public ReleaseAllKeys() {
		this.Keys = new Set()
	}
	
}