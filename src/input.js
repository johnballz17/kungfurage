/**
 * CARPE'S KUNG FU RAGE - MULTI-DEVICE INPUT MANAGER
 * Supports Keyboard, HTML5 Gamepad API (Xbox, PlayStation, etc.), and Touch controls.
 * Features double-tap dash detection!
 */

class InputManager {
  constructor() {
    this.keys = {};
    this.prevKeys = {};
    this.gamepadIndex = null;

    // Double-tap dash detection
    this.lastTapTime = { ArrowLeft: 0, ArrowRight: 0, KeyA: 0, KeyD: 0 };
    this.isDashing = false;

    // Default & Configurable Keybinds
    this.defaultBindings = {
      up: ['ArrowUp', 'KeyW'],
      down: ['ArrowDown', 'KeyS'],
      left: ['ArrowLeft', 'KeyA'],
      right: ['ArrowRight', 'KeyD'],
      punch: ['KeyJ', 'KeyZ'],
      kick: ['KeyK', 'KeyX'],
      jump: ['Space'],
      special: ['KeyL', 'KeyV'],
      mega: ['KeyH', 'KeyU'],
      store: ['KeyB'],
      mode: ['KeyM'],
      manual: ['KeyN'],
      companion: ['KeyT', 'KeyC'],
      start: ['Enter', 'KeyP', 'Escape']
    };

    this.bindings = JSON.parse(JSON.stringify(this.defaultBindings));
    this.loadBindings();

    this.setupKeyboard();
    this.setupGamepad();
    this.setupTouch();
  }

  loadBindings() {
    try {
      const saved = localStorage.getItem('kungfu_keybinds');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.bindings = { ...this.defaultBindings, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load keybinds from localStorage:', e);
    }
  }

  saveBindings() {
    try {
      localStorage.setItem('kungfu_keybinds', JSON.stringify(this.bindings));
    } catch (e) {
      console.warn('Failed to save keybinds to localStorage:', e);
    }
  }

  bindKey(action, keyCode) {
    if (!this.bindings[action]) return;
    this.bindings[action] = [keyCode];
    this.saveBindings();
  }

  resetBindings() {
    this.bindings = JSON.parse(JSON.stringify(this.defaultBindings));
    this.saveBindings();
  }

  getKeyDisplayName(code) {
    if (!code) return 'NONE';
    if (code.startsWith('Key')) return code.slice(3).toUpperCase();
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Numpad')) return 'NUM ' + code.slice(6);
    if (code === 'Space') return 'SPACE';
    if (code === 'ArrowUp') return '▲ UP';
    if (code === 'ArrowDown') return '▼ DOWN';
    if (code === 'ArrowLeft') return '◀ LEFT';
    if (code === 'ArrowRight') return '▶ RIGHT';
    if (code === 'Escape') return 'ESC';
    if (code === 'Enter') return 'ENTER';
    if (code === 'ShiftLeft' || code === 'ShiftRight') return 'SHIFT';
    if (code === 'ControlLeft' || code === 'ControlRight') return 'CTRL';
    return code;
  }

  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Audio auto-resume on first interaction
      window.soundEngine.resume();

      const code = e.code;
      // Prevent browser scrolling with arrows / space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
        e.preventDefault();
      }

      // Check double-tap for dash
      const now = performance.now();
      if (!this.keys[code]) {
        if (['ArrowRight', 'KeyD'].includes(code)) {
          if (now - this.lastTapTime.ArrowRight < 280) {
            this.isDashing = true;
          }
          this.lastTapTime.ArrowRight = now;
        } else if (['ArrowLeft', 'KeyA'].includes(code)) {
          if (now - this.lastTapTime.ArrowLeft < 280) {
            this.isDashing = true;
          }
          this.lastTapTime.ArrowLeft = now;
        }
      }

      this.keys[code] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (['ArrowRight', 'KeyD', 'ArrowLeft', 'KeyA'].includes(e.code)) {
        this.isDashing = false;
      }
    });
  }

  setupGamepad() {
    window.addEventListener('gamepadconnected', (e) => {
      this.gamepadIndex = e.gamepad.index;
      console.log('Gamepad connected:', e.gamepad.id);
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      if (this.gamepadIndex === e.gamepad.index) {
        this.gamepadIndex = null;
      }
    });
  }

  setupTouch() {
    const touchButtons = document.querySelectorAll('.touch-btn');
    touchButtons.forEach(btn => {
      const key = btn.dataset.key;
      const activate = (e) => {
        e.preventDefault();
        window.soundEngine.resume();
        this.keys[key] = true;
        btn.classList.add('pressed');
      };
      const deactivate = (e) => {
        e.preventDefault();
        this.keys[key] = false;
        btn.classList.remove('pressed');
      };

      btn.addEventListener('touchstart', activate, { passive: false });
      btn.addEventListener('touchend', deactivate, { passive: false });
      btn.addEventListener('mousedown', activate);
      btn.addEventListener('mouseup', deactivate);
      btn.addEventListener('mouseleave', deactivate);
    });

    // Detect touch device and show controls
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      const touchContainer = document.getElementById('touch-controls');
      if (touchContainer) touchContainer.classList.remove('hidden');
    }
  }

  pollGamepad() {
    if (this.gamepadIndex === null) return {};
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[this.gamepadIndex];
    if (!gp) return {};

    const axes = gp.axes;
    const buttons = gp.buttons;

    return {
      left: buttons[14]?.pressed || axes[0] < -0.3,
      right: buttons[15]?.pressed || axes[0] > 0.3,
      up: buttons[12]?.pressed || axes[1] < -0.3,
      down: buttons[13]?.pressed || axes[1] > 0.3,
      punch: buttons[2]?.pressed || buttons[0]?.pressed, // X or A button
      kick: buttons[1]?.pressed, // B button
      jump: buttons[3]?.pressed || buttons[4]?.pressed, // Y or LB
      special: buttons[5]?.pressed, // RB
      mega: buttons[7]?.pressed || buttons[6]?.pressed || (buttons[2]?.pressed && (buttons[14]?.pressed || buttons[15]?.pressed)), // RT/R2 or LT or Forward+Punch
      start: buttons[9]?.pressed
    };
  }

  update() {
    // Clone keys for single-frame trigger detection
    this.prevKeys = { ...this.keys };
  }

  isActionPressed(action) {
    const gp = this.pollGamepad();
    if (gp[action]) return true;

    const boundKeys = this.bindings[action] || this.defaultBindings[action] || [];
    for (const code of boundKeys) {
      if (this.keys[code]) return true;
    }
    return false;
  }

  isActionJustPressed(action) {
    const gp = this.pollGamepad();
    if (gp[action]) return true; // Gamepad single-frame check

    const boundKeys = this.bindings[action] || this.defaultBindings[action] || [];
    for (const code of boundKeys) {
      if (this.keys[code] && !this.prevKeys[code]) return true;
    }
    return false;
  }

  getHorizontal() {
    const gp = this.pollGamepad();
    if (this.isActionPressed('right') || gp.right) return 1;
    if (this.isActionPressed('left') || gp.left) return -1;
    return 0;
  }

  getVertical() {
    const gp = this.pollGamepad();
    if (this.isActionPressed('down') || gp.down) return 1;
    if (this.isActionPressed('up') || gp.up) return -1;
    return 0;
  }
}

window.inputManager = new InputManager();
