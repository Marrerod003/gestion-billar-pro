/* ProBillar — boleta de consumo e impresión */
function buildBoletaHtml(d) {
      const fechaStr = d.fecha.toLocaleString();
      const tiempoStr = formatSeconds(d.seconds);
      const tiempoDiaStr = formatSeconds(d.totalSecondsToday || d.seconds);
      const ticketNo = 'B-' + (d.idSesion || Date.now().toString().slice(-6));

      let productosHtml = '';
      if (d.items && d.items.length) {
        const map = {};
        d.items.forEach(it => {
          const key = it.name;
          if (!map[key]) map[key] = { name: it.name, qty: 0, total: 0 };
          map[key].qty += 1;
          map[key].total += Number(it.price) || 0;
        });
        Object.values(map).forEach(p => {
          productosHtml +=
            '<div class="line"><span>' + p.qty + ' x ' + escapeHtml(p.name) + '</span><span>$' + p.total.toFixed(2) + '</span></div>';
        });
      } else {
        productosHtml = '<div class="line"><span>Sin productos</span><span>$0.00</span></div>';
      }

      return (
        '<div class="boleta-paper">' +
          '<div class="center">' +
            '<p class="biz-name">BILLAR MANAGER PRO</p>' +
            '<p class="biz-sub">Boleta de consumo de mesa</p>' +
            '<p class="ticket-no">Nro. ' + ticketNo + '</p>' +
          '</div>' +
          '<hr class="sep">' +
          '<div class="line"><span>Fecha</span><span>' + fechaStr + '</span></div>' +
          '<div class="line"><span>Mesa</span><span>#' + d.mesaNumero + (d.tipoNombre ? ' ' + escapeHtml(d.tipoNombre) : '') + '</span></div>' +
          '<div class="line"><span>Sesion</span><span>' + (d.idSesion ? '#' + d.idSesion : '-') + '</span></div>' +
          '<div class="line"><span>Cajero</span><span>' + escapeHtml(d.cajero || '-') + '</span></div>' +
          '<div class="line"><span>Tarifa</span><span>$' + Number(d.rate).toFixed(2) + '/h</span></div>' +
          '<hr class="sep">' +
          '<div class="section-title-b">Tiempo de juego</div>' +
          '<div class="line"><span>Duracion</span><span>' + tiempoStr + '</span></div>' +
          '<div class="line"><span>Importe tiempo</span><span>$' + d.timeCost.toFixed(2) + '</span></div>' +
          '<hr class="sep">' +
          '<div class="section-title-b">Productos / consumos</div>' +
          productosHtml +
          '<div class="line"><span>Subtotal productos</span><span>$' + d.productsCost.toFixed(2) + '</span></div>' +
          '<hr class="sep-double">' +
          '<div class="line total"><span>TOTAL A PAGAR</span><span>$' + d.totalCost.toFixed(2) + '</span></div>' +
          '<hr class="sep">' +
          '<div class="section-title-b">Resumen del dia - Mesa ' + d.mesaNumero + '</div>' +
          '<div class="line"><span>Sesiones hoy</span><span>' + d.sessionsToday + '</span></div>' +
          '<div class="line"><span>Tiempo hoy</span><span>' + tiempoDiaStr + '</span></div>' +
          '<div class="line"><span>Total mesa hoy</span><span>$' + Number(d.totalEarningsToday).toFixed(2) + '</span></div>' +
          '<hr class="sep">' +
          '<p class="muted">Gracias por su preferencia<br>Documento interno - No es factura fiscal<br>*** COPIA CLIENTE ***</p>' +
        '</div>'
      );
    }


    function escapeHtml(str) {
      return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }


    function showBoletaConsumo(d) {
      const body = document.getElementById('boleta-body');
      if (!body) return;
      window._lastBoletaData = d;
      body.innerHTML = buildBoletaHtml(d);
      document.getElementById('boleta-modal').style.display = 'flex';
    }

    /** Impresión realista para impresora de boletas térmicas (~80mm) */


    function printCierreCaja() {
      const modal = document.getElementById('close-box-modal');
      if (!modal) return;
      modal.classList.add('printing');
      const cleanup = () => modal.classList.remove('printing');
      window.addEventListener('afterprint', cleanup, { once: true });
      setTimeout(() => { window.print(); setTimeout(cleanup, 1000); }, 50);
    }


    function printBoleta() {
      const d = window._lastBoletaData;
      const paper = document.querySelector('#boleta-body .boleta-paper');
      if (!paper && !d) {
        alert('No hay boleta para imprimir.');
        return;
      }
      const inner = d ? buildBoletaHtml(d) : paper.outerHTML;

      const thermalCss = `
        @page { size: 80mm auto; margin: 2mm; }
        * { box-sizing: border-box; }
        html, body {
          margin: 0;
          padding: 0;
          background: #fff;
          color: #000;
          font-family: "Courier New", Courier, monospace;
          font-size: 12px;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body { width: 76mm; max-width: 76mm; margin: 0 auto; padding: 2mm; }
        .boleta-paper {
          background: #fff;
          color: #000;
          padding: 0;
          border: none;
          box-shadow: none;
          border-radius: 0;
        }
        .center { text-align: center; }
        .biz-name { font-size: 14px; font-weight: 700; letter-spacing: 0.05em; margin: 0 0 2px; }
        .biz-sub { font-size: 11px; margin: 0 0 4px; }
        .ticket-no { font-size: 11px; margin: 2px 0 0; }
        .sep { border: none; border-top: 1px dashed #000; margin: 6px 0; }
        .sep-double { border: none; border-top: 2px solid #000; margin: 6px 0; }
        .line { display: flex; justify-content: space-between; gap: 4px; font-size: 12px; line-height: 1.3; padding: 1px 0; }
        .line span:last-child { white-space: nowrap; }
        .line.total { font-weight: 700; font-size: 13px; }
        .section-title-b { font-size: 11px; font-weight: 700; text-transform: uppercase; margin: 4px 0 2px; }
        .muted { text-align: center; font-size: 10px; margin-top: 8px; line-height: 1.35; }
      `;

      const w = window.open('', '_blank', 'width=320,height=640');
      if (!w) {
        alert('Permite ventanas emergentes para imprimir la boleta.');
        return;
      }
      w.document.open();
      w.document.write(
        '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Boleta</title><style>' +
        thermalCss +
        '</style></head><body>' + inner +
        '<script>window.onload=function(){setTimeout(function(){window.focus();window.print();},200);};<\/script>' +
        '</body></html>'
      );
      w.document.close();
    }
