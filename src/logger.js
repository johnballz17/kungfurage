// ==========================================
// CARPE'S KUNG FU RAGE - GAME LOGGER & DEBUG CONSOLE
// ==========================================

class GameLogger {
  constructor() {
    // Enabled by default unless explicitly disabled in localStorage
    const savedPref = (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function')
      ? localStorage.getItem('kungfu_debug_console')
      : null;
    this.enabled = savedPref !== 'false';

    const savedAutoFile = (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function')
      ? localStorage.getItem('kungfu_auto_save_log_files')
      : null;
    this.autoSaveToFile = savedAutoFile !== 'false'; // Default ON

    const savedAutoDl = (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function')
      ? localStorage.getItem('kungfu_auto_download_files')
      : null;
    this.autoDownloadFiles = savedAutoDl === 'true'; // Default OFF for promptless direct saving, configurable

    this.maxEntries = 5000;
    this.logs = [];
    this.sessionStartTime = Date.now();
    this.sessionGameTime = 0;
    this.activeFilter = 'ALL';
    this.searchQuery = '';
    this.autoScroll = true;
    this.isOpen = false;
    this.isFolderOpen = false;
    this.viewingLastSaved = false;
    this.currentViewedSessionId = null;

    // File System Access Directory Handle (if linked by user)
    this.dirHandle = null;

    this.sessionStats = {
      startTime: new Date().toISOString(),
      playerCharacter: 'smellu',
      gameMode: 'HORIZONTAL',
      difficulty: 'NORMAL',
      companionEnabled: true,
      companionCharacter: 'auto',
      playerHitsLanded: 0,
      companionHitsLanded: 0,
      enemiesSlain: 0,
      damageDealt: 0,
      damageTaken: 0,
      highestCombo: 0,
      stageReached: 1,
      score: 0,
      endReason: null
    };

    // Auto-setup UI if running in browser
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.setupUI());
      } else {
        setTimeout(() => this.setupUI(), 0);
      }
    }
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    const mStr = mins < 10 ? '0' + mins : mins;
    const sStr = (seconds % 60) < 10 ? '0' + secs : secs;
    return `[${mStr}:${sStr}]`;
  }

  log(category, message, data = null) {
    if (!this.enabled) return;

    const gameTime = (Date.now() - this.sessionStartTime) / 1000;
    const entry = {
      id: this.logs.length + 1,
      time: this.formatTime(gameTime),
      timestamp: new Date().toISOString(),
      category: (category || 'SYSTEM').toUpperCase(),
      message: String(message),
      data: data ? JSON.parse(JSON.stringify(data)) : null
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxEntries) {
      this.logs.shift();
    }

    // Update real-time stats
    if (entry.category === 'PLAYER' && (entry.message.includes(' hit ') || entry.message.includes('Hit landed'))) {
      this.sessionStats.playerHitsLanded++;
    } else if (entry.category === 'COMPANION' && (entry.message.includes(' hit ') || entry.message.includes('Hit landed'))) {
      this.sessionStats.companionHitsLanded++;
    } else if (entry.category === 'ENEMY' && (entry.message.includes('Defeated') || entry.message.includes('Slain') || entry.message.includes('KO'))) {
      this.sessionStats.enemiesSlain++;
    }

    if (entry.message.includes(' hit ')) {
      const dmgMatch = entry.message.match(/for (\d+) dmg/);
      if (dmgMatch) {
        const dmg = parseInt(dmgMatch[1], 10);
        if (entry.category === 'PLAYER' || entry.category === 'COMPANION') {
          this.sessionStats.damageDealt += dmg;
        } else if (entry.category === 'ENEMY') {
          this.sessionStats.damageTaken += dmg;
        }
      }
    }

    if (entry.category === 'COMBAT' && entry.message.includes('Combo x')) {
      const match = entry.message.match(/Combo x(\d+)/);
      if (match) {
        const count = parseInt(match[1], 10);
        if (count > this.sessionStats.highestCombo) {
          this.sessionStats.highestCombo = count;
        }
      }
    }

    if (entry.category === 'STAGE') {
      const sMatch = entry.message.match(/Stage (\d+)/i) || entry.message.match(/Floor (\d+)/i);
      if (sMatch) {
        const num = parseInt(sMatch[1], 10);
        if (num > this.sessionStats.stageReached) {
          this.sessionStats.stageReached = num;
        }
      }
    }

    // If console is open and not paused on last saved, stream to UI
    if (this.isOpen && !this.viewingLastSaved) {
      this.appendLogEntryToUI(entry);
    }
  }

  startSession(config = {}) {
    this.sessionStartTime = Date.now();
    this.logs = [];
    this.viewingLastSaved = false;
    this.currentViewedSessionId = null;

    this.sessionStats = {
      startTime: new Date().toISOString(),
      playerCharacter: config.characterId || 'smellu',
      gameMode: config.gameMode || 'HORIZONTAL',
      difficulty: config.difficulty || 'NORMAL',
      companionEnabled: !!config.companionEnabled,
      companionCharacter: config.companionChar || 'auto',
      playerHitsLanded: 0,
      companionHitsLanded: 0,
      enemiesSlain: 0,
      damageDealt: 0,
      damageTaken: 0,
      highestCombo: 0,
      stageReached: 1,
      score: 0,
      endReason: null
    };

    this.log('SYSTEM', `New Session Started: Fighter=${this.sessionStats.playerCharacter}, Mode=${this.sessionStats.gameMode}, Diff=${this.sessionStats.difficulty}, Companion=${this.sessionStats.companionEnabled ? this.sessionStats.companionCharacter : 'OFF'}`);
  }

  saveSession(reason = 'GAMEOVER', finalScore = 0) {
    this.sessionStats.endReason = reason;
    this.sessionStats.score = finalScore;
    const duration = ((Date.now() - this.sessionStartTime) / 1000).toFixed(1);
    this.sessionStats.durationSeconds = parseFloat(duration);

    this.log('SYSTEM', `Session Finished: Reason=${reason}, FinalScore=${finalScore}, Duration=${duration}s, Slain=${this.sessionStats.enemiesSlain}`);

    const ts = Date.now();
    if (GameLogger._lastSavedTs && ts <= GameLogger._lastSavedTs) {
      GameLogger._lastSavedTs++;
    } else {
      GameLogger._lastSavedTs = ts;
    }
    const sessionId = `kungfu_log_${GameLogger._lastSavedTs}`;
    const payload = {
      version: '1.0',
      id: sessionId,
      savedAt: new Date().toISOString(),
      reason: reason,
      finalScore: finalScore,
      durationSeconds: parseFloat(duration),
      stats: { ...this.sessionStats },
      logs: [...this.logs]
    };

    // 1. Direct Save to Local Directory if linked via File System Access API
    if (this.dirHandle) {
      this.saveSessionToDir(this.dirHandle, sessionId, payload).catch(err => {
        console.warn('GameLogger: Auto-save direct to local folder failed:', err);
      });
    } else if (this.autoDownloadFiles) {
      // Optional browser download fallback if direct folder not linked
      try {
        this.exportJSON(payload, `${sessionId}.json`);
        this.exportTXT(payload, `${sessionId}.txt`);
      } catch (e) {
        console.warn('GameLogger: Auto-download fallback error:', e);
      }
    }

    if (typeof localStorage === 'undefined' || typeof localStorage.setItem !== 'function') return;

    try {
      // Backwards-compatible last game log
      localStorage.setItem('kungfu_last_game_log', JSON.stringify(payload));

      // Multi-session individual archive: load existing index
      let folderIndex = this.getLogFolderIndex();

      const summary = {
        id: sessionId,
        filename: `${sessionId}`,
        savedAt: payload.savedAt,
        reason: payload.reason,
        finalScore: payload.finalScore,
        durationSeconds: payload.durationSeconds,
        character: this.sessionStats.playerCharacter,
        mode: this.sessionStats.gameMode,
        difficulty: this.sessionStats.difficulty,
        enemiesSlain: this.sessionStats.enemiesSlain,
        playerHitsLanded: this.sessionStats.playerHitsLanded,
        companionHitsLanded: this.sessionStats.companionHitsLanded,
        damageDealt: this.sessionStats.damageDealt,
        highestCombo: this.sessionStats.highestCombo,
        stageReached: this.sessionStats.stageReached,
        logCount: this.logs.length
      };

      folderIndex.unshift(summary);

      // Prune old sessions beyond limit (keep max 30 full sessions in storage)
      if (folderIndex.length > 30) {
        const removed = folderIndex.splice(30);
        removed.forEach(oldItem => {
          try { localStorage.removeItem(`kungfu_session_${oldItem.id}`); } catch (e) {}
        });
      }

      // Safe save with quota handling
      try {
        localStorage.setItem(`kungfu_session_${sessionId}`, JSON.stringify(payload));
        localStorage.setItem('kungfu_log_folder_index', JSON.stringify(folderIndex));
      } catch (quotaErr) {
        // Evict older sessions if quota exceeded
        while (folderIndex.length > 5) {
          const evicted = folderIndex.pop();
          try { localStorage.removeItem(`kungfu_session_${evicted.id}`); } catch (e) {}
        }
        try {
          localStorage.setItem(`kungfu_session_${sessionId}`, JSON.stringify(payload));
          localStorage.setItem('kungfu_log_folder_index', JSON.stringify(folderIndex));
        } catch (retryErr) {
          console.warn('GameLogger: localStorage quota full, unable to persist full session:', retryErr);
        }
      }

      // Keep legacy history (last 5)
      let history = folderIndex.slice(0, 5);
      localStorage.setItem('kungfu_game_history', JSON.stringify(history));

      // Update folder UI if open
      if (this.isFolderOpen) {
        this.renderFolderModalUI();
      }
    } catch (e) {
      console.warn('GameLogger: unable to save session to localStorage:', e);
    }
  }

  getLogFolderIndex() {
    if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') return [];
    try {
      const raw = localStorage.getItem('kungfu_log_folder_index');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  getSessionById(sessionId) {
    if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') return null;
    if (!sessionId) return this.getLastSavedSession();
    try {
      const raw = localStorage.getItem(`kungfu_session_${sessionId}`);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  deleteSessionById(sessionId) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(`kungfu_session_${sessionId}`);
      let folderIndex = this.getLogFolderIndex();
      folderIndex = folderIndex.filter(item => item.id !== sessionId);
      localStorage.setItem('kungfu_log_folder_index', JSON.stringify(folderIndex));

      const last = this.getLastSavedSession();
      if (last && last.id === sessionId) {
        if (folderIndex.length > 0) {
          const nextLast = this.getSessionById(folderIndex[0].id);
          if (nextLast) localStorage.setItem('kungfu_last_game_log', JSON.stringify(nextLast));
          else localStorage.removeItem('kungfu_last_game_log');
        } else {
          localStorage.removeItem('kungfu_last_game_log');
        }
      }

      if (this.isFolderOpen) this.renderFolderModalUI();
    } catch (e) {
      console.error('Error deleting session:', e);
    }
  }

  clearAllSessions() {
    if (typeof localStorage === 'undefined') return;
    try {
      const folderIndex = this.getLogFolderIndex();
      folderIndex.forEach(item => {
        try { localStorage.removeItem(`kungfu_session_${item.id}`); } catch (e) {}
      });
      localStorage.removeItem('kungfu_log_folder_index');
      localStorage.removeItem('kungfu_game_history');
      if (this.isFolderOpen) this.renderFolderModalUI();
    } catch (e) {
      console.error('Error clearing sessions:', e);
    }
  }

  async selectLocalLogsFolder() {
    if (typeof window === 'undefined' || !window.showDirectoryPicker) {
      alert('File System Access API is not supported in this browser.\nUse Chrome or Edge to link the local LOGS folder directly, or download individual logs below.');
      return false;
    }
    try {
      this.dirHandle = await window.showDirectoryPicker({
        id: 'kungfu_logs_dir',
        mode: 'readwrite',
        startIn: 'documents'
      });
      alert(`✓ Local LOGS folder linked: "${this.dirHandle.name}"\nFuture games will automatically save .json and .txt files directly to this directory!`);
      const linkBtn = document.getElementById('link-logs-folder-btn');
      if (linkBtn) {
        linkBtn.innerText = `✓ LINKED: ${this.dirHandle.name.toUpperCase()}`;
        linkBtn.classList.add('active');
      }
      return true;
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.warn('Directory picker cancelled or error:', e);
      }
      return false;
    }
  }

  async saveSessionToDir(dirHandle, sessionId, payload) {
    if (!dirHandle) return;
    try {
      // 1. Write JSON
      const jsonFileHandle = await dirHandle.getFileHandle(`${sessionId}.json`, { create: true });
      const jsonWritable = await jsonFileHandle.createWritable();
      await jsonWritable.write(JSON.stringify(payload, null, 2));
      await jsonWritable.close();

      // 2. Write TXT
      const txtFileHandle = await dirHandle.getFileHandle(`${sessionId}.txt`, { create: true });
      const txtWritable = await txtFileHandle.createWritable();
      await txtWritable.write(this.getFormattedTextLog(payload));
      await txtWritable.close();

      console.log(`✓ GameLogger: Automatically saved ${sessionId}.json and .txt directly to folder "${dirHandle.name}"`);
    } catch (err) {
      console.warn('saveSessionToDir failed:', err);
    }
  }

  getLastSavedSession() {
    if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') return null;
    try {
      const raw = localStorage.getItem('kungfu_last_game_log');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  setEnabled(val) {
    this.enabled = !!val;
    if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
      localStorage.setItem('kungfu_debug_console', this.enabled ? 'true' : 'false');
    }
    this.log('SYSTEM', `Game Logger & Debug Console ${this.enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  getFormattedTextLog(customSession = null) {
    const isCustom = customSession && customSession.logs;
    const stats = isCustom ? customSession.stats : this.sessionStats;
    const logs = isCustom ? customSession.logs : this.logs;
    const headerTitle = isCustom ? 'SAVED GAME LOG (LAST GAME)' : 'CURRENT GAME LOG';

    let out = `========================================================\n`;
    out += `  KUNG-FU RETRO BRAWLER - ${headerTitle}\n`;
    out += `========================================================\n`;
    out += `Time: ${new Date().toLocaleString()}\n`;
    out += `Fighter: ${stats.playerCharacter || 'N/A'} | Mode: ${stats.gameMode || 'N/A'} | Difficulty: ${stats.difficulty || 'N/A'}\n`;
    out += `Companion: ${stats.companionEnabled ? (stats.companionCharacter || 'ACTIVE') : 'OFF'}\n`;
    out += `Final Score: ${stats.score || 0} | Slain: ${stats.enemiesSlain || 0} | Max Combo: x${stats.highestCombo || 0}\n`;
    out += `Player Hits: ${stats.playerHitsLanded || 0} | AI Companion Hits: ${stats.companionHitsLanded || 0}\n`;
    out += `End Reason: ${stats.endReason || 'IN PROGRESS'} | Total Log Events: ${logs.length}\n`;
    out += `--------------------------------------------------------\n\n`;

    logs.forEach(l => {
      let dataStr = '';
      if (l.data) {
        try { dataStr = ' ' + JSON.stringify(l.data); } catch (e) {}
      }
      out += `${l.time} [${l.category.padEnd(9)}] ${l.message}${dataStr}\n`;
    });

    return out;
  }

  exportJSON(customSession = null, customFilename = null) {
    let session = customSession;
    if (typeof customSession === 'string') {
      session = this.getSessionById(customSession);
    }
    const isCustom = session && session.logs;
    const payload = isCustom ? session : {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      stats: this.sessionStats,
      logs: this.logs
    };

    const fname = customFilename || (payload.id ? `${payload.id}.json` : `kungfu_log_${Date.now()}.json`);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    this.downloadBlob(blob, fname);
  }

  exportTXT(customSession = null, customFilename = null) {
    let session = customSession;
    if (typeof customSession === 'string') {
      session = this.getSessionById(customSession);
    }
    const fname = customFilename || ((session && session.id) ? `${session.id}.txt` : `kungfu_log_${Date.now()}.txt`);
    const text = this.getFormattedTextLog(session);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    this.downloadBlob(blob, fname);
  }

  async copyToClipboard(customSession = null) {
    let session = customSession;
    if (typeof customSession === 'string') {
      session = this.getSessionById(customSession);
    }
    const text = this.getFormattedTextLog(session);
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        return this.fallbackCopy(text);
      }
    } else {
      return this.fallbackCopy(text);
    }
  }

  fallbackCopy(text) {
    if (typeof document === 'undefined') return false;
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch (e) {
      document.body.removeChild(ta);
      return false;
    }
  }

  downloadBlob(blob, filename) {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ==========================================
  // UI & MODAL CONTROLLERS (CONSOLE & FOLDER)
  // ==========================================
  setupUI() {
    // 1. Debug Console Modal Setup
    const modal = document.getElementById('debug-console-modal');
    if (modal) {
      const footerBtn = document.getElementById('toggle-debug-btn');
      if (footerBtn) {
        footerBtn.addEventListener('click', () => this.toggleConsole());
      }

      const closeBtn = document.getElementById('close-debug-console-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closeConsole());
      }

      const settingsToggleBtn = document.getElementById('toggle-logger-active-btn');
      if (settingsToggleBtn) {
        settingsToggleBtn.addEventListener('click', () => {
          this.setEnabled(!this.enabled);
          this.updateSettingsToggleUI();
        });
        this.updateSettingsToggleUI();
      }

      const filterBtns = modal.querySelectorAll('.dbg-filter-btn');
      filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          filterBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.activeFilter = btn.dataset.filter || 'ALL';
          this.renderAllLogsToUI();
        });
      });

      const searchInput = document.getElementById('dbg-search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.searchQuery = e.target.value.toLowerCase().trim();
          this.renderAllLogsToUI();
        });
      }

      const scrollBtn = document.getElementById('dbg-autoscroll-btn');
      if (scrollBtn) {
        scrollBtn.addEventListener('click', () => {
          this.autoScroll = !this.autoScroll;
          scrollBtn.classList.toggle('active', this.autoScroll);
          scrollBtn.innerText = `AUTO-SCROLL: ${this.autoScroll ? 'ON' : 'OFF'}`;
        });
      }

      const copyBtn = document.getElementById('dbg-copy-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
          const session = this.currentViewedSessionId
            ? this.getSessionById(this.currentViewedSessionId)
            : (this.viewingLastSaved ? this.getLastSavedSession() : null);
          const ok = await this.copyToClipboard(session);
          const originalText = copyBtn.innerText;
          copyBtn.innerText = ok ? '✓ COPIED!' : 'FAIL';
          copyBtn.style.background = ok ? '#00ff66' : '#ff2a6d';
          copyBtn.style.color = '#000';
          setTimeout(() => {
            copyBtn.innerText = originalText;
            copyBtn.style.background = '';
            copyBtn.style.color = '';
          }, 1800);
        });
      }

      const exportJsonBtn = document.getElementById('dbg-export-json-btn');
      if (exportJsonBtn) {
        exportJsonBtn.addEventListener('click', () => {
          const session = this.currentViewedSessionId
            ? this.getSessionById(this.currentViewedSessionId)
            : (this.viewingLastSaved ? this.getLastSavedSession() : null);
          this.exportJSON(session);
        });
      }

      const exportTxtBtn = document.getElementById('dbg-export-txt-btn');
      if (exportTxtBtn) {
        exportTxtBtn.addEventListener('click', () => {
          const session = this.currentViewedSessionId
            ? this.getSessionById(this.currentViewedSessionId)
            : (this.viewingLastSaved ? this.getLastSavedSession() : null);
          this.exportTXT(session);
        });
      }

      const viewLastBtn = document.getElementById('dbg-view-last-btn');
      if (viewLastBtn) {
        viewLastBtn.addEventListener('click', () => {
          const last = this.getLastSavedSession();
          if (!last) {
            alert('No previous game session log found in storage yet. Complete a game first!');
            return;
          }
          this.currentViewedSessionId = null;
          this.viewingLastSaved = !this.viewingLastSaved;
          viewLastBtn.classList.toggle('active', this.viewingLastSaved);
          viewLastBtn.innerText = this.viewingLastSaved ? '◀ BACK TO CURRENT SESSION' : 'VIEW LAST SAVED GAME LOG';
          this.renderAllLogsToUI();
        });
      }

      // Open Folder Modal from Debug Console Footer
      const openFolderFromDbgBtn = document.getElementById('dbg-open-folder-btn');
      if (openFolderFromDbgBtn) {
        openFolderFromDbgBtn.addEventListener('click', () => {
          this.closeConsole();
          this.openFolderModal();
        });
      }

      const clearBtn = document.getElementById('dbg-clear-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          if (confirm('Clear current in-memory log entries?')) {
            this.logs = [];
            this.renderAllLogsToUI();
          }
        });
      }

      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeConsole();
      });
    }

    // 2. Logs Folder Modal Setup
    const folderModal = document.getElementById('logs-folder-modal');
    if (folderModal) {
      const openFolderBtn = document.getElementById('open-logs-folder-btn');
      if (openFolderBtn) {
        openFolderBtn.addEventListener('click', () => this.openFolderModal());
      }

      const settingsFolderBtn = document.getElementById('settings-open-folder-btn');
      if (settingsFolderBtn) {
        settingsFolderBtn.addEventListener('click', () => {
          const settingsModal = document.getElementById('settings-modal');
          if (settingsModal) settingsModal.classList.add('hidden');
          this.openFolderModal();
        });
      }

      const closeFolderBtn = document.getElementById('close-logs-folder-btn');
      if (closeFolderBtn) {
        closeFolderBtn.addEventListener('click', () => this.closeFolderModal());
      }

      const linkFolderBtn = document.getElementById('link-logs-folder-btn');
      if (linkFolderBtn) {
        linkFolderBtn.addEventListener('click', () => this.selectLocalLogsFolder());
      }

      const toggleDlBtn = document.getElementById('toggle-auto-download-btn');
      if (toggleDlBtn) {
        toggleDlBtn.addEventListener('click', () => {
          this.autoDownloadFiles = !this.autoDownloadFiles;
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('kungfu_auto_download_files', this.autoDownloadFiles ? 'true' : 'false');
          }
          this.updateFolderSettingsUI();
        });
        this.updateFolderSettingsUI();
      }

      const clearAllBtn = document.getElementById('folder-clear-all-btn');
      if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
          if (confirm('Are you sure you want to permanently delete ALL saved game logs from the archive?')) {
            this.clearAllSessions();
          }
        });
      }

      const searchFolderInput = document.getElementById('folder-search-input');
      if (searchFolderInput) {
        searchFolderInput.addEventListener('input', () => this.renderFolderModalUI());
      }

      folderModal.addEventListener('click', (e) => {
        if (e.target === folderModal) this.closeFolderModal();
      });
    }

    // Global Key Shortcut (Backquote or Ctrl+L)
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Backquote' || (e.code === 'KeyL' && e.ctrlKey)) {
        e.preventDefault();
        this.toggleConsole();
      } else if (e.code === 'Escape') {
        if (this.isOpen) this.closeConsole();
        if (this.isFolderOpen) this.closeFolderModal();
      }
    });
  }

  updateFolderSettingsUI() {
    const btn = document.getElementById('toggle-auto-download-btn');
    if (!btn) return;
    btn.classList.toggle('active', this.autoDownloadFiles);
    btn.innerText = `AUTO-DOWNLOAD ON GAME OVER: ${this.autoDownloadFiles ? 'ON' : 'OFF'}`;
  }

  updateSettingsToggleUI() {
    const btn = document.getElementById('toggle-logger-active-btn');
    if (!btn) return;
    btn.classList.toggle('active', this.enabled);
    const title = btn.querySelector('.opt-title');
    const desc = btn.querySelector('.opt-desc');
    if (title) title.innerText = `LOG & DEBUG CONSOLE: ${this.enabled ? 'ON' : 'OFF'}`;
    if (desc) desc.innerText = this.enabled ? 'Automatically records all game events and saves to storage' : 'Logging paused for minimal overhead';
  }

  openConsole(viewLast = false, sessionId = null) {
    const modal = document.getElementById('debug-console-modal');
    if (!modal) return;
    this.isOpen = true;
    this.viewingLastSaved = !!viewLast || !!sessionId;
    this.currentViewedSessionId = sessionId;
    modal.classList.remove('hidden');

    const viewLastBtn = document.getElementById('dbg-view-last-btn');
    if (viewLastBtn) {
      viewLastBtn.classList.toggle('active', this.viewingLastSaved);
      viewLastBtn.innerText = this.viewingLastSaved ? '◀ BACK TO CURRENT SESSION' : 'VIEW LAST SAVED GAME LOG';
    }

    this.renderAllLogsToUI();
  }

  closeConsole() {
    const modal = document.getElementById('debug-console-modal');
    if (!modal) return;
    this.isOpen = false;
    modal.classList.add('hidden');
  }

  toggleConsole() {
    if (this.isOpen) {
      this.closeConsole();
    } else {
      this.openConsole();
    }
  }

  openFolderModal() {
    const modal = document.getElementById('logs-folder-modal');
    if (!modal) return;
    this.isFolderOpen = true;
    modal.classList.remove('hidden');
    this.renderFolderModalUI();
  }

  closeFolderModal() {
    const modal = document.getElementById('logs-folder-modal');
    if (!modal) return;
    this.isFolderOpen = false;
    modal.classList.add('hidden');
  }

  toggleFolderModal() {
    if (this.isFolderOpen) {
      this.closeFolderModal();
    } else {
      this.openFolderModal();
    }
  }

  loadSessionToConsole(sessionId) {
    this.closeFolderModal();
    this.openConsole(true, sessionId);
  }

  renderFolderModalUI() {
    const container = document.getElementById('folder-session-list');
    const countBadge = document.getElementById('folder-total-count');
    const dirStatus = document.getElementById('folder-dir-status');
    const searchInput = document.getElementById('folder-search-input');
    if (!container) return;

    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const index = this.getLogFolderIndex();

    if (countBadge) countBadge.textContent = `${index.length} SESSIONS SAVED`;
    if (dirStatus) {
      if (this.dirHandle) {
        dirStatus.textContent = `📁 DIRECT DISK SYNC: "${this.dirHandle.name}" (Auto-Writing .json & .txt)`;
        dirStatus.className = 'folder-status-badge linked';
      } else {
        dirStatus.textContent = '📁 STORAGE: BROWSER ARCHIVE (Link folder for direct disk saving)';
        dirStatus.className = 'folder-status-badge storage';
      }
    }

    const filtered = index.filter(item => {
      if (!query) return true;
      const full = `${item.id} ${item.savedAt} ${item.reason} ${item.character} ${item.mode} ${item.difficulty}`.toLowerCase();
      return full.includes(query);
    });

    container.innerHTML = '';

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'folder-empty-state';
      empty.innerHTML = `
        <div class="empty-icon">📂</div>
        <div class="empty-title">NO SAVED GAME LOGS FOUND</div>
        <div class="empty-desc">Games are automatically logged and saved here each time you finish or game over! Start a brawl or switch on Auto-Play to generate logs.</div>
      `;
      container.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    filtered.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = `folder-session-card ${item.reason === 'VICTORY' ? 'card-victory' : 'card-gameover'}`;

      const dateStr = item.savedAt ? new Date(item.savedAt).toLocaleString() : 'Recent Game';
      const isVictory = item.reason === 'VICTORY';

      card.innerHTML = `
        <div class="card-left">
          <div class="card-title-row">
            <span class="card-outcome-tag ${isVictory ? 'tag-victory' : 'tag-gameover'}">${isVictory ? '🏆 VICTORY' : '💀 ' + (item.reason || 'GAMEOVER')}</span>
            <span class="card-session-id">${item.id}</span>
            <span class="card-date">${dateStr}</span>
          </div>
          <div class="card-stats-row">
            <span>Fighter: <b>${(item.character || 'smellu').toUpperCase()}</b></span>
            <span>Mode: <b>${item.mode || 'HORIZONTAL'}</b></span>
            <span>Score: <b class="score-hl">${(item.finalScore || 0).toLocaleString()}</b></span>
            <span>KOs: <b>${item.enemiesSlain || 0}</b></span>
            <span>Hits: <b>P:${item.playerHitsLanded || 0} / AI:${item.companionHitsLanded || 0}</b></span>
            <span>Combo: <b>x${item.highestCombo || 0}</b></span>
            <span>Time: <b>${item.durationSeconds ? item.durationSeconds + 's' : 'N/A'}</b></span>
            <span>Events: <b>${item.logCount || 0}</b></span>
          </div>
        </div>
        <div class="card-actions">
          <button class="arcade-btn btn-view" title="Inspect log in console">👁️ VIEW</button>
          <button class="arcade-btn btn-json" title="Download .json file">💾 JSON</button>
          <button class="arcade-btn btn-txt" title="Download .txt report">📄 TXT</button>
          <button class="arcade-btn btn-del" title="Delete from archive">🗑️</button>
        </div>
      `;

      // Wire row actions
      card.querySelector('.btn-view').addEventListener('click', () => {
        this.loadSessionToConsole(item.id);
      });
      card.querySelector('.btn-json').addEventListener('click', () => {
        this.exportJSON(item.id, `${item.id}.json`);
      });
      card.querySelector('.btn-txt').addEventListener('click', () => {
        this.exportTXT(item.id, `${item.id}.txt`);
      });
      card.querySelector('.btn-del').addEventListener('click', () => {
        if (confirm(`Delete log session "${item.id}"?`)) {
          this.deleteSessionById(item.id);
        }
      });

      fragment.appendChild(card);
    });

    container.appendChild(fragment);
  }

  renderAllLogsToUI() {
    const container = document.getElementById('dbg-log-stream');
    const statsContainer = document.getElementById('dbg-stats-banner');
    if (!container) return;

    let sourceData = null;
    if (this.currentViewedSessionId) {
      sourceData = this.getSessionById(this.currentViewedSessionId);
    } else if (this.viewingLastSaved) {
      sourceData = this.getLastSavedSession();
    } else {
      sourceData = { stats: this.sessionStats, logs: this.logs };
    }

    const logs = (sourceData && sourceData.logs) ? sourceData.logs : [];
    const stats = (sourceData && sourceData.stats) ? sourceData.stats : this.sessionStats;

    // Update stats banner
    if (statsContainer) {
      let modeLabel = '[LIVE ACTIVE SESSION]';
      if (this.currentViewedSessionId) {
        modeLabel = `[ARCHIVED LOG: ${this.currentViewedSessionId}]`;
      } else if (this.viewingLastSaved) {
        modeLabel = `[LAST SAVED LOG - ${stats.endReason || 'COMPLETE'}]`;
      }

      statsContainer.innerHTML = `
        <span class="dbg-stat-tag ${this.viewingLastSaved ? 'saved' : 'live'}">${modeLabel}</span>
        <span>SCORE: <b>${(stats.score || 0).toLocaleString()}</b></span>
        <span>KOs: <b>${stats.enemiesSlain || 0}</b></span>
        <span>HITS: <b>P:${stats.playerHitsLanded || 0} / AI:${stats.companionHitsLanded || 0}</b></span>
        <span>MAX COMBO: <b>x${stats.highestCombo || 0}</b></span>
        <span>EVENTS: <b>${logs.length}</b></span>
      `;
    }

    container.innerHTML = '';

    const filtered = logs.filter(entry => {
      if (this.activeFilter !== 'ALL' && entry.category !== this.activeFilter) return false;
      if (this.searchQuery) {
        const text = `${entry.time} ${entry.category} ${entry.message} ${JSON.stringify(entry.data || '')}`.toLowerCase();
        if (!text.includes(this.searchQuery)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'dbg-empty';
      empty.textContent = 'No matching log entries found.';
      container.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    filtered.forEach(entry => {
      const row = this.createLogRowElement(entry);
      fragment.appendChild(row);
    });
    container.appendChild(fragment);

    if (this.autoScroll) {
      container.scrollTop = container.scrollHeight;
    }
  }

  appendLogEntryToUI(entry) {
    const container = document.getElementById('dbg-log-stream');
    if (!container) return;

    if (this.activeFilter !== 'ALL' && entry.category !== this.activeFilter) return;
    if (this.searchQuery) {
      const text = `${entry.time} ${entry.category} ${entry.message}`.toLowerCase();
      if (!text.includes(this.searchQuery)) return;
    }

    const row = this.createLogRowElement(entry);
    container.appendChild(row);

    if (this.autoScroll) {
      container.scrollTop = container.scrollHeight;
    }
  }

  createLogRowElement(entry) {
    const row = document.createElement('div');
    row.className = `dbg-log-row cat-${entry.category.toLowerCase()}`;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'dbg-time';
    timeSpan.textContent = entry.time;

    const catSpan = document.createElement('span');
    catSpan.className = `dbg-cat cat-tag-${entry.category.toLowerCase()}`;
    catSpan.textContent = `[${entry.category}]`;

    const msgSpan = document.createElement('span');
    msgSpan.className = 'dbg-msg';
    msgSpan.textContent = entry.message;

    row.appendChild(timeSpan);
    row.appendChild(catSpan);
    row.appendChild(msgSpan);

    if (entry.data) {
      const dataSpan = document.createElement('span');
      dataSpan.className = 'dbg-data';
      dataSpan.textContent = JSON.stringify(entry.data);
      row.appendChild(dataSpan);
    }

    return row;
  }
}

// Global Singleton
if (typeof window !== 'undefined') {
  window.GameLogger = GameLogger;
  window.gameLogger = new GameLogger();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GameLogger };
}
