let lectureStart = null;
let missedPoints = [];

function setNow() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  document.getElementById("startTime").value = `${hh}:${mm}`;
  lectureStart = new Date();
  lectureStart.setHours(hh, mm, ss, 0);
  document.getElementById("displayStart").innerText =
    "⏱ Start: " + hh + ":" + mm + ":" + ss;
}

function getStartTime() {
  if (!lectureStart) {
    const val = document.getElementById("startTime").value;
    if (!val) {
      alert("Please set start time first");
      return null;
    }
    const [hh, mm] = val.split(":");
    lectureStart = new Date();
    lectureStart.setHours(hh, mm, 0, 0);
  }
  return lectureStart;
}

function formatTime(sec) {
  const h = String(Math.floor(sec / 3600)).padStart(2, "0");
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function markStart() {
  const subject = document.getElementById("subject").value.trim();
  if (!subject) {
    alert("Enter subject name");
    return;
  }
  const startBase = getStartTime();
  if (!startBase) return;

  const now = new Date();
  const diff = Math.floor((now - startBase) / 1000);
  const absTime = formatTime(diff);

  missedPoints.push({ subject, start: absTime, end: null });
  renderList();
}

function markEnd() {
  if (missedPoints.length === 0) {
    alert("Mark a start point first!");
    return;
  }
  const startBase = getStartTime();
  if (!startBase) return;

  const now = new Date();
  const diff = Math.floor((now - startBase) / 1000);
  const absTime = formatTime(diff);

  let last = missedPoints[missedPoints.length - 1];
  if (!last.end) {
    last.end = absTime;

    // Calculate duration
    const [sh, sm, ss] = last.start.split(":").map(Number);
    const [eh, em, es] = last.end.split(":").map(Number);
    const startSecs = sh * 3600 + sm * 60 + ss;
    const endSecs = eh * 3600 + em * 60 + es;
    const dur = endSecs - startSecs;
    last.duration = formatTime(dur);
  }
  renderList();
}

function renderList() {
  const ul = document.getElementById("output");
  ul.innerHTML = "";
  missedPoints.forEach((p) => {
    let text = `${p.subject} → ${p.start}`;
    if (p.end) {
      text += ` - ${p.end} [${p.duration}]`;
    }
    const li = document.createElement("li");
    li.innerText = text;
    ul.appendChild(li);
  });
}
