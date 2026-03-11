const API = 'http://localhost:3000/api';
let staffList = [];
let todayAttendance = {};

const today = new Date().toISOString().split('T')[0];
document.getElementById('attendanceDate').value = today;
document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-IN', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});
document.getElementById('reportMonth').value = today.substring(0, 7);

function isSunday(dateStr) {
  return new Date(dateStr).getDay() === 0;
}

function getWorkingDays(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  let working = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month - 1, d).getDay();
    if (day !== 0) working++;
  }
  return working;
}

function showTab(name, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  el.classList.add('active');
  if (name === 'attendance') loadAttendanceForDate();
}

// ─── STAFF ───────────────────────────────────────────
async function loadStaff() {
  const res = await fetch(`${API}/staff`);
  staffList = await res.json();
  renderStaffTable();
}

function renderStaffTable() {
  const tbody = document.getElementById('staffTable');
  if (!staffList.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">No staff added yet</td></tr>';
    return;
  }
  tbody.innerHTML = staffList.map((s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${s.name}</strong></td>
      <td>${s.role}</td>
      <td>₹${s.monthlySalary.toLocaleString('en-IN')}</td>
      <td>
        <button class="success" onclick="openModal('${s._id}')">💰 Manage</button>
        <button class="danger" onclick="deleteStaff('${s._id}')">Remove</button>
      </td>
    </tr>
  `).join('');
}

async function addStaff() {
  const name = document.getElementById('staffName').value.trim();
  const role = document.getElementById('staffRole').value.trim();
  const monthlySalary = document.getElementById('staffSalary').value;
  if (!name || !role || !monthlySalary) return alert('Please fill all fields');

  await fetch(`${API}/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, role, monthlySalary: Number(monthlySalary) })
  });

  document.getElementById('staffName').value = '';
  document.getElementById('staffRole').value = '';
  document.getElementById('staffSalary').value = '';
  loadStaff();
}

async function deleteStaff(id) {
  if (!confirm('Remove this staff member?')) return;
  await fetch(`${API}/staff/${id}`, { method: 'DELETE' });
  loadStaff();
}

// ─── MODAL ───────────────────────────────────────────
let currentModalStaffId = null;

function openModal(id) {
  const staff = staffList.find(s => s._id === id);
  if (!staff) return;
  currentModalStaffId = id;
  document.getElementById('modalName').textContent = staff.name;
  document.getElementById('modalAdvance').value = staff.advance || 0;
  document.getElementById('modalBonus').value = staff.bonus || 0;
  document.getElementById('modalFine').value = staff.fine || 0;
  document.getElementById('modalPaid').value = staff.paidAmount || 0;
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  currentModalStaffId = null;
}

async function saveModal() {
  const advance = Number(document.getElementById('modalAdvance').value) || 0;
  const bonus = Number(document.getElementById('modalBonus').value) || 0;
  const fine = Number(document.getElementById('modalFine').value) || 0;
  const paidAmount = Number(document.getElementById('modalPaid').value) || 0;

  await fetch(`${API}/staff/${currentModalStaffId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ advance, bonus, fine, paidAmount })
  });

  closeModal();
  loadStaff();
}

// ─── ATTENDANCE ───────────────────────────────────────
async function loadAttendanceForDate() {
  const date = document.getElementById('attendanceDate').value;
  if (!date) return;

  todayAttendance = {};
  const month = date.substring(0, 7);
  const res = await fetch(`${API}/attendance/month/${month}`);
  const records = await res.json();

  records.forEach(r => {
    if (r.date === date && r.staffId) {
      todayAttendance[r.staffId._id] = r.status;
    }
  });

  // Auto mark Sunday as Holiday
  if (isSunday(date)) {
    for (const s of staffList) {
      if (!todayAttendance[s._id]) {
        await markAttendance(s._id, date, 'Holiday', true);
        todayAttendance[s._id] = 'Holiday';
      }
    }
  }

  renderAttendanceGrid(date);
}

function renderAttendanceGrid(date) {
  const grid = document.getElementById('attendanceGrid');
  if (!staffList.length) {
    grid.innerHTML = '<div class="empty">Add staff members first from the Staff tab</div>';
    return;
  }

  const sunday = isSunday(date);

  grid.innerHTML = staffList.map(s => {
    const status = todayAttendance[s._id] || null;
    return `
      <div class="staff-card">
        <div class="staff-name">${s.name}</div>
        <div class="staff-role">${s.role} • ₹${s.monthlySalary.toLocaleString('en-IN')}/mo</div>
        ${sunday ? '<div class="sunday-label">🔵 Sunday — auto Holiday</div>' : ''}
        <div class="status-buttons">
          <button class="status-btn ${status === 'Present' ? 'selected-present' : ''}"
            onclick="markAttendance('${s._id}', '${date}', 'Present')">✅ Present</button>
          <button class="status-btn ${status === 'Half Day' ? 'selected-halfday' : ''}"
            onclick="markAttendance('${s._id}', '${date}', 'Half Day')">🌓 Half</button>
          <button class="status-btn ${status === 'Absent' ? 'selected-absent' : ''}"
            onclick="markAttendance('${s._id}', '${date}', 'Absent')">❌ Absent</button>
          <button class="status-btn ${status === 'Holiday' ? 'selected-holiday' : ''}"
            onclick="markAttendance('${s._id}', '${date}', 'Holiday')">🏖️ Holiday</button>
        </div>
      </div>
    `;
  }).join('');
}

async function markAttendance(staffId, date, status, silent = false) {
  await fetch(`${API}/attendance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staffId, date, status })
  });
  if (!silent) {
    todayAttendance[staffId] = status;
    renderAttendanceGrid(date);
  }
}

// ─── REPORT ───────────────────────────────────────────
async function generateReport() {
  const month = document.getElementById('reportMonth').value;
  if (!month) return alert('Select a month');

  const res = await fetch(`${API}/attendance/month/${month}`);
  const records = await res.json();

  const [year, mon] = month.split('-').map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const workingDays = getWorkingDays(year, mon);

  // Get all Sundays in this month
  const sundaysInMonth = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, mon - 1, d);
    if (date.getDay() === 0) {
      sundaysInMonth.push(`${month}-${String(d).padStart(2, '0')}`);
    }
  }

  const reportData = staffList.map(s => {
    const sRecords = records.filter(r => r.staffId && r.staffId._id === s._id);
    const present = sRecords.filter(r => r.status === 'Present').length;
    const halfDay = sRecords.filter(r => r.status === 'Half Day').length;
    const absent = sRecords.filter(r => r.status === 'Absent').length;

    // Count DB holidays
    const dbHolidays = sRecords.filter(r => r.status === 'Holiday').map(r => r.date);

    // Add Sundays not already counted in DB
    const extraSundays = sundaysInMonth.filter(d => !dbHolidays.includes(d)).length;
    const holiday = dbHolidays.length + extraSundays;

    const effectiveDays = present + (halfDay * 0.5) + holiday;
    const salaryEarned = Math.round((effectiveDays / workingDays) * s.monthlySalary);
    const advance = s.advance || 0;
    const bonus = s.bonus || 0;
    const fine = s.fine || 0;
    const paidAmount = s.paidAmount || 0;
    const netPayable = salaryEarned + bonus - advance - fine - paidAmount;

    return { ...s, present, halfDay, absent, holiday, effectiveDays, salaryEarned, advance, bonus, fine, paidAmount, netPayable, workingDays };
  });

  const totalNet = reportData.reduce((sum, s) => sum + s.netPayable, 0);

  document.getElementById('statStaff').textContent = staffList.length;
  document.getElementById('statWorkingDays').textContent = workingDays;
  document.getElementById('statNet').textContent = '₹' + totalNet.toLocaleString('en-IN');
  document.getElementById('reportStats').style.display = 'flex';

  const tbody = document.getElementById('reportTable');
  if (!reportData.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty">No staff found</td></tr>';
    return;
  }

  tbody.innerHTML = reportData.map(s => `
    <tr>
      <td><strong>${s.name}</strong></td>
      <td>${s.role}</td>
      <td><span class="badge present">${s.present}</span></td>
      <td><span class="badge halfday">${s.halfDay}</span></td>
      <td><span class="badge holiday">${s.holiday}</span></td>
      <td><span class="badge absent">${s.absent}</span></td>
      <td>₹${s.salaryEarned.toLocaleString('en-IN')}</td>
      <td class="deduction">
        ${s.advance ? `Adv: ₹${s.advance.toLocaleString('en-IN')}<br>` : ''}
        ${s.fine ? `Fine: ₹${s.fine.toLocaleString('en-IN')}<br>` : ''}
        ${s.bonus ? `<span style="color:#28a745">Bonus: +₹${s.bonus.toLocaleString('en-IN')}</span><br>` : ''}
        ${s.paidAmount ? `Paid: ₹${s.paidAmount.toLocaleString('en-IN')}` : ''}
        ${!s.advance && !s.fine && !s.bonus && !s.paidAmount ? '—' : ''}
      </td>
      <td class="net-payable">₹${s.netPayable.toLocaleString('en-IN')}</td>
    </tr>
  `).join('');
}

loadStaff();