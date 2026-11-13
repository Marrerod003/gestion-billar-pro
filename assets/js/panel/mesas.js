/* ProBillar — mesas, sesiones y temporizadores */
function setDbStatus(ok, msg) {
      const el = document.getElementById('db-status');
      if (!el) return;
      el.textContent = ok ? ('DB: ' + msg) : ('DB error: ' + msg);
      el.style.color = ok ? 'var(--accent-green)' : 'var(--accent-red)';
    }


    async function ensureCajaAbierta() {
      const abiertas = await sb('/caja?estado=eq.Abierta&select=*&order=id_caja.desc');
      if (abiertas && abiertas.length) {
        currentCajaId = abiertas[0].id_caja;
        return abiertas[0];
      }
      const created = await sb('/caja', {
        method: 'POST',
        body: JSON.stringify({ id_usuario_apertura: ID_USUARIO, monto_inicial: 100 })
      });
      currentCajaId = created[0].id_caja;
      return created[0];
    }


    async function loadFromDatabase() {
      const [mesas, tipos, productos, tarifas] = await Promise.all([
        sb('/mesas?select=*&order=numero_mesa.asc'),
        sb('/tipos_mesa?select=*&order=id_tipo_mesa.asc'),
        sb('/productos?select=*&order=id_producto.asc'),
        sb('/tarifas_historial?fecha_fin_vigencia=is.null&select=*')
      ]);

      tiposMesaMap = {};
      (tipos || []).forEach(t => { tiposMesaMap[t.id_tipo_mesa] = t; });

      const tarifaPorMesa = {};
      (tarifas || []).forEach(t => { tarifaPorMesa[t.id_mesa] = Number(t.precio_por_hora); });

      // Sesiones activas en BD
      const sesionesActivas = await sb('/sesiones_juego?estado=eq.Activa&select=*');
      const sesionPorMesa = {};
      (sesionesActivas || []).forEach(s => { sesionPorMesa[s.id_mesa] = s; });

      tables = (mesas || []).map(m => {
        const ses = sesionPorMesa[m.id_mesa];
        const rate = tarifaPorMesa[m.id_mesa] != null ? tarifaPorMesa[m.id_mesa] : 12;
        const tipo = tiposMesaMap[m.id_tipo_mesa];
        let active = m.estado === 'Ocupada' || !!ses;
        let startTime = null;
        let elapsedTime = 0;
        if (ses && ses.fecha_inicio) {
          active = true;
          startTime = new Date(ses.fecha_inicio).getTime();
        }
        return {
          id: m.id_mesa,
          numero: m.numero_mesa,
          idTipo: m.id_tipo_mesa,
          tipoNombre: tipo ? tipo.nombre : '',
          estadoDb: m.estado,
          rate: rate,
          active: active,
          startTime: startTime,
          elapsedTime: elapsedTime,
          items: [],
          idSesion: ses ? ses.id_sesion : null,
          totalSecondsToday: 0,
          totalEarningsToday: 0,
          sessionsToday: 0
        };
      });

      inventory = (productos || []).map(p => ({
        id: p.id_producto,
        name: p.nombre,
        category: p.categoria,
        price: Number(p.precio),
        stock: Number(p.stock),
        initialStock: Number(p.stock),
        soldToday: 0,
        minStock: Number(p.stock_minimo)
      }));

      // Cargar consumos de sesiones activas (visible para admin/colaborador/cliente)
      await loadConsumosForActiveSessions();

      if (tables.length && currentTableId == null) currentTableId = tables[0].id;
      if (tables.length && !tables.find(t => t.id === currentTableId)) currentTableId = tables[0].id;

      const rates = tables.map(t => t.rate);
      const rateLabel = rates.length
        ? ('Tarifas: ' + [...new Set(rates)].map(r => '$' + r.toFixed(2) + '/h').join(' · '))
        : 'Sin tarifas';
      const ri = document.getElementById('rate-info');
      if (ri) ri.innerHTML = rateLabel;

      setDbStatus(true, mesas.length + ' mesas · ' + productos.length + ' productos · caja #' + currentCajaId);
    }

    function tableSceneHTML(table) {
      if (table.active) {
        // Ocupada: palos en movimiento + bolas rodando
        return `
          <div class="play-scene" aria-hidden="true">
            <span class="playing-badge">● Jugando</span>
            <div class="hit-flash"></div>
            <div class="cue-playing left"></div>
            <div class="cue-playing right"></div>
            <div class="ball white b1"></div>
            <div class="ball red b2"></div>
            <div class="ball yellow b3"></div>
            <div class="ball blue b4"></div>
            <div class="ball orange b5"></div>
            <div class="ball purple b3" style="top:50%;left:58%;animation-delay:0.4s;"></div>
          </div>
        `;
      }
      // Libre: bastidor de palos ordenados a la izquierda
      return `
        <div class="cue-rack" aria-hidden="true" title="Palos ordenados">
          <div class="rack-board"></div>
          <div class="cue-stick"></div>
          <div class="cue-stick"></div>
          <div class="cue-stick"></div>
          <div class="cue-stick"></div>
        </div>
        <span class="free-label">Palos listos</span>
      `;
    }


    function renderMap() {
      const container = document.getElementById('map-container');
      if (!container) return;
      container.innerHTML = '';
      tables.forEach(table => {
        const selectedClass = table.id === currentTableId ? 'selected' : '';
        const activeClass = table.active ? 'active' : '';
        const statusText = table.active ? 'Ocupada' : 'Disponible';
        const statusClass = table.active ? 'status-busy' : 'status-free';
        const formattedTime = formatSeconds(getTableSeconds(table));
        const rateTag = `$${table.rate.toFixed(2)}/h`;
        const scene = tableSceneHTML(table);
        // Cliente: enfatiza el estado visual; operadores ven lo mismo + controles
        container.innerHTML += `
          <div class="pool-table ${activeClass} ${selectedClass} ${table.active ? '' : 'free-hover'}" onclick="selectPoolTable(${table.id})">
            <div class="pocket tl"></div><div class="pocket tr"></div>
            <div class="pocket bl"></div><div class="pocket br"></div>
            ${scene}
            <div class="table-name">Mesa ${table.numero}${table.tipoNombre ? ' · ' + table.tipoNombre : ''}</div>
            <div class="table-timer" id="timer-table-${table.id}">${formattedTime}</div>
            <div style="font-size:0.75rem;color:#f1c40f;margin-top:4px;position:relative;z-index:4;">${rateTag}</div>
            <div class="table-status ${statusClass}">${statusText}</div>
          </div>
        `;
      });
    }


    function selectPoolTable(id) {
      currentTableId = id;
      renderMap();
      updatePanel();
    }


    async function startTable() {
      // Administrador, Colaborador y Cliente pueden abrir mesas
      if (!canOperate() && !isCliente()) {
        alert('Tu rol (' + (currentSession && currentSession.rol) + ') no puede abrir mesas.');
        return;
      }
      const table = tables.find(t => t.id === currentTableId);
      if (!table || table.active) return;
      if (!currentCajaId) {
        alert(isCliente()
          ? 'No se puede abrir la mesa en este momento: el local aún no tiene caja abierta. Avisa al personal.'
          : 'No hay caja abierta.');
        return;
      }
      try {
        const ses = await sb('/sesiones_juego', {
          method: 'POST',
          body: JSON.stringify({
            id_mesa: table.id,
            id_cliente: ID_CLIENTE,
            id_caja: currentCajaId,
            id_usuario_apertura: ID_USUARIO
          })
        });
        await sb('/mesas?id_mesa=eq.' + table.id, {
          method: 'PATCH',
          body: JSON.stringify({ estado: 'Ocupada' })
        });
        table.active = true;
        table.startTime = ses[0].fecha_inicio ? new Date(ses[0].fecha_inicio).getTime() : Date.now();
        table.elapsedTime = 0;
        table.idSesion = ses[0].id_sesion;
        table.estadoDb = 'Ocupada';
        renderMap();
        updatePanel();
      } catch (e) {
        alert('Error al abrir mesa: ' + e.message);
      }
    }


    async function stopTable() {
      // Solo Administrador y Colaborador pueden cerrar/cobrar. El Cliente NO.
      if (!canOperate()) {
        alert('Solo el personal del local puede cerrar y cobrar una mesa. Avisa al personal cuando termines.');
        return;
      }
      const table = tables.find(t => t.id === currentTableId);
      if (!table || (!table.active && table.items.length === 0)) return;

      const seconds = getTableSeconds(table);
      const timeCost = (seconds / 3600) * table.rate;
      const productsCost = table.items.reduce((sum, item) => sum + item.price, 0);
      const totalCost = timeCost + productsCost;
      const minutos = Math.floor(seconds / 60);

      try {
        if (table.idSesion) {
          // Solo guardar consumos que aún no estén en BD (los del cliente/staff ya se guardaron al pedir)
          for (const item of table.items) {
            if (item.invId && !item.idConsumo) {
              await sb('/consumos_sesion', {
                method: 'POST',
                body: JSON.stringify({
                  id_sesion: table.idSesion,
                  id_producto: item.invId,
                  cantidad: item.cantidad || 1,
                  precio_unitario: item.price
                })
              });
            }
          }
          await sb('/sesiones_juego?id_sesion=eq.' + table.idSesion, {
            method: 'PATCH',
            body: JSON.stringify({
              fecha_fin: new Date().toISOString(),
              minutos_jugados: minutos,
              monto_tiempo: Number(timeCost.toFixed(2)),
              estado: 'Finalizada'
            })
          });
        }
        await sb('/mesas?id_mesa=eq.' + table.id, {
          method: 'PATCH',
          body: JSON.stringify({ estado: 'Disponible' })
        });

        // Snapshot de la sesión antes de limpiar (para la boleta)
        const itemsSnapshot = table.items.map(it => ({ name: it.name, price: it.price, invId: it.invId }));
        const boletaData = {
          mesaNumero: table.numero,
          tipoNombre: table.tipoNombre || '',
          idSesion: table.idSesion,
          rate: table.rate,
          seconds: seconds,
          timeCost: timeCost,
          productsCost: productsCost,
          totalCost: totalCost,
          items: itemsSnapshot,
          fecha: new Date(),
          cajero: currentSession ? (currentSession.nombre_completo || currentSession.usuario) : '—',
          // Acumulado del día de esta mesa (incluye esta sesión)
          totalSecondsToday: table.totalSecondsToday + (seconds > 0 ? seconds : 0),
          totalEarningsToday: table.totalEarningsToday + (seconds > 0 ? timeCost : 0) + productsCost,
          sessionsToday: table.sessionsToday + (seconds > 0 || itemsSnapshot.length ? 1 : 0)
        };

        if (seconds > 0) {
          table.totalSecondsToday += seconds;
          table.totalEarningsToday += timeCost;
          table.sessionsToday += 1;
          dailyTimeEarnings += timeCost;
          dailyTotalSeconds += seconds;
        }
        // Acumular productos del día en la mesa
        table.totalEarningsToday += productsCost;

        table.active = false;
        table.startTime = null;
        table.elapsedTime = 0;
        table.items = [];
        table.idSesion = null;
        table.estadoDb = 'Disponible';
        renderMap();
        updatePanel();

        // En lugar de notificación/alert → boleta de consumo del día/sesión
        showBoletaConsumo(boletaData);
      } catch (e) {
        alert('Error al cerrar mesa: ' + e.message);
      }
    }


    async function loadConsumosForActiveSessions() {
      const activeIds = tables.filter(t => t.idSesion).map(t => t.idSesion);
      if (!activeIds.length) return;
      const prodById = {};
      inventory.forEach(p => { prodById[p.id] = p; });
      try {
        // PostgREST: id_sesion=in.(1,2,3)
        const inList = '(' + activeIds.join(',') + ')';
        const consumos = await sb('/consumos_sesion?id_sesion=in.' + inList + '&select=*&order=id_consumo.asc');
        const bySesion = {};
        (consumos || []).forEach(c => {
          if (!bySesion[c.id_sesion]) bySesion[c.id_sesion] = [];
          bySesion[c.id_sesion].push(c);
        });
        tables.forEach(table => {
          if (!table.idSesion) {
            table.items = table.items || [];
            return;
          }
          const list = bySesion[table.idSesion] || [];
          table.items = list.map(c => {
            const prod = prodById[c.id_producto];
            return {
              invId: c.id_producto,
              name: prod ? prod.name : ('Producto #' + c.id_producto),
              price: Number(c.precio_unitario != null ? c.precio_unitario : (prod ? prod.price : 0)),
              idConsumo: c.id_consumo,
              cantidad: Number(c.cantidad) || 1
            };
          });
        });
      } catch (e) {
        console.error('No se pudieron cargar consumos:', e);
      }
    }

    /** Sincroniza mesas/sesiones/consumos desde BD (para que admin vea pedidos del cliente) */


    async function refreshTablesFromDb(silent) {
      try {
        const prevId = currentTableId;
        await loadFromDatabase();
        renderMap();
        if (canOperate()) {
          renderInventoryTable();
          renderQuickAddButtons();
        } else if (isCliente()) {
          renderQuickAddButtons();
        }
        if (prevId != null) currentTableId = prevId;
        if (currentTableId) {
          const still = tables.find(t => t.id === currentTableId);
          if (still) updatePanel();
          else if (tables[0]) selectPoolTable(tables[0].id);
        }
        applyRolePermissions(currentSession && currentSession.rol);
      } catch (e) {
        if (!silent) console.error(e);
      }
    }


    function updatePanel() {
      const table = tables.find(t => t.id === currentTableId);
      if (!table) return;
      document.getElementById('panel-table-title').innerText = `Mesa ${table.numero}${table.tipoNombre ? ' · ' + table.tipoNombre : ''}`;
      const statusBadge = document.getElementById('panel-table-status');
      statusBadge.innerText = table.active ? 'Ocupada' : 'Disponible';
      statusBadge.className = `table-status ${table.active ? 'status-busy' : 'status-free'}`;
      const listContainer = document.getElementById('orders-list');
      listContainer.innerHTML = '';
      if (table.items.length === 0) {
        listContainer.innerHTML = '<li style="color: var(--text-muted); font-size: 0.85rem;">Sin productos registrados</li>';
      } else {
        table.items.forEach((item, index) => {
          const removeBtn = isCliente()
            ? ''
            : `<span style="color: var(--accent-red); cursor: pointer; margin-left: 8px;" onclick="removeItem(${index})" title="Quitar">✕</span>`;
          listContainer.innerHTML += `
            <li class="order-item">
              <span>${item.name}</span>
              <span>$${item.price.toFixed(2)}
                ${removeBtn}
              </span>
            </li>`;
        });
      }
      const seconds = getTableSeconds(table);
      const timeCost = (seconds / 3600) * table.rate;
      const productsCost = table.items.reduce((sum, item) => sum + item.price, 0);
      document.getElementById('summary-time').innerText = formatSeconds(seconds);
      document.getElementById('summary-time-cost').innerText = `$${timeCost.toFixed(2)}`;
      document.getElementById('summary-products-cost').innerText = `$${productsCost.toFixed(2)}`;
      document.getElementById('summary-total').innerText = `$${(timeCost + productsCost).toFixed(2)}`;
    }


    function updateTimers() {
      tables.forEach(table => {
        if (table.active) {
          const timerEl = document.getElementById(`timer-table-${table.id}`);
          if (timerEl) timerEl.innerText = formatSeconds(getTableSeconds(table));
        }
      });
      const currentTable = tables.find(t => t.id === currentTableId);
      if (currentTable && currentTable.active) updatePanel();
    }


    function getTableSeconds(table) {
      if (!table.active) return table.elapsedTime;
      return table.elapsedTime + Math.floor((Date.now() - table.startTime) / 1000);
    }


    function formatSeconds(sec) {
      const hrs = Math.floor(sec / 3600).toString().padStart(2, '0');
      const mins = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
      const secs = (sec % 60).toString().padStart(2, '0');
      return `${hrs}:${mins}:${secs}`;
    }


    function calculateTotal(table) {
      const seconds = getTableSeconds(table);
      const timeCost = (seconds / 3600) * table.rate;
      const productsCost = table.items.reduce((sum, item) => sum + item.price, 0);
      return timeCost + productsCost;
    }
