// Minimal, mobile-first behavior
(() => {
  const startInput = document.getElementById('startInput');
  const setStartBtn = document.getElementById('setStartBtn');
  const nowBtn = document.getElementById('nowBtn');
  const startDisplay = document.getElementById('startDisplay');

  const missInput = document.getElementById('missInput');
  const addBtn = document.getElementById('addBtn');

  const entriesEl = document.getElementById('entries');
  const emptyEl = document.getElementById('empty');
  const copyAllBtn = document.getElementById('copyAll');
  const clearAllBtn = document.getElementById('clearAll');

  let startDate = null; // Date object for lecture start, or null
  let entries = []; // {id, raw, type, offsetStartSec, offsetEndSec, absStart, absEnd}

  /* ---------- helpers ---------- */
  function pad(n){ return n.toString().padStart(2,'0'); }
  function fmtTimeFromDate(d){
    if(!d) return '--:--:--';
    return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }
  function nowAsHHMMSS(){
    const d = new Date();
    return fmtTimeFromDate(d);
  }
  function parseStartInputToDate(s){
    if(!s) return null;
    s = s.trim();
    const m = s.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
    if(!m) return null;
    let hh = parseInt(m[1],10), mm = parseInt(m[2],10), ss = parseInt(m[3]||'0',10);
    if(hh>23 || mm>59 || ss>59) return null;
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate(), hh, mm, ss);
  }
  function parseTimeStringToSeconds(s){
    if(!s) return null;
    s = s.trim();
    const parts = s.split(':').map(p => p.trim());
    if(parts.length === 1){
      const sec = parseInt(parts[0],10);
      return isNaN(sec) ? null : sec;
    } else if(parts.length === 2){
      const mm = parseInt(parts[0],10), ss = parseInt(parts[1],10);
      if(isNaN(mm)||isNaN(ss)) return null;
      return mm*60 + ss;
    } else if(parts.length === 3){
      const hh = parseInt(parts[0],10), mm = parseInt(parts[1],10), ss = parseInt(parts[2],10);
      if(isNaN(hh)||isNaN(mm)||isNaN(ss)) return null;
      return hh*3600 + mm*60 + ss;
    } else return null;
  }
  function formatOffset(sec){
    sec = Math.floor(sec);
    if(sec>=3600){
      const h=Math.floor(sec/3600), m=Math.floor((sec%3600)/60), s=sec%60;
      return `${h}:${pad(m)}:${pad(s)}`;
    } else {
      const m=Math.floor(sec/60), s=sec%60;
      return `${pad(m)}:${pad(s)}`;
    }
  }

  function parseMissLine(line){
    // Accepts "A - B" or single
    const dash = line.match(/(-|–|—)/);
    if(dash){
      const parts = line.split(/[-–—]/).map(x=>x.trim()).filter(Boolean);
      if(parts.length < 2) return null;
      const s1 = parseTimeStringToSeconds(parts[0]);
      const s2 = parseTimeStringToSeconds(parts[1]);
      if(s1===null || s2===null) return null;
      const start = Math.min(s1,s2), end = Math.max(s1,s2);
      return { type:'range', offsetStartSec:start, offsetEndSec:end };
    } else {
      const s = parseTimeStringToSeconds(line);
      if(s===null) return null;
      return { type:'single', offsetStartSec:s };
    }
  }

  function computeAbsolute(offsetSec){
    if(!startDate) return null;
    return new Date(startDate.getTime() + offsetSec*1000);
  }

  function updateStartDisplay(){
    if(startDate){
      startDisplay.innerHTML = `Start: <span>${fmtTimeFromDate(startDate)}</span>`;
    } else {
      startDisplay.innerHTML = `Start: <span class="muted">Not set</span>`;
    }
  }

  /* ---------- render ---------- */
  function renderEntries(){
    entriesEl.innerHTML = '';
    if(entries.length === 0){
      emptyEl.style.display = 'block';
      return;
    }
    emptyEl.style.display = 'none';
    entries.forEach(item => {
      const li = document.createElement('li');
      li.className = 'entry';

      const left = document.createElement('div'); left.className = 'left';
      const raw = document.createElement('div'); raw.className = 'raw'; raw.textContent = item.raw;
      const abs = document.createElement('div'); abs.className = 'abs';
      if(item.type === 'single'){
        abs.textContent = item.absStart ? fmtTimeFromDate(item.absStart) : formatOffset(item.offsetStartSec);
      } else {
        const s = item.absStart ? fmtTimeFromDate(item.absStart) : formatOffset(item.offsetStartSec);
        const e = item.absEnd ? fmtTimeFromDate(item.absEnd) : formatOffset(item.offsetEndSec);
        abs.textContent = s + '  —  ' + e;
      }
      left.appendChild(raw); left.appendChild(abs);

      const right = document.createElement('div'); right.className = 'right';
      const copyBtn = document.createElement('button'); copyBtn.className = 'small-btn'; copyBtn.textContent = 'Copy';
      copyBtn.addEventListener('click', async () => {
        const txt = item.type === 'single'
          ? (item.absStart ? fmtTimeFromDate(item.absStart) : formatOffset(item.offsetStartSec))
          : ((item.absStart ? fmtTimeFromDate(item.absStart) : formatOffset(item.offsetStartSec)) + ' - ' + (item.absEnd ? fmtTimeFromDate(item.absEnd) : formatOffset(item.offsetEndSec)));
        try { await navigator.clipboard.writeText(txt); copyBtn.textContent = 'Copied'; setTimeout(()=>copyBtn.textContent='Copy',900); }
        catch(e){ alert('Copy failed'); }
      });

      const delBtn = document.createElement('button'); delBtn.className = 'small-btn'; delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => {
        entries = entries.filter(x => x.id !== item.id);
        renderEntries();
      });

      right.appendChild(copyBtn);
      right.appendChild(delBtn);

      li.appendChild(left);
      li.appendChild(right);
      entriesEl.appendChild(li);
    });
  }

  /* ---------- actions ---------- */
  setStartBtn.addEventListener('click', () => {
    const d = parseStartInputToDate(startInput.value);
    if(!d){ alert('Invalid start. Use HH:MM or HH:MM:SS (24-hour).'); return; }
    startDate = d;
    updateStartDisplay();
    // update existing entries absolute times
    entries = entries.map(e => {
      return {
        ...e,
        absStart: computeAbsolute(e.offsetStartSec),
        absEnd: e.type === 'range' ? computeAbsolute(e.offsetEndSec) : null
      };
    });
    renderEntries();
  });

  nowBtn.addEventListener('click', () => {
    const d = new Date();
    // populate input and set start
    startInput.value = fmtTimeFromDate(d);
    startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds());
    updateStartDisplay();
    // update entries
    entries = entries.map(e => {
      return {
        ...e,
        absStart: computeAbsolute(e.offsetStartSec),
        absEnd: e.type === 'range' ? computeAbsolute(e.offsetEndSec) : null
      };
    });
    renderEntries();
  });

  addBtn.addEventListener('click', () => {
    const raw = (missInput.value || '').trim();
    if(!raw){ alert('Enter timestamp or range'); return; }
    const lines = raw.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    let added = 0;
    for(const line of lines){
      const parsed = parseMissLine(line);
      if(!parsed){ alert('Cannot parse: ' + line); continue; }
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
      const item = { id, raw: line, type: parsed.type, offsetStartSec: parsed.offsetStartSec };
      if(parsed.type === 'range') item.offsetEndSec = parsed.offsetEndSec;
      // compute absolutes if start set
      item.absStart = startDate ? computeAbsolute(item.offsetStartSec) : null;
      item.absEnd = (parsed.type === 'range' && startDate) ? computeAbsolute(item.offsetEndSec) : null;
      entries.push(item);
      added++;
    }
    if(added > 0){
      missInput.value = '';
      renderEntries();
    }
  });

  missInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' && !e.shiftKey){
      e.preventDefault();
      addBtn.click();
    }
  });

  copyAllBtn.addEventListener('click', async () => {
    if(entries.length === 0){ alert('Nothing to copy'); return; }
    const lines = entries.map(item => {
      if(item.type === 'single') return item.absStart ? fmtTimeFromDate(item.absStart) : formatOffset(item.offsetStartSec);
      return (item.absStart ? fmtTimeFromDate(item.absStart) : formatOffset(item.offsetStartSec)) + ' - ' + (item.absEnd ? fmtTimeFromDate(item.absEnd) : formatOffset(item.offsetEndSec));
    });
    try { await navigator.clipboard.writeText(lines.join('\n')); alert('All copied'); }
    catch(e){ alert('Copy failed'); }
  });

  clearAllBtn.addEventListener('click', () => {
    if(!confirm('Clear all missed points?')) return;
    entries = [];
    renderEntries();
  });

  /* ---------- init ---------- */
  function init(){
    updateStartDisplay();
    renderEntries();
  }
  init();

})();
