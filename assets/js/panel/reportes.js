/* ProBillar — cierre de caja y exportes */
function closeDailyBox() {
      if (!isAdmin()) {
        alert('Solo el Administrador puede generar el cierre de caja.');
        return;
      }
      const reportContainer = document.getElementById('modal-report-body');
      let totalVentasProductos = 0;
      let totalSecondsAll = dailyTotalSeconds;
      let totalTimeEarnings = dailyTimeEarnings;
      const tableRows = [];

      function formatHoursReadable(totalSec) {
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
        if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
        return `${s}s`;
      }

      tables.forEach(table => {
        let secs = table.totalSecondsToday;
        let earnings = table.totalEarningsToday;
        let sessions = table.sessionsToday;
        let statusNote = '';
        if (table.active) {
          const openSecs = getTableSeconds(table);
          secs += openSecs;
          earnings += (openSecs / 3600) * table.rate;
          totalSecondsAll += openSecs;
          totalTimeEarnings += (openSecs / 3600) * table.rate;
          statusNote = ' (incluye sesión abierta)';
          if (sessions === 0 && openSecs > 0) sessions = 1;
        }
        tableRows.push({
          id: table.numero,
          rate: table.rate,
          seconds: secs,
          hours: secs / 3600,
          earnings: earnings,
          sessions: sessions,
          statusNote: statusNote,
          isOpen: table.active
        });
      });

      const totalHoursDecimal = totalSecondsAll / 3600;
      let html = `
        <p style="margin-bottom: 15px; color: var(--text-muted)">Fecha y hora de cierre: <strong>${new Date().toLocaleString()}</strong></p>
        <p style="margin-bottom: 8px; color: var(--text-muted); font-size: 0.9rem;">Caja BD: <strong>#${currentCajaId ?? '—'}</strong> · Origen: Supabase</p>
        <h4 style="color: var(--accent-gold); margin-bottom: 8px;">⏱️ Horas de Mesas (Detalle por mesa)</h4>
        <table class="inv-table" style="margin-bottom: 20px;">
          <thead>
            <tr>
              <th>Mesa</th><th>Tarifa/h</th><th>Sesiones</th><th>Tiempo total</th>
              <th>Horas (decimal)</th><th>Ingreso ($)</th><th>Estado</th>
            </tr>
          </thead>
          <tbody>
      `;
      tableRows.forEach(row => {
        const statusLabel = row.isOpen
          ? '<span style="color: var(--accent-red); font-weight:600;">Abierta</span>'
          : (row.seconds > 0 ? '<span style="color: var(--accent-green);">Cerrada</span>' : '<span style="color: var(--text-muted);">Sin uso</span>');
        html += `
          <tr>
            <td><strong>Mesa ${row.id}</strong>${row.statusNote}</td>
            <td>$${row.rate.toFixed(2)}</td>
            <td>${row.sessions}</td>
            <td>${formatHoursReadable(row.seconds)}</td>
            <td>${row.hours.toFixed(2)} h</td>
            <td>$${row.earnings.toFixed(2)}</td>
            <td>${statusLabel}</td>
          </tr>`;
      });
      html += `
            <tr style="background: rgba(241, 196, 15, 0.08); font-weight: 700;">
              <td>TOTAL MESAS</td><td></td>
              <td>${tableRows.reduce((s, r) => s + r.sessions, 0)}</td>
              <td>${formatHoursReadable(totalSecondsAll)}</td>
              <td>${totalHoursDecimal.toFixed(2)} h</td>
              <td style="color: var(--accent-gold);">$${totalTimeEarnings.toFixed(2)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
        <h4 style="color: var(--accent-blue); margin-bottom: 8px;">🛒 Detalle de Inventario / Productos</h4>
        <table class="inv-table" style="margin-bottom: 20px;">
          <thead>
            <tr><th>Producto</th><th>Stock Inicial (sesión)</th><th>Vendidos Hoy</th><th>Stock Final (BD)</th><th>Total ($)</th></tr>
          </thead>
          <tbody>
      `;
      inventory.forEach(item => {
        const totalItem = item.soldToday * item.price;
        totalVentasProductos += totalItem;
        html += `
          <tr>
            <td>${item.name}</td>
            <td>${item.initialStock}</td>
            <td><strong>${item.soldToday}</strong></td>
            <td>${item.stock}</td>
            <td>$${totalItem.toFixed(2)}</td>
          </tr>`;
      });
      const grandTotalBox = totalVentasProductos + totalTimeEarnings;
      lastReportData = {
        fechaCierre: new Date().toLocaleString(),
        tarifaHora: null,
        cajaId: currentCajaId,
        mesas: tableRows.map(r => ({
          mesa: r.id,
          tarifa: r.rate,
          sesiones: r.sessions,
          tiempoTotal: formatHoursReadable(r.seconds),
          horasDecimal: Number(r.hours.toFixed(2)),
          ingreso: Number(r.earnings.toFixed(2)),
          estado: r.isOpen ? 'Abierta' : (r.seconds > 0 ? 'Cerrada' : 'Sin uso')
        })),
        totalSesiones: tableRows.reduce((s, r) => s + r.sessions, 0),
        totalTiempo: formatHoursReadable(totalSecondsAll),
        totalHorasDecimal: Number(totalHoursDecimal.toFixed(2)),
        totalIngresoMesas: Number(totalTimeEarnings.toFixed(2)),
        productos: inventory.map(item => ({
          producto: item.name,
          stockInicial: item.initialStock,
          vendidosHoy: item.soldToday,
          stockFinal: item.stock,
          total: Number((item.soldToday * item.price).toFixed(2))
        })),
        totalProductos: Number(totalVentasProductos.toFixed(2)),
        totalGeneral: Number(grandTotalBox.toFixed(2))
      };
      html += `
          </tbody>
        </table>
        <h4 style="color: var(--accent-gold); margin-bottom: 8px;">💰 Resumen Financiero del Día</h4>
        <div style="background: #14171d; padding: 15px; border-radius: 8px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 8px;">
          <div class="summary-row"><span>Total horas de mesas:</span><strong style="color:#fff;">${totalHoursDecimal.toFixed(2)} h (${formatHoursReadable(totalSecondsAll)})</strong></div>
          <div class="summary-row"><span>Alquiler / Tiempo de Mesas:</span><strong style="color:#fff;">$${totalTimeEarnings.toFixed(2)}</strong></div>
          <div class="summary-row"><span>Venta de Productos / Consumos:</span><strong style="color:#fff;">$${totalVentasProductos.toFixed(2)}</strong></div>
          <div class="summary-row total" style="margin-top:5px;"><span>TOTAL GENERAL RECAUDADO:</span><span style="color:var(--accent-green);">$${grandTotalBox.toFixed(2)}</span></div>
        </div>
        <p style="margin-top: 12px; font-size: 0.8rem; color: var(--text-muted);">* Datos de mesas/productos/tarifas leídos desde Supabase. Las mesas abiertas incluyen el tiempo hasta ahora.</p>
      `;
      reportContainer.innerHTML = html;
      document.getElementById('close-box-modal').style.display = 'flex';
    }


    function escapeCsv(value) {
      const str = String(value ?? '');
      if (/[",\n\r]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
      return str;
    }


    function buildReportCsv() {
      if (!lastReportData) return null;
      const d = lastReportData;
      const lines = [];
      lines.push('REPORTE DE CIERRE DE CAJA - Billar Manager Pro (Supabase)');
      lines.push('Fecha y hora de cierre,' + escapeCsv(d.fechaCierre));
      lines.push('Id caja,' + (d.cajaId ?? ''));
      lines.push('');
      lines.push('HORAS DE MESAS');
      lines.push(['Mesa', 'Tarifa/h', 'Sesiones', 'Tiempo total', 'Horas (decimal)', 'Ingreso ($)', 'Estado'].join(','));
      d.mesas.forEach(m => {
        lines.push([
          'Mesa ' + m.mesa, m.tarifa.toFixed(2), m.sesiones, escapeCsv(m.tiempoTotal),
          m.horasDecimal.toFixed(2), m.ingreso.toFixed(2), escapeCsv(m.estado)
        ].join(','));
      });
      lines.push(['TOTAL MESAS', '', d.totalSesiones, escapeCsv(d.totalTiempo), d.totalHorasDecimal.toFixed(2), d.totalIngresoMesas.toFixed(2), ''].join(','));
      lines.push('');
      lines.push('DETALLE DE INVENTARIO / PRODUCTOS');
      lines.push(['Producto', 'Stock Inicial', 'Vendidos Hoy', 'Stock Final', 'Total ($)'].join(','));
      d.productos.forEach(p => {
        lines.push([escapeCsv(p.producto), p.stockInicial, p.vendidosHoy, p.stockFinal, p.total.toFixed(2)].join(','));
      });
      lines.push('');
      lines.push('RESUMEN FINANCIERO');
      lines.push('Total horas de mesas,' + d.totalHorasDecimal.toFixed(2));
      lines.push('Alquiler / Tiempo de Mesas ($),' + d.totalIngresoMesas.toFixed(2));
      lines.push('Venta de Productos ($),' + d.totalProductos.toFixed(2));
      lines.push('TOTAL GENERAL RECAUDADO ($),' + d.totalGeneral.toFixed(2));
      return lines.join('\r\n');
    }


    function downloadBlob(content, filename, mime) {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }


    function getReportFileBaseName() {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const h = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      return `cierre_caja_${y}${m}${day}_${h}${min}`;
    }


    function exportReportCSV() {
      if (!lastReportData) { alert('Primero genera el reporte con Cierre de Caja.'); return; }
      downloadBlob('\uFEFF' + buildReportCsv(), getReportFileBaseName() + '.csv', 'text/csv;charset=utf-8;');
    }


    function exportReportExcel() {
      if (!lastReportData) { alert('Primero genera el reporte con Cierre de Caja.'); return; }
      const d = lastReportData;
      let mesasRows = d.mesas.map(m => `
        <tr>
          <td>Mesa ${m.mesa}</td><td>${m.tarifa.toFixed(2)}</td><td>${m.sesiones}</td>
          <td>${m.tiempoTotal}</td><td>${m.horasDecimal.toFixed(2)}</td>
          <td>${m.ingreso.toFixed(2)}</td><td>${m.estado}</td>
        </tr>`).join('');
      mesasRows += `
        <tr style="font-weight:bold;background:#FFF2CC;">
          <td>TOTAL MESAS</td><td></td><td>${d.totalSesiones}</td>
          <td>${d.totalTiempo}</td><td>${d.totalHorasDecimal.toFixed(2)}</td>
          <td>${d.totalIngresoMesas.toFixed(2)}</td><td></td>
        </tr>`;
      const productosRows = d.productos.map(p => `
        <tr>
          <td>${p.producto}</td><td>${p.stockInicial}</td><td>${p.vendidosHoy}</td>
          <td>${p.stockFinal}</td><td>${p.total.toFixed(2)}</td>
        </tr>`).join('');
      const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8">
<style>table{border-collapse:collapse;font-family:Arial;font-size:11pt}th,td{border:1px solid #999;padding:6px 10px}th{background:#1a1e26;color:#fff}</style>
</head><body>
<h2>Reporte de Cierre de Caja — Billar Manager Pro (Supabase)</h2>
<p>Fecha: <strong>${d.fechaCierre}</strong> · Caja #<strong>${d.cajaId ?? '—'}</strong></p>
<h3>Horas de Mesas</h3>
<table><thead><tr><th>Mesa</th><th>Tarifa/h</th><th>Sesiones</th><th>Tiempo</th><th>Horas</th><th>Ingreso</th><th>Estado</th></tr></thead>
<tbody>${mesasRows}</tbody></table>
<h3>Productos</h3>
<table><thead><tr><th>Producto</th><th>Stock Inicial</th><th>Vendidos</th><th>Stock Final</th><th>Total</th></tr></thead>
<tbody>${productosRows}</tbody></table>
<h3>Resumen</h3>
<p>Horas: ${d.totalHorasDecimal.toFixed(2)} · Mesas: $${d.totalIngresoMesas.toFixed(2)} · Productos: $${d.totalProductos.toFixed(2)} · <strong>TOTAL: $${d.totalGeneral.toFixed(2)}</strong></p>
</body></html>`;
      downloadBlob(html, getReportFileBaseName() + '.xls', 'application/vnd.ms-excel;charset=utf-8;');
    }
